import type {
  ColumnMapping,
  ConflictDecision,
  ImportMode,
  ImportPreviewSummary,
  ModuleImportSchema,
  ParsedSheet,
  ProposedAction,
  RowValidationStatus,
  SchemaField,
  ValidatedImportRow,
} from "./types";
import { EXCEL_LIMITS } from "./types";

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchField(header: string, fields: SchemaField[]): SchemaField | null {
  const n = normalizeHeader(header);
  for (const field of fields) {
    const candidates = [field.header, field.key, ...(field.aliases ?? [])];
    if (candidates.some((c) => normalizeHeader(c) === n)) {
      return field;
    }
  }
  return null;
}

/** Auto-map exact / obvious headers. Leaves ambiguous blanks. */
export function buildAutoMappings(
  excelHeaders: string[],
  schema: ModuleImportSchema
): ColumnMapping[] {
  const used = new Set<string>();
  return excelHeaders.map((excelHeader) => {
    const field = matchField(excelHeader, schema.fields);
    if (!field || used.has(field.key)) {
      return { excelHeader, fieldKey: null };
    }
    used.add(field.key);
    return { excelHeader, fieldKey: field.key };
  });
}

export function mappingComplete(
  mappings: ColumnMapping[],
  schema: ModuleImportSchema
): { ok: boolean; missingRequired: string[] } {
  const mapped = new Set(
    mappings.map((m) => m.fieldKey).filter((k): k is string => Boolean(k))
  );
  const missingRequired = schema.fields
    .filter((f) => f.required && !mapped.has(f.key))
    .map((f) => f.header);
  return { ok: missingRequired.length === 0, missingRequired };
}

function normalizeEnum(
  value: string,
  enumValues: readonly string[]
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const exact = enumValues.find((v) => v === trimmed);
  if (exact) return exact;
  const ci = enumValues.find(
    (v) => v.toLowerCase() === trimmed.toLowerCase()
  );
  if (ci) return ci;
  // Known aliases for risk levels
  const aliases: Record<string, string> = {
    med: "Medium",
    moderate: "Medium",
    crit: "Critical",
    severe: "Critical",
  };
  const alias = aliases[trimmed.toLowerCase()];
  if (alias && enumValues.includes(alias)) return alias;
  return null;
}

function normalizeDate(value: string): { ok: true; value: string } | { ok: false } {
  const t = value.trim();
  if (!t) return { ok: true, value: "" };
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return { ok: true, value: t };
  // DD/MM/YYYY or MM/DD/YYYY — accept ISO-like after Date parse when unambiguous
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) {
    return { ok: true, value: new Date(parsed).toISOString().slice(0, 10) };
  }
  return { ok: false };
}

function applyMapping(
  row: Record<string, string>,
  mappings: ColumnMapping[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const map of mappings) {
    if (!map.fieldKey) continue;
    out[map.fieldKey] = (row[map.excelHeader] ?? "").trim();
  }
  return out;
}

export function validateImportRows(
  sheet: ParsedSheet,
  mappings: ColumnMapping[],
  schema: ModuleImportSchema,
  existingIds: Set<string>,
  importMode: ImportMode
): { rows: ValidatedImportRow[]; summary: ImportPreviewSummary } {
  const fileIdCounts = new Map<string, number>();
  const mappedRows = sheet.rows.map((row, index) => {
    const values = applyMapping(row, mappings);
    const uniqueId = values[schema.uniqueKey] ?? "";
    if (uniqueId) {
      fileIdCounts.set(uniqueId, (fileIdCounts.get(uniqueId) ?? 0) + 1);
    }
    return {
      rowNumber: sheet.rowNumbers[index] ?? index + 2,
      values,
      formulaWarning: row.__formulaWarning === "true",
    };
  });

  const rows: ValidatedImportRow[] = mappedRows.map((entry) => {
    const messages: string[] = [];
    let status: RowValidationStatus = "valid";
    const values = { ...entry.values };

    if (entry.formulaWarning) {
      messages.push(
        "Row contained formula cells without cached values; plain values are required."
      );
      status = "error";
    }

    for (const field of schema.fields) {
      let raw = values[field.key] ?? "";
      if (raw.length > (field.maxLength ?? EXCEL_LIMITS.maxCellLength)) {
        messages.push(`${field.header} exceeds maximum length.`);
        status = "error";
        continue;
      }

      if (field.type === "enum" && field.enumValues && raw) {
        const normalized = normalizeEnum(raw, field.enumValues);
        if (normalized === null) {
          messages.push(
            `${field.header} has invalid value "${raw}". Allowed: ${field.enumValues.join(", ")}.`
          );
          status = "error";
        } else {
          values[field.key] = normalized;
          raw = normalized;
        }
      }

      if (field.type === "date" && raw) {
        const dateResult = normalizeDate(raw);
        if (!dateResult.ok) {
          messages.push(`${field.header} has an invalid date format.`);
          status = "error";
        } else {
          values[field.key] = dateResult.value;
        }
      }

      if (field.type === "number" && raw) {
        if (Number.isNaN(Number(raw))) {
          messages.push(`${field.header} must be a number.`);
          status = "error";
        }
      }

      if (field.required && !raw) {
        messages.push(`${field.header} is required.`);
        status = "error";
      }
    }

    const uniqueId = values[schema.uniqueKey] ?? "";
    const recordName = values[schema.displayNameKey] || uniqueId || "(unnamed)";

    if (!uniqueId && status !== "error") {
      messages.push(`${schema.fields.find((f) => f.key === schema.uniqueKey)?.header ?? "ID"} is required.`);
      status = "error";
    }

    if (uniqueId && (fileIdCounts.get(uniqueId) ?? 0) > 1) {
      messages.push("Duplicate identifier inside the uploaded file.");
      if (status !== "error") status = "duplicate-file";
    }

    const exists = uniqueId ? existingIds.has(uniqueId) : false;
    if (exists && status === "valid") {
      status = "duplicate-existing";
      messages.push("Identifier already exists in GRCx.");
    }

    let proposedAction: ProposedAction = "Reject";
    if (status === "error" || status === "duplicate-file") {
      proposedAction = "Reject";
    } else if (importMode === "append") {
      proposedAction = exists ? "Skip" : "Add";
    } else if (importMode === "update") {
      proposedAction = exists ? "Update" : "Skip";
    } else if (importMode === "append-update") {
      proposedAction = exists ? "Update" : "Add";
    } else if (importMode === "skip-duplicates") {
      proposedAction = exists ? "Skip" : "Add";
    }

    if (
      (proposedAction === "Update" || proposedAction === "Add") &&
      status === "duplicate-existing" &&
      (importMode === "update" || importMode === "append-update")
    ) {
      status = "warning";
    }

    if (proposedAction === "Skip" && status === "duplicate-existing") {
      // skip is intentional
    }

    return {
      rowNumber: entry.rowNumber,
      uniqueId,
      recordName,
      status:
        proposedAction === "Reject" && status === "valid" ? "error" : status,
      messages,
      proposedAction,
      values,
    };
  });

  // Mark empty entirely skipped already during parse

  const summary: ImportPreviewSummary = {
    totalRows: rows.length,
    validRows: rows.filter((r) => r.status === "valid").length,
    duplicateRows: rows.filter(
      (r) =>
        r.status === "duplicate-file" || r.status === "duplicate-existing"
    ).length,
    warningRows: rows.filter((r) => r.status === "warning").length,
    errorRows: rows.filter((r) => r.status === "error").length,
    eligibleRows: rows.filter(
      (r) => r.proposedAction === "Add" || r.proposedAction === "Update"
    ).length,
  };

  return { rows, summary };
}

export function attachConflicts(
  rows: ValidatedImportRow[],
  schema: ModuleImportSchema,
  existingById: Map<string, Record<string, string>>,
  decisions: ConflictDecision[]
): ValidatedImportRow[] {
  const decisionMap = new Map(
    decisions.map((d) => [`${d.rowUniqueId}::${d.fieldKey}`, d.choice])
  );

  return rows.map((row) => {
    if (row.proposedAction !== "Update") return row;
    const current = existingById.get(row.uniqueId);
    if (!current) return row;

    const conflicts: NonNullable<ValidatedImportRow["conflicts"]> = [];
    for (const field of schema.fields) {
      if (field.key === schema.uniqueKey) continue;
      const imported = row.values[field.key] ?? "";
      if (!imported) continue; // absent fields are not cleared
      const curr = current[field.key] ?? "";
      if (curr && imported && curr !== imported) {
        const choice = decisionMap.get(`${row.uniqueId}::${field.key}`);
        conflicts.push({
          fieldKey: field.key,
          fieldLabel: field.header,
          current: curr,
          imported,
        });
        if (choice === "keep") {
          row = {
            ...row,
            values: { ...row.values, [field.key]: curr },
          };
        }
      }
    }

    if (conflicts.length === 0) return row;
    return {
      ...row,
      conflicts,
      proposedAction: "Conflict" as ProposedAction,
      status: "warning" as RowValidationStatus,
      messages: [
        ...row.messages,
        `${conflicts.length} field conflict(s) require confirmation.`,
      ],
    };
  });
}

export function resolveConflictActions(
  rows: ValidatedImportRow[],
  decisions: ConflictDecision[]
): ValidatedImportRow[] {
  const decisionMap = new Map(
    decisions.map((d) => [`${d.rowUniqueId}::${d.fieldKey}`, d.choice])
  );

  return rows.map((row) => {
    if (!row.conflicts?.length) {
      if (row.proposedAction === "Conflict") {
        return { ...row, proposedAction: "Update" };
      }
      return row;
    }

    const unresolved = row.conflicts.filter(
      (c) => !decisionMap.has(`${row.uniqueId}::${c.fieldKey}`)
    );

    let values = { ...row.values };
    for (const c of row.conflicts) {
      const choice = decisionMap.get(`${row.uniqueId}::${c.fieldKey}`);
      if (choice === "keep") {
        values = { ...values, [c.fieldKey]: c.current };
      } else if (choice === "imported") {
        values = { ...values, [c.fieldKey]: c.imported };
      }
    }

    if (unresolved.length > 0) {
      return {
        ...row,
        values,
        proposedAction: "Conflict",
        status: "warning",
      };
    }

    return {
      ...row,
      values,
      proposedAction: "Update",
      status: "warning",
      messages: row.messages.filter((m) => !m.includes("field conflict")),
    };
  });
}

export function summarizeApplyPlan(rows: ValidatedImportRow[]): {
  toAdd: number;
  toUpdate: number;
  toSkip: number;
  toReject: number;
} {
  return {
    toAdd: rows.filter((r) => r.proposedAction === "Add").length,
    toUpdate: rows.filter((r) => r.proposedAction === "Update").length,
    toSkip: rows.filter((r) => r.proposedAction === "Skip").length,
    toReject: rows.filter((r) => r.proposedAction === "Reject").length,
  };
}

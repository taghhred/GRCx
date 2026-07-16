import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { WorkBook } from "xlsx";
import Button from "../common/Button";
import {
  buildAutoMappings,
  mappingComplete,
  resolveConflictActions,
  summarizeApplyPlan,
  validateImportRows,
} from "../../services/excel/excelImportService";
import {
  downloadExcelTemplate,
  downloadValidationErrorFile,
} from "../../services/excel/excelTemplateService";
import {
  ExcelReadError,
  parseWorksheet,
  readWorkbookFile,
} from "../../services/excel/excelWorkbookReader";
import { PROTOTYPE_ACTING_USER } from "../../services/excel/importAuditService";
import type {
  ColumnMapping,
  ConflictChoice,
  ConflictDecision,
  ImportApplyResult,
  ImportMode,
  ModuleImportSchema,
  ParsedSheet,
  ParsedWorkbookMeta,
  ValidatedImportRow,
} from "../../services/excel/types";
import { EXCEL_ACCEPT } from "../../services/excelExportService";
import styles from "./ExcelImportWizard.module.css";

type Step =
  | "file"
  | "mapping"
  | "mode"
  | "preview"
  | "conflicts"
  | "confirm"
  | "summary";

const STEP_LABELS: Array<{ id: Step; label: string }> = [
  { id: "file", label: "1. File" },
  { id: "mapping", label: "2. Mapping" },
  { id: "mode", label: "3. Mode" },
  { id: "preview", label: "4. Validation" },
  { id: "conflicts", label: "5. Conflicts" },
  { id: "confirm", label: "6. Confirm" },
  { id: "summary", label: "7. Summary" },
];

type PreviewFilter = "all" | "valid" | "duplicates" | "warnings" | "errors";

export interface ExcelImportWizardProps {
  open: boolean;
  schema: ModuleImportSchema;
  existingRecords: Array<Record<string, string>>;
  onClose: () => void;
  onApply: (payload: {
    mode: ImportMode;
    rows: ValidatedImportRow[];
    filename: string;
    sheetName: string;
  }) => ImportApplyResult;
  onViewImported?: (affectedIds: string[]) => void;
}

export default function ExcelImportWizard({
  open,
  schema,
  existingRecords,
  onClose,
  onApply,
  onViewImported,
}: ExcelImportWizardProps) {
  const titleId = useId();
  const liveId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("file");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [meta, setMeta] = useState<ParsedWorkbookMeta | null>(null);
  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("append-update");
  const [validated, setValidated] = useState<ValidatedImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>("all");
  const [decisions, setDecisions] = useState<ConflictDecision[]>([]);
  const [result, setResult] = useState<ImportApplyResult | null>(null);
  const [dirty, setDirty] = useState(false);

  const existingIds = useMemo(
    () => new Set(existingRecords.map((r) => r[schema.uniqueKey]).filter(Boolean)),
    [existingRecords, schema.uniqueKey]
  );

  const existingById = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    existingRecords.forEach((r) => {
      const id = r[schema.uniqueKey];
      if (id) map.set(id, r);
    });
    return map;
  }, [existingRecords, schema.uniqueKey]);

  const resetAll = () => {
    setStep("file");
    setBusy(false);
    setError(null);
    setLiveMessage("");
    setMeta(null);
    setWorkbook(null);
    setSheetName("");
    setParsed(null);
    setMappings([]);
    setImportMode("append-update");
    setValidated([]);
    setPreviewFilter("all");
    setDecisions([]);
    setResult(null);
    setDirty(false);
  };

  const requestClose = () => {
    if (step !== "summary" && dirty) {
      const ok = window.confirm(
        "Abort this import? Unsaved import progress will be lost."
      );
      if (!ok) return;
    }
    resetAll();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      requestClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestClose uses latest state via refs pattern below
  }, [open, dirty, step]);

  const rowsWithConflictsResolved = useMemo(() => {
    return resolveConflictActions(validated, decisions);
  }, [validated, decisions]);

  const conflictRows = useMemo(() => {
    return validated
      .filter(
        (row) => row.proposedAction === "Update" || row.status === "warning"
      )
      .map((row) => {
        const current = existingById.get(row.uniqueId);
        if (!current) return null;
        const conflicts: NonNullable<ValidatedImportRow["conflicts"]> = [];
        for (const field of schema.fields) {
          if (field.key === schema.uniqueKey) continue;
          const imported = row.values[field.key] ?? "";
          if (!imported) continue;
          const curr = current[field.key] ?? "";
          if (curr && imported && curr !== imported) {
            conflicts.push({
              fieldKey: field.key,
              fieldLabel: field.header,
              current: curr,
              imported,
            });
          }
        }
        if (!conflicts.length) return null;
        return { ...row, conflicts };
      })
      .filter(
        (
          r
        ): r is ValidatedImportRow & {
          conflicts: NonNullable<ValidatedImportRow["conflicts"]>;
        } => Boolean(r)
      );
  }, [validated, existingById, schema]);

  const filteredPreview = useMemo(
    () =>
      validated.filter((row) => {
        if (previewFilter === "all") return true;
        if (previewFilter === "valid") return row.status === "valid";
        if (previewFilter === "duplicates")
          return (
            row.status === "duplicate-file" ||
            row.status === "duplicate-existing"
          );
        if (previewFilter === "warnings") return row.status === "warning";
        return row.status === "error";
      }),
    [validated, previewFilter]
  );

  const plan = useMemo(
    () => summarizeApplyPlan(rowsWithConflictsResolved),
    [rowsWithConflictsResolved]
  );
  const mappingStatus = useMemo(
    () => mappingComplete(mappings, schema),
    [mappings, schema]
  );

  if (!open || typeof document === "undefined") return null;

  const selectSheet = (book: WorkBook, name: string) => {
    try {
      const sheet = parseWorksheet(book, name);
      setSheetName(name);
      setParsed(sheet);
      setMappings(buildAutoMappings(sheet.headers, schema));
      setError(null);
      setDirty(true);
    } catch (err) {
      setError(
        err instanceof ExcelReadError
          ? err.message
          : "Unable to parse the selected worksheet."
      );
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setLiveMessage("Reading workbook…");
    try {
      const { meta: fileMeta, workbook: book } = await readWorkbookFile(file);
      setMeta(fileMeta);
      setWorkbook(book);
      const first = book.SheetNames[0];
      selectSheet(book, first);
      setLiveMessage(`Loaded ${fileMeta.filename}`);
      setDirty(true);
    } catch (err) {
      setMeta(null);
      setWorkbook(null);
      setParsed(null);
      setError(
        err instanceof ExcelReadError
          ? err.message
          : "Unable to process this file."
      );
      setLiveMessage("Workbook read failed.");
    } finally {
      setBusy(false);
    }
  };

  const runValidation = () => {
    if (!parsed) return;
    const { rows } = validateImportRows(
      parsed,
      mappings,
      schema,
      existingIds,
      importMode
    );
    setValidated(rows);
    setDecisions([]);
    setLiveMessage(
      `Validated ${rows.length} rows. ${rows.filter((r) => r.proposedAction === "Add" || r.proposedAction === "Update").length} eligible.`
    );
  };

  const setDecision = (
    rowUniqueId: string,
    fieldKey: string,
    choice: ConflictChoice
  ) => {
    setDecisions((prev) => {
      const rest = prev.filter(
        (d) => !(d.rowUniqueId === rowUniqueId && d.fieldKey === fieldKey)
      );
      return [...rest, { rowUniqueId, fieldKey, choice }];
    });
  };

  const applySameToSimilar = (fieldKey: string, choice: ConflictChoice) => {
    const next: ConflictDecision[] = [];
    conflictRows.forEach((row) => {
      row.conflicts?.forEach((c) => {
        if (c.fieldKey === fieldKey) {
          next.push({ rowUniqueId: row.uniqueId, fieldKey, choice });
        }
      });
    });
    setDecisions((prev) => {
      const filtered = prev.filter((d) => d.fieldKey !== fieldKey);
      return [...filtered, ...next];
    });
  };

  const conflictsResolved =
    conflictRows.length === 0 ||
    conflictRows.every((row) =>
      row.conflicts.every((c) =>
        decisions.some(
          (d) => d.rowUniqueId === row.uniqueId && d.fieldKey === c.fieldKey
        )
      )
    );

  const confirmImport = () => {
    setBusy(true);
    setLiveMessage("Applying import…");
    try {
      const eligible = rowsWithConflictsResolved.filter(
        (r) => r.proposedAction === "Add" || r.proposedAction === "Update"
      );
      const applyResult = onApply({
        mode: importMode,
        rows: eligible,
        filename: meta?.filename ?? "workbook.xlsx",
        sheetName,
      });
      // recount skipped/failed from full validated set
      const skipped = validated.filter((r) => r.proposedAction === "Skip").length;
      const failed = validated.filter((r) => r.proposedAction === "Reject").length;
      setResult({
        ...applyResult,
        skipped,
        failed,
        importedBy: PROTOTYPE_ACTING_USER,
      });
      setStep("summary");
      setLiveMessage("Import completed successfully.");
      setDirty(false);
    } catch {
      setError("Import could not be applied. No changes were saved permanently.");
      setLiveMessage("Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = STEP_LABELS.findIndex((s) => s.id === step);

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={requestClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId}>Import & Merge Excel — {schema.moduleLabel}</h2>
            <p className={styles.subtitle}>
              Append or update records by unique identifier. Existing data is never
              replaced wholesale.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close import dialog"
            onClick={requestClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className={styles.steps} aria-label="Import steps">
          {STEP_LABELS.map((item, index) => (
            <span
              key={item.id}
              className={[
                styles.stepChip,
                item.id === step ? styles.stepChipActive : "",
                index < stepIndex ? styles.stepChipDone : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.label}
            </span>
          ))}
        </div>

        <div className={styles.body}>
          <p className={styles.securityNote}>
            Imported files are processed locally in this prototype. Server-side
            validation, authorization, malware scanning, and permanent storage
            will be enforced after backend integration. Session data does not
            survive a page refresh.
          </p>
          <div id={liveId} className={styles.live} aria-live="polite">
            {liveMessage}
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}

          {step === "file" ? (
            <>
              <div className={styles.row}>
                <input
                  ref={inputRef}
                  type="file"
                  accept={EXCEL_ACCEPT}
                  className={styles.live}
                  onChange={(event) => {
                    void handleFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                >
                  Choose Excel file
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => downloadExcelTemplate(schema)}
                >
                  Download Excel Template
                </Button>
              </div>
              {meta ? (
                <dl className={styles.metaGrid}>
                  <div>
                    <dt>Filename</dt>
                    <dd>{meta.filename}</dd>
                  </div>
                  <div>
                    <dt>File size</dt>
                    <dd>{meta.sizeLabel}</dd>
                  </div>
                  <div>
                    <dt>Last modified</dt>
                    <dd>{meta.lastModifiedLabel}</dd>
                  </div>
                  <div>
                    <dt>Worksheets</dt>
                    <dd>{meta.sheetNames.join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Selected worksheet</dt>
                    <dd>{sheetName || "—"}</dd>
                  </div>
                  <div>
                    <dt>Detected data rows</dt>
                    <dd>{parsed?.rows.length ?? 0}</dd>
                  </div>
                </dl>
              ) : (
                <p className={styles.subtitle}>
                  Select an .xlsx or .xls workbook to continue. Local file paths
                  are never displayed.
                </p>
              )}
              {meta && workbook ? (
                <label className={styles.label}>
                  Worksheet
                  <select
                    value={sheetName}
                    onChange={(event) =>
                      selectSheet(workbook, event.target.value)
                    }
                  >
                    {meta.sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}

          {step === "mapping" && parsed ? (
            <>
              {!mappingStatus.ok ? (
                <p className={styles.error}>
                  Map required fields before continuing:{" "}
                  {mappingStatus.missingRequired.join(", ")}
                </p>
              ) : null}
              <div className={styles.tableWrap}>
                <table className={styles.mappingTable}>
                  <thead>
                    <tr>
                      <th scope="col">Excel Column</th>
                      <th scope="col">GRCx Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((map, index) => (
                      <tr key={map.excelHeader}>
                        <td>{map.excelHeader}</td>
                        <td>
                          <select
                            aria-label={`Map ${map.excelHeader}`}
                            value={map.fieldKey ?? ""}
                            onChange={(event) => {
                              const value = event.target.value || null;
                              setMappings((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, fieldKey: value }
                                    : item.fieldKey === value
                                      ? { ...item, fieldKey: null }
                                      : item
                                )
                              );
                            }}
                          >
                            <option value="">— Not mapped —</option>
                            {schema.fields.map((field) => (
                              <option key={field.key} value={field.key}>
                                {field.header}
                                {field.required ? " *" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {step === "mode" ? (
            <div className={styles.modeList} role="radiogroup" aria-label="Import mode">
              {(
                [
                  [
                    "append",
                    "Append New Records",
                    "Add only identifiers that do not already exist. Existing rows stay unchanged.",
                  ],
                  [
                    "update",
                    "Update Existing Records",
                    "Update matching identifiers. Absent fields are not cleared.",
                  ],
                  [
                    "append-update",
                    "Append and Update",
                    "Add new identifiers and update matches.",
                  ],
                  [
                    "skip-duplicates",
                    "Skip Duplicates",
                    "Import only new unique identifiers; ignore existing IDs.",
                  ],
                ] as const
              ).map(([id, title, help]) => (
                <label key={id} className={styles.modeOption}>
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === id}
                    onChange={() => setImportMode(id)}
                  />
                  <span>
                    <strong>{title}</strong>
                    <span>{help}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {step === "preview" ? (
            <>
              <div className={styles.summaryGrid}>
                {(
                  [
                    ["Total Rows", validated.length],
                    [
                      "Valid Rows",
                      validated.filter((r) => r.status === "valid").length,
                    ],
                    [
                      "Duplicate Rows",
                      validated.filter(
                        (r) =>
                          r.status === "duplicate-file" ||
                          r.status === "duplicate-existing"
                      ).length,
                    ],
                    [
                      "Warnings",
                      validated.filter((r) => r.status === "warning").length,
                    ],
                    [
                      "Errors",
                      validated.filter((r) => r.status === "error").length,
                    ],
                    [
                      "Eligible",
                      validated.filter(
                        (r) =>
                          r.proposedAction === "Add" ||
                          r.proposedAction === "Update"
                      ).length,
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className={styles.summaryCard}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.filters}>
                {(
                  [
                    ["all", "All"],
                    ["valid", "Valid"],
                    ["duplicates", "Duplicates"],
                    ["warnings", "Warnings"],
                    ["errors", "Errors"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.filterBtn} ${previewFilter === id ? styles.filterBtnActive : ""}`}
                    onClick={() => setPreviewFilter(id)}
                  >
                    {label}
                  </button>
                ))}
                <Button
                  variant="ghost"
                  onClick={() =>
                    downloadValidationErrorFile(schema.moduleLabel, validated)
                  }
                >
                  Download Error File
                </Button>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Unique ID</th>
                      <th>Record</th>
                      <th>Status</th>
                      <th>Message</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreview.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No rows in this filter.</td>
                      </tr>
                    ) : (
                      filteredPreview.map((row) => (
                        <tr key={`${row.rowNumber}-${row.uniqueId}`}>
                          <td>{row.rowNumber}</td>
                          <td>{row.uniqueId || "—"}</td>
                          <td>{row.recordName}</td>
                          <td
                            className={
                              row.status === "error"
                                ? styles.statusError
                                : row.status === "warning" ||
                                    row.status.startsWith("duplicate")
                                  ? styles.statusWarn
                                  : styles.statusValid
                            }
                          >
                            {row.status}
                          </td>
                          <td>{row.messages.join(" ") || "—"}</td>
                          <td>{row.proposedAction}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {step === "conflicts" ? (
            conflictRows.length === 0 ? (
              <p>No field conflicts require confirmation.</p>
            ) : (
              conflictRows.map((row) => (
                <div key={row.uniqueId} className={styles.conflictCard}>
                  <strong>
                    {row.uniqueId} — {row.recordName}
                  </strong>
                  {row.conflicts.map((c) => {
                    const chosen = decisions.find(
                      (d) =>
                        d.rowUniqueId === row.uniqueId &&
                        d.fieldKey === c.fieldKey
                    )?.choice;
                    return (
                      <div key={c.fieldKey}>
                        <p>
                          <strong>{c.fieldLabel}</strong>
                        </p>
                        <p>
                          Current: {c.current}
                          <br />
                          Imported: {c.imported}
                        </p>
                        <div className={styles.conflictActions}>
                          <Button
                            variant={chosen === "keep" ? "primary" : "secondary"}
                            onClick={() =>
                              setDecision(row.uniqueId, c.fieldKey, "keep")
                            }
                          >
                            Keep Existing
                          </Button>
                          <Button
                            variant={
                              chosen === "imported" ? "primary" : "secondary"
                            }
                            onClick={() =>
                              setDecision(row.uniqueId, c.fieldKey, "imported")
                            }
                          >
                            Use Imported
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              applySameToSimilar(c.fieldKey, "imported")
                            }
                          >
                            Apply imported to similar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )
          ) : null}

          {step === "confirm" ? (
            <dl className={styles.metaGrid}>
              <div>
                <dt>Records to Add</dt>
                <dd>{plan.toAdd}</dd>
              </div>
              <div>
                <dt>Records to Update</dt>
                <dd>{plan.toUpdate}</dd>
              </div>
              <div>
                <dt>Records to Skip</dt>
                <dd>{plan.toSkip}</dd>
              </div>
              <div>
                <dt>Records to Reject</dt>
                <dd>{plan.toReject}</dd>
              </div>
              <div>
                <dt>Import Mode</dt>
                <dd>{importMode}</dd>
              </div>
              <div>
                <dt>Worksheet</dt>
                <dd>{sheetName}</dd>
              </div>
            </dl>
          ) : null}

          {step === "summary" && result ? (
            <>
              <p>
                <strong>Import completed successfully.</strong>
              </p>
              <div className={styles.summaryGrid}>
                {(
                  [
                    ["Added", result.added],
                    ["Updated", result.updated],
                    ["Skipped", result.skipped],
                    ["Failed", result.failed],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className={styles.summaryCard}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <dl className={styles.metaGrid}>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{result.timestamp}</dd>
                </div>
                <div>
                  <dt>Imported by</dt>
                  <dd>{result.importedBy}</dd>
                </div>
                <div>
                  <dt>Filename</dt>
                  <dd>{result.filename}</dd>
                </div>
                <div>
                  <dt>Module</dt>
                  <dd>{result.moduleLabel}</dd>
                </div>
                <div>
                  <dt>Import mode</dt>
                  <dd>{result.importMode}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <Button variant="ghost" onClick={requestClose}>
            {step === "summary" ? "Close" : "Cancel"}
          </Button>
          <div className={styles.footerRight}>
            {step !== "file" && step !== "summary" ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  const order: Step[] = [
                    "file",
                    "mapping",
                    "mode",
                    "preview",
                    "conflicts",
                    "confirm",
                    "summary",
                  ];
                  const idx = order.indexOf(step);
                  setStep(order[Math.max(0, idx - 1)]);
                }}
              >
                Back
              </Button>
            ) : null}

            {step === "file" ? (
              <Button
                variant="primary"
                disabled={busy || !parsed || parsed.rows.length === 0}
                onClick={() => setStep("mapping")}
              >
                Continue
              </Button>
            ) : null}

            {step === "mapping" ? (
              <Button
                variant="primary"
                disabled={!mappingStatus.ok}
                onClick={() => setStep("mode")}
              >
                Continue
              </Button>
            ) : null}

            {step === "mode" ? (
              <Button
                variant="primary"
                onClick={() => {
                  runValidation();
                  setStep("preview");
                }}
              >
                Validate rows
              </Button>
            ) : null}

            {step === "preview" ? (
              <Button
                variant="primary"
                onClick={() =>
                  setStep(conflictRows.length > 0 ? "conflicts" : "confirm")
                }
              >
                Continue
              </Button>
            ) : null}

            {step === "conflicts" ? (
              <Button
                variant="primary"
                disabled={!conflictsResolved}
                onClick={() => setStep("confirm")}
              >
                Continue
              </Button>
            ) : null}

            {step === "confirm" ? (
              <Button
                variant="primary"
                disabled={busy || plan.toAdd + plan.toUpdate === 0}
                onClick={confirmImport}
              >
                Confirm Import
              </Button>
            ) : null}

            {step === "summary" && result ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadValidationErrorFile(schema.moduleLabel, validated)
                  }
                >
                  Download Error File
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    onViewImported?.(result.affectedIds);
                    resetAll();
                    onClose();
                  }}
                >
                  View Imported Records
                </Button>
              </>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

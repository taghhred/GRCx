import * as XLSX from "xlsx";
import type { RiskRegisterItem } from "../../mocks/types/riskRegister";
import { SEED_EXCEL_PATHS } from "../../mocks/types/riskRegister";

const HEADER_MAP: Record<string, string> = {
  "risk id": "riskId",
  "risk title": "title",
  "risk category": "category",
  "affected asset": "affectedAsset",
  "business unit": "businessUnit",
  department: "department",
  vendor: "vendor",
  "risk owner": "owner",
  owner: "owner",
  "risk scenario / description": "description",
  description: "description",
  "inherent likelihood": "inherentLikelihood",
  "inherent impact": "inherentImpact",
  "inherent risk score": "inherentScore",
  "inherent risk level": "inherentLevel",
  "treatment strategy": "treatment",
  treatment: "treatment",
  "planned risk controls": "plannedControls",
  "applicable framework": "framework",
  framework: "framework",
  "framework control reference": "frameworkControlRef",
  "residual likelihood": "residualLikelihood",
  "residual impact": "residualImpact",
  "residual risk score": "residualScore",
  "residual risk level": "residualLevel",
  "risk workflow status": "status",
  status: "status",
  "date identified": "dateIdentified",
  "next review date": "nextReviewDate",
  "evidence id": "evidenceCode",
  "additional notes": "notes",
  notes: "notes",
};

function cellStr(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function cellNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function excelDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${m}-${d}`;
    }
  }
  const text = String(value).trim();
  return text.slice(0, 10);
}

function findHeaderRow(rows: unknown[][]): {
  index: number;
  map: Record<string, number>;
} | null {
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const map: Record<string, number> = {};
    rows[i].forEach((cell, col) => {
      const key = HEADER_MAP[cellStr(cell).toLowerCase()];
      if (key) map[key] = col;
    });
    if (map.riskId != null && map.title != null) {
      return { index: i, map };
    }
  }
  return null;
}

function vendorFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("ibm")) return "IBM";
  if (lower.includes("microsoft")) return "Microsoft";
  if (lower.includes("splunk")) return "Splunk";
  return "";
}

export function parseRiskRegisterWorkbook(
  data: ArrayBuffer,
  sourceFilename: string
): { rows: RiskRegisterItem[]; errors: string[] } {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.includes("Risk Register")
    ? "Risk Register"
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
    sheet,
    { header: 1, defval: null }
  ) as unknown[][];

  const found = findHeaderRow(matrix);
  if (!found) {
    return { rows: [], errors: [`${sourceFilename}: Risk Register header not found`] };
  }

  const { index, map } = found;
  const rows: RiskRegisterItem[] = [];
  const errors: string[] = [];
  const vendor = vendorFromFilename(sourceFilename);
  const now = new Date().toISOString();

  for (let r = index + 1; r < matrix.length; r += 1) {
    const row = matrix[r];
    const get = (key: string) => {
      const col = map[key];
      return col == null ? null : row[col];
    };
    const riskId = cellStr(get("riskId"));
    const title = cellStr(get("title"));
    if (!riskId && !title) continue;
    if (!riskId) {
      errors.push(`${sourceFilename} row ${r + 1}: missing Risk ID`);
      continue;
    }
    if (!title) {
      errors.push(`${sourceFilename} row ${r + 1}: missing title for ${riskId}`);
      continue;
    }

    const businessUnit = cellStr(get("businessUnit"));
    const department = cellStr(get("department")) || businessUnit;
    const inherentLikelihood = cellNum(get("inherentLikelihood"));
    const inherentImpact = cellNum(get("inherentImpact"));
    let inherentScore = cellNum(get("inherentScore"));
    if (
      inherentScore == null &&
      inherentLikelihood != null &&
      inherentImpact != null
    ) {
      inherentScore = inherentLikelihood * inherentImpact;
    }
    const residualLikelihood = cellNum(get("residualLikelihood"));
    const residualImpact = cellNum(get("residualImpact"));
    let residualScore = cellNum(get("residualScore"));
    if (
      residualScore == null &&
      residualLikelihood != null &&
      residualImpact != null
    ) {
      residualScore = residualLikelihood * residualImpact;
    }

    const evidenceCode = cellStr(get("evidenceCode"));
    rows.push({
      id: riskId,
      riskId,
      title,
      category: cellStr(get("category")) || "General",
      affectedAsset: cellStr(get("affectedAsset")),
      businessUnit,
      department,
      vendor: cellStr(get("vendor")) || vendor,
      owner: cellStr(get("owner")) || "Unassigned",
      description: cellStr(get("description")),
      inherentLikelihood,
      inherentImpact,
      inherentScore,
      inherentLevel: cellStr(get("inherentLevel")) || "Medium",
      treatment: cellStr(get("treatment")) || "Mitigate",
      plannedControls: cellStr(get("plannedControls")),
      framework: cellStr(get("framework")),
      frameworkControlRef: cellStr(get("frameworkControlRef")),
      residualLikelihood,
      residualImpact,
      residualScore,
      residualLevel: cellStr(get("residualLevel")) || "Medium",
      status: cellStr(get("status")) || "Open",
      dateIdentified: excelDate(get("dateIdentified")),
      nextReviewDate: excelDate(get("nextReviewDate")),
      notes: cellStr(get("notes")),
      sourceFilename,
      sourceFileId: null,
      lastUpdated: now.slice(0, 10),
      createdAt: excelDate(get("dateIdentified")) || now.slice(0, 10),
      evidence: evidenceCode
        ? [
            {
              id: evidenceCode,
              evidenceCode,
              filename: `${evidenceCode}.ref`,
              fileType: "reference",
              uploadedBy: "Excel Import",
              uploadedAt: now,
              description: "Linked evidence ID from Excel metadata",
            },
          ]
        : [],
      history: [
        {
          id: `h-${riskId}-1`,
          actor: "Excel Import",
          action: "Imported",
          detail: `Imported from ${sourceFilename}`,
          createdAt: now,
        },
      ],
    });
  }

  return { rows, errors };
}

export async function loadSeedExcelFiles(): Promise<{
  rows: RiskRegisterItem[];
  errors: string[];
  files: string[];
}> {
  const merged = new Map<string, RiskRegisterItem>();
  const errors: string[] = [];
  const files: string[] = [];

  for (const path of SEED_EXCEL_PATHS) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        errors.push(`Unable to load ${path}`);
        continue;
      }
      const buffer = await response.arrayBuffer();
      const name = path.split("/").pop() || path;
      files.push(name);
      const parsed = parseRiskRegisterWorkbook(buffer, name);
      errors.push(...parsed.errors);
      for (const row of parsed.rows) {
        if (!merged.has(row.riskId)) {
          merged.set(row.riskId, row);
        }
      }
    } catch {
      errors.push(`Failed to parse ${path}`);
    }
  }

  return { rows: Array.from(merged.values()), errors, files };
}

export function computeRiskStats(rows: RiskRegisterItem[]) {
  const levelOf = (r: RiskRegisterItem) =>
    (r.residualLevel || r.inherentLevel || "Medium").toString();
  const byLevel: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byVendor: Record<string, number> = {};
  const byFramework: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const r of rows) {
    const level = levelOf(r);
    byLevel[level] = (byLevel[level] || 0) + 1;
    const dept = r.department || "Unspecified";
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    const vendor = r.vendor || "Unspecified";
    byVendor[vendor] = (byVendor[vendor] || 0) + 1;
    const fw = r.framework || "Unspecified";
    byFramework[fw] = (byFramework[fw] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  return {
    total: rows.length,
    critical: byLevel.Critical || 0,
    high: byLevel.High || 0,
    medium: byLevel.Medium || 0,
    low: byLevel.Low || 0,
    byDepartment,
    byVendor,
    byFramework,
    byStatus,
    byLevel,
  };
}

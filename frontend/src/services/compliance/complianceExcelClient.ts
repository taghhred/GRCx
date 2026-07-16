// @ts-nocheck
import * as XLSX from "xlsx";
import type {
  ComplianceAssessmentItem,
  ComplianceEvidenceItem,
  ComplianceFindingItem,
  ComplianceFrameworkSummary,
  ComplianceRegisterItem,
  ComplianceStats,
} from "../../mocks/types/complianceManagement";
import {
  COMPLIANCE_FRAMEWORK_CATALOG,
  COMPLIANCE_SEED_PATHS,
} from "../../mocks/types/complianceManagement";

const REGISTER_HEADER_MAP: Record<string, string> = {
  "compliance id": "complianceId",
  framework: "framework",
  "control id": "controlId",
  "control name": "controlName",
  "business unit": "businessUnit",
  department: "department",
  "control owner": "owner",
  owner: "owner",
  status: "status",
  "compliance score %": "complianceScore",
  "compliance score": "complianceScore",
  "risk level": "riskLevel",
  "finding severity": "findingSeverity",
  "evidence required": "evidenceRequired",
  "evidence status": "evidenceStatus",
  "last assessment": "lastAssessment",
  "next review": "nextReview",
  auditor: "auditor",
  priority: "priority",
  "due date": "dueDate",
  notes: "notes",
  "assessment status": "assessmentStatus",
};

const ASSESSMENT_HEADER_MAP: Record<string, string> = {
  "assessment id": "assessmentId",
  "compliance id": "complianceId",
  framework: "framework",
  "control id": "controlId",
  "assessment date": "assessmentDate",
  assessor: "assessor",
  department: "department",
  "assessment result": "result",
  result: "result",
  "compliance %": "compliancePercent",
  "compliance percent": "compliancePercent",
  "gap identified": "gap",
  gap: "gap",
  recommendation: "recommendation",
  "target completion": "targetCompletion",
  "approval status": "approvalStatus",
  "approved by": "approvedBy",
  comments: "comments",
};

const EVIDENCE_HEADER_MAP: Record<string, string> = {
  "evidence id": "evidenceId",
  "compliance id": "complianceId",
  "control id": "controlId",
  "evidence type": "evidenceType",
  "evidence name": "evidenceName",
  "uploaded by": "uploadedBy",
  "upload date": "uploadDate",
  "review status": "reviewStatus",
  reviewer: "reviewer",
  "file name": "fileName",
  filename: "fileName",
  version: "version",
  "expiry date": "expiryDate",
  "related framework": "framework",
  framework: "framework",
  department: "department",
  comments: "comments",
  owner: "owner",
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
  return String(value).trim().slice(0, 10);
}

function findHeaderRow(
  rows: unknown[][],
  headerMap: Record<string, string>,
  requiredKeys: string[]
): { index: number; map: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const map: Record<string, number> = {};
    rows[i].forEach((cell, col) => {
      const key = headerMap[cellStr(cell).toLowerCase()];
      if (key) map[key] = col;
    });
    if (requiredKeys.every((k) => map[k] != null)) {
      return { index: i, map };
    }
  }
  return null;
}

function sheetMatrix(data: ArrayBuffer, preferredName: string): {
  matrix: unknown[][];
  sheetName: string;
} {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.includes(preferredName)
    ? preferredName
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];
  return { matrix, sheetName };
}

export function parseComplianceRegisterWorkbook(
  data: ArrayBuffer,
  sourceFilename: string
): { rows: ComplianceRegisterItem[]; errors: string[] } {
  const { matrix } = sheetMatrix(data, "Compliance Register");
  const found = findHeaderRow(matrix, REGISTER_HEADER_MAP, ["complianceId", "controlId"]);
  if (!found) {
    return { rows: [], errors: [`${sourceFilename}: Compliance Register header not found`] };
  }

  const { index, map } = found;
  const rows: ComplianceRegisterItem[] = [];
  const errors: string[] = [];

  for (let r = index + 1; r < matrix.length; r += 1) {
    const row = matrix[r];
    const get = (key: string) => {
      const col = map[key];
      return col == null ? null : row[col];
    };
    const complianceId = cellStr(get("complianceId"));
    if (!complianceId) {
      if (cellStr(get("controlId")) || cellStr(get("controlName"))) {
        errors.push(`${sourceFilename} row ${r + 1}: missing Compliance ID`);
      }
      continue;
    }

    const status = cellStr(get("status")) || "Under Review";
    rows.push({
      id: complianceId,
      complianceId,
      framework: cellStr(get("framework")),
      controlId: cellStr(get("controlId")),
      controlName: cellStr(get("controlName")),
      businessUnit: cellStr(get("businessUnit")),
      department: cellStr(get("department")),
      owner: cellStr(get("owner")) || "Unassigned",
      status,
      complianceScore: cellNum(get("complianceScore")),
      riskLevel: cellStr(get("riskLevel")) || "Medium",
      findingSeverity: cellStr(get("findingSeverity")),
      evidenceRequired: cellStr(get("evidenceRequired")),
      evidenceStatus: cellStr(get("evidenceStatus")),
      lastAssessment: excelDate(get("lastAssessment")),
      nextReview: excelDate(get("nextReview")),
      auditor: cellStr(get("auditor")),
      priority: cellStr(get("priority")),
      dueDate: excelDate(get("dueDate")),
      notes: cellStr(get("notes")),
      assessmentStatus: cellStr(get("assessmentStatus")) || status,
      sourceFilename,
    });
  }

  return { rows, errors };
}

export function parseComplianceAssessmentWorkbook(
  data: ArrayBuffer,
  sourceFilename: string
): { rows: ComplianceAssessmentItem[]; errors: string[] } {
  const { matrix } = sheetMatrix(data, "Compliance Assessment");
  const found = findHeaderRow(matrix, ASSESSMENT_HEADER_MAP, ["assessmentId"]);
  if (!found) {
    return { rows: [], errors: [`${sourceFilename}: Compliance Assessment header not found`] };
  }

  const { index, map } = found;
  const rows: ComplianceAssessmentItem[] = [];
  const errors: string[] = [];

  for (let r = index + 1; r < matrix.length; r += 1) {
    const row = matrix[r];
    const get = (key: string) => {
      const col = map[key];
      return col == null ? null : row[col];
    };
    const assessmentId = cellStr(get("assessmentId"));
    if (!assessmentId) {
      if (cellStr(get("complianceId")) || cellStr(get("controlId"))) {
        errors.push(`${sourceFilename} row ${r + 1}: missing Assessment ID`);
      }
      continue;
    }

    rows.push({
      id: assessmentId,
      assessmentId,
      complianceId: cellStr(get("complianceId")),
      framework: cellStr(get("framework")),
      controlId: cellStr(get("controlId")),
      assessmentDate: excelDate(get("assessmentDate")),
      assessor: cellStr(get("assessor")),
      department: cellStr(get("department")),
      result: cellStr(get("result")),
      compliancePercent: cellNum(get("compliancePercent")),
      gap: cellStr(get("gap")),
      recommendation: cellStr(get("recommendation")),
      targetCompletion: excelDate(get("targetCompletion")),
      approvalStatus: cellStr(get("approvalStatus")),
      approvedBy: cellStr(get("approvedBy")),
      comments: cellStr(get("comments")),
      sourceFilename,
    });
  }

  return { rows, errors };
}

export function parseComplianceEvidenceWorkbook(
  data: ArrayBuffer,
  sourceFilename: string
): { rows: ComplianceEvidenceItem[]; errors: string[] } {
  const { matrix } = sheetMatrix(data, "Compliance Evidence");
  const found = findHeaderRow(matrix, EVIDENCE_HEADER_MAP, ["evidenceId"]);
  if (!found) {
    return { rows: [], errors: [`${sourceFilename}: Compliance Evidence header not found`] };
  }

  const { index, map } = found;
  const rows: ComplianceEvidenceItem[] = [];
  const errors: string[] = [];

  for (let r = index + 1; r < matrix.length; r += 1) {
    const row = matrix[r];
    const get = (key: string) => {
      const col = map[key];
      return col == null ? null : row[col];
    };
    const evidenceId = cellStr(get("evidenceId"));
    if (!evidenceId) {
      if (cellStr(get("evidenceName")) || cellStr(get("controlId"))) {
        errors.push(`${sourceFilename} row ${r + 1}: missing Evidence ID`);
      }
      continue;
    }

    const uploadedBy = cellStr(get("uploadedBy"));
    rows.push({
      id: evidenceId,
      evidenceId,
      complianceId: cellStr(get("complianceId")),
      controlId: cellStr(get("controlId")),
      evidenceType: cellStr(get("evidenceType")),
      evidenceName: cellStr(get("evidenceName")),
      uploadedBy,
      uploadDate: excelDate(get("uploadDate")),
      reviewStatus: cellStr(get("reviewStatus")),
      reviewer: cellStr(get("reviewer")),
      fileName: cellStr(get("fileName")),
      version: cellStr(get("version")),
      expiryDate: excelDate(get("expiryDate")),
      framework: cellStr(get("framework")),
      department: cellStr(get("department")),
      comments: cellStr(get("comments")),
      owner: cellStr(get("owner")) || uploadedBy || "Unassigned",
      sourceFilename,
    });
  }

  return { rows, errors };
}

export type ComplianceUploadKind = "register" | "assessment" | "evidence" | "unknown";

export function classifyComplianceFilename(filename: string): ComplianceUploadKind {
  const lower = filename.toLowerCase();
  if (lower.includes("register")) return "register";
  if (lower.includes("assessment")) return "assessment";
  if (lower.includes("evidence")) return "evidence";
  return "unknown";
}

export function parseComplianceUpload(
  buffer: ArrayBuffer,
  filename: string
): {
  kind: ComplianceUploadKind;
  register: ComplianceRegisterItem[];
  assessments: ComplianceAssessmentItem[];
  evidence: ComplianceEvidenceItem[];
  errors: string[];
} {
  const kind = classifyComplianceFilename(filename);
  if (kind === "register") {
    const parsed = parseComplianceRegisterWorkbook(buffer, filename);
    return {
      kind,
      register: parsed.rows,
      assessments: [],
      evidence: [],
      errors: parsed.errors,
    };
  }
  if (kind === "assessment") {
    const parsed = parseComplianceAssessmentWorkbook(buffer, filename);
    return {
      kind,
      register: [],
      assessments: parsed.rows,
      evidence: [],
      errors: parsed.errors,
    };
  }
  if (kind === "evidence") {
    const parsed = parseComplianceEvidenceWorkbook(buffer, filename);
    return {
      kind,
      register: [],
      assessments: [],
      evidence: parsed.rows,
      errors: parsed.errors,
    };
  }

  const asRegister = parseComplianceRegisterWorkbook(buffer, filename);
  if (asRegister.rows.length > 0) {
    return {
      kind: "register",
      register: asRegister.rows,
      assessments: [],
      evidence: [],
      errors: asRegister.errors,
    };
  }
  const asAssessment = parseComplianceAssessmentWorkbook(buffer, filename);
  if (asAssessment.rows.length > 0) {
    return {
      kind: "assessment",
      register: [],
      assessments: asAssessment.rows,
      evidence: [],
      errors: asAssessment.errors,
    };
  }
  const asEvidence = parseComplianceEvidenceWorkbook(buffer, filename);
  if (asEvidence.rows.length > 0) {
    return {
      kind: "evidence",
      register: [],
      assessments: [],
      evidence: asEvidence.rows,
      errors: asEvidence.errors,
    };
  }

  return {
    kind: "unknown",
    register: [],
    assessments: [],
    evidence: [],
    errors: [
      ...asRegister.errors,
      ...asAssessment.errors,
      ...asEvidence.errors,
      `${filename}: unable to classify workbook type`,
    ],
  };
}

export async function loadComplianceSeedFiles(): Promise<{
  register: ComplianceRegisterItem[];
  assessments: ComplianceAssessmentItem[];
  evidence: ComplianceEvidenceItem[];
  errors: string[];
  files: string[];
}> {
  const registerMap = new Map<string, ComplianceRegisterItem>();
  const assessmentMap = new Map<string, ComplianceAssessmentItem>();
  const evidenceMap = new Map<string, ComplianceEvidenceItem>();
  const errors: string[] = [];
  const files: string[] = [];

  for (const path of COMPLIANCE_SEED_PATHS) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        errors.push(`Unable to load ${path}`);
        continue;
      }
      const buffer = await response.arrayBuffer();
      const name = path.split("/").pop() || path;
      files.push(name);
      const parsed = parseComplianceUpload(buffer, name);
      errors.push(...parsed.errors);
      for (const row of parsed.register) {
        if (!registerMap.has(row.complianceId)) registerMap.set(row.complianceId, row);
      }
      for (const row of parsed.assessments) {
        if (!assessmentMap.has(row.assessmentId)) assessmentMap.set(row.assessmentId, row);
      }
      for (const row of parsed.evidence) {
        if (!evidenceMap.has(row.evidenceId)) evidenceMap.set(row.evidenceId, row);
      }
    } catch {
      errors.push(`Failed to parse ${path}`);
    }
  }

  return {
    register: Array.from(registerMap.values()),
    assessments: Array.from(assessmentMap.values()),
    evidence: Array.from(evidenceMap.values()),
    errors,
    files,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFailedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes("non-compliant") ||
    s === "failed" ||
    s.includes("partially compliant")
  );
}

function isPassedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "compliant" || s === "passed" || s === "pass";
}

export function deriveFindings(
  register: ComplianceRegisterItem[],
  assessments: ComplianceAssessmentItem[]
): ComplianceFindingItem[] {
  const findings: ComplianceFindingItem[] = [];

  for (const item of register) {
    if (!isFailedStatus(item.status) && !item.findingSeverity) continue;
    if (isPassedStatus(item.status) && !item.findingSeverity) continue;
    if (isPassedStatus(item.status)) continue;

    findings.push({
      id: `FND-REG-${item.complianceId}`,
      findingId: `FND-REG-${item.complianceId}`,
      complianceId: item.complianceId,
      controlId: item.controlId,
      controlName: item.controlName,
      framework: item.framework,
      description: item.notes || `${item.controlName || item.controlId} is ${item.status}`,
      severity: item.findingSeverity || item.riskLevel || "Medium",
      asset: item.businessUnit || item.controlName,
      department: item.department,
      owner: item.owner,
      recommendation: item.evidenceRequired
        ? `Provide evidence: ${item.evidenceRequired}`
        : "Remediate control gap and re-assess",
      targetDate: item.dueDate || item.nextReview,
      status: item.status,
      evidenceStatus: item.evidenceStatus,
      riskLink: item.riskLevel,
      source: "register",
    });
  }

  for (const item of assessments) {
    const result = item.result.toLowerCase();
    const hasGap = Boolean(item.gap && item.gap.trim());
    if (!hasGap && !(result.includes("fail") || result.includes("partial") || result.includes("non"))) {
      continue;
    }
    findings.push({
      id: `FND-ASM-${item.assessmentId}`,
      findingId: `FND-ASM-${item.assessmentId}`,
      complianceId: item.complianceId,
      controlId: item.controlId,
      controlName: item.controlId,
      framework: item.framework,
      description: item.gap || `Assessment result: ${item.result}`,
      severity: result.includes("fail") ? "High" : "Medium",
      asset: item.department || item.framework,
      department: item.department,
      owner: item.assessor,
      recommendation: item.recommendation,
      targetDate: item.targetCompletion,
      status: item.approvalStatus || item.result,
      evidenceStatus: "",
      riskLink: "",
      source: "assessment",
    });
  }

  return findings;
}

export function buildFrameworkSummaries(
  register: ComplianceRegisterItem[],
  assessments: ComplianceAssessmentItem[],
  evidence: ComplianceEvidenceItem[],
  findings: ComplianceFindingItem[]
): ComplianceFrameworkSummary[] {
  const names = new Set<string>([
    ...COMPLIANCE_FRAMEWORK_CATALOG,
    ...register.map((r) => r.framework),
    ...assessments.map((a) => a.framework),
    ...evidence.map((e) => e.framework),
  ]);

  return [...names]
    .filter((name) => Boolean(name && name.trim()))
    .sort()
    .map((name) => {
      const reg = register.filter((r) => r.framework === name);
      const asm = assessments.filter((a) => a.framework === name);
      const evd = evidence.filter((e) => e.framework === name);
      const fnd = findings.filter((f) => f.framework === name);

      const scores = [
        ...reg.map((r) => r.complianceScore).filter((n): n is number => n != null),
        ...asm.map((a) => a.compliancePercent).filter((n): n is number => n != null),
      ];
      const compliancePercent =
        scores.length > 0
          ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
          : reg.length === 0
            ? 0
            : Math.round(
                (reg.filter((r) => isPassedStatus(r.status)).length / reg.length) * 100
              );

      const deptMap: Record<string, number> = {};
      for (const r of reg) {
        const d = r.department || "Unspecified";
        deptMap[d] = (deptMap[d] || 0) + 1;
      }
      for (const a of asm) {
        const d = a.department || "Unspecified";
        deptMap[d] = (deptMap[d] || 0) + 1;
      }

      return {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        compliancePercent,
        mappedControls: reg.length || new Set(asm.map((a) => a.controlId)).size,
        passedControls: reg.filter((r) => isPassedStatus(r.status)).length,
        failedControls: reg.filter((r) => isFailedStatus(r.status)).length,
        evidenceCount: evd.length,
        findingsCount: fnd.length,
        departmentCoverage: Object.entries(deptMap)
          .map(([deptName, count]) => ({ name: deptName, count }))
          .sort((a, b) => b.count - a.count),
      };
    });
}

export function computeComplianceStats(
  register: ComplianceRegisterItem[],
  assessments: ComplianceAssessmentItem[],
  evidence: ComplianceEvidenceItem[],
  findings: ComplianceFindingItem[]
): ComplianceStats {
  const byFramework: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byBusinessUnit: Record<string, number> = {};
  const byRiskLevel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const r of register) {
    const fw = r.framework || "Unspecified";
    byFramework[fw] = (byFramework[fw] || 0) + 1;
    const dept = r.department || "Unspecified";
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    const bu = r.businessUnit || "Unspecified";
    byBusinessUnit[bu] = (byBusinessUnit[bu] || 0) + 1;
    const level = r.riskLevel || "Medium";
    byRiskLevel[level] = (byRiskLevel[level] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }

  const scores = register
    .map((r) => r.complianceScore)
    .filter((n): n is number => n != null);
  const overallCompliancePercent =
    scores.length > 0
      ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      : register.length === 0
        ? 0
        : Math.round(
            (register.filter((r) => isPassedStatus(r.status)).length / register.length) * 100
          );

  const today = todayIso();
  const overdueReviews = register.filter(
    (r) => r.nextReview && r.nextReview < today && !isPassedStatus(r.status)
  ).length;

  const controlsNeedingEvidence = register.filter((r) =>
    Boolean(r.evidenceRequired && r.evidenceRequired.trim())
  ).length;
  const evidenceCoveragePercent =
    controlsNeedingEvidence === 0
      ? evidence.length > 0
        ? 100
        : 0
      : Math.min(
          100,
          Math.round((evidence.length / controlsNeedingEvidence) * 100)
        );

  void assessments;

  return {
    overallCompliancePercent,
    passedControls: register.filter((r) => isPassedStatus(r.status)).length,
    failedControls: register.filter((r) => isFailedStatus(r.status)).length,
    openFindings: findings.length,
    overdueReviews,
    evidenceCoveragePercent,
    byFramework,
    byDepartment,
    byBusinessUnit,
    byRiskLevel,
    byStatus,
  };
}


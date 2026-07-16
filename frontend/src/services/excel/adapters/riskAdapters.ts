import type {
  RiskCase,
  RiskCaseStatus,
  RiskLevel,
} from "../../../mocks/types/risk";

function riskScore(level: RiskLevel): number {
  if (level === "Critical") return 20;
  if (level === "High") return 12;
  if (level === "Medium") return 6;
  return 2;
}

function defaultAssessment(
  inherentRisk: RiskLevel,
  residualRisk: RiskLevel
): RiskCase["assessment"] {
  return {
    likelihood: 3,
    impact: 3,
    inherentScore: riskScore(inherentRisk),
    inherentLevel: inherentRisk,
    controlEffectivenessPercent: 0,
    residualLikelihood: 2,
    residualImpact: 2,
    residualScore: riskScore(residualRisk),
    residualLevel: residualRisk,
    treatmentDecision: "Mitigate",
    acceptanceStatus: "Not Accepted",
    methodologyNote:
      "Imported via Excel merge (session prototype). Assessment pending analyst review.",
  };
}

export function riskToFlat(row: RiskCase): Record<string, string> {
  return {
    caseId: row.caseId,
    title: row.title,
    category: row.category,
    affectedAsset: row.affectedAsset,
    department: row.department,
    owner: row.owner,
    source: row.source,
    status: row.status,
    inherentRisk: row.inherentRisk,
    residualRisk: row.residualRisk,
    createdDate: row.createdDate,
    lastUpdated: row.lastUpdated,
    dueDate: row.dueDate,
    description: row.description,
  };
}

export function riskBuildNew(values: Record<string, string>): RiskCase {
  const caseId = values.caseId;
  const inherentRisk = (values.inherentRisk as RiskLevel) || "Medium";
  const residualRisk = (values.residualRisk as RiskLevel) || inherentRisk;
  return {
    id: caseId,
    caseId,
    title: values.title || "Imported risk case",
    category: values.category || "General",
    affectedAsset: values.affectedAsset || "",
    department: values.department || "",
    owner: values.owner || "Unassigned",
    source: values.source || "Excel Import",
    status: (values.status as RiskCaseStatus) || "Open",
    inherentRisk,
    residualRisk,
    createdDate: values.createdDate || new Date().toISOString().slice(0, 10),
    lastUpdated: values.lastUpdated || new Date().toISOString().slice(0, 10),
    dueDate: values.dueDate || "",
    description: values.description || "",
    relatedViolation: "—",
    relatedIncident: "—",
    relatedGrcCase: "—",
    businessImpact: "",
    threatScenario: "",
    vulnerability: "",
    assessment: defaultAssessment(inherentRisk, residualRisk),
    evidence: [],
    controls: [],
    remediation: [],
    activityLog: [
      {
        id: `ACT-IMP-${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        actor: "Excel Import",
        action: "Case imported",
        details: "Created from Excel merge (session prototype).",
      },
    ],
  };
}

export function riskMerge(
  existing: RiskCase,
  values: Record<string, string>
): RiskCase {
  return {
    ...existing,
    title: values.title || existing.title,
    category: values.category || existing.category,
    affectedAsset: values.affectedAsset || existing.affectedAsset,
    department: values.department || existing.department,
    owner: values.owner || existing.owner,
    source: values.source || existing.source,
    status: (values.status as RiskCaseStatus) || existing.status,
    inherentRisk: (values.inherentRisk as RiskLevel) || existing.inherentRisk,
    residualRisk: (values.residualRisk as RiskLevel) || existing.residualRisk,
    createdDate: values.createdDate || existing.createdDate,
    lastUpdated: values.lastUpdated || existing.lastUpdated,
    dueDate: values.dueDate || existing.dueDate,
    description: values.description || existing.description,
  };
}

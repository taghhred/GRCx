/**
 * Risk Register domain model for the redesigned Risk Assessment module.
 * Records are loaded dynamically from Excel imports (API or client parse).
 */

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface RiskEvidenceItem {
  id: string;
  evidenceCode?: string | null;
  filename: string;
  fileType?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string;
  description?: string | null;
}

export interface RiskHistoryItem {
  id: string;
  actor?: string | null;
  action: string;
  detail?: string | null;
  createdAt: string;
}

export interface RiskRegisterItem {
  id: string;
  riskId: string;
  title: string;
  category: string;
  affectedAsset: string;
  businessUnit: string;
  department: string;
  vendor: string;
  owner: string;
  description: string;
  inherentLikelihood: number | null;
  inherentImpact: number | null;
  inherentScore: number | null;
  inherentLevel: string;
  treatment: string;
  plannedControls: string;
  framework: string;
  frameworkControlRef: string;
  residualLikelihood: number | null;
  residualImpact: number | null;
  residualScore: number | null;
  residualLevel: string;
  status: string;
  dateIdentified: string;
  nextReviewDate: string;
  notes: string;
  sourceFilename: string;
  sourceFileId: string | null;
  lastUpdated: string;
  createdAt: string;
  evidence: RiskEvidenceItem[];
  history: RiskHistoryItem[];
}

export interface RiskImportSummary {
  filename: string;
  imported: number;
  updated: number;
  skipped_duplicates: number;
  errors: number;
  error_messages: string[];
  file_id?: string | null;
}

export interface RiskStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byDepartment: Record<string, number>;
  byVendor: Record<string, number>;
  byFramework: Record<string, number>;
  byStatus: Record<string, number>;
  byLevel: Record<string, number>;
}

export const RISK_LEVELS: Array<"Critical" | "High" | "Medium" | "Low"> = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

export const RISK_STATUSES: string[] = [
  "Open",
  "In Progress",
  "Under Assessment",
  "Remediation in Progress",
  "Pending Approval",
  "Pending Evidence",
  "Accepted",
  "Closed",
  "Archived",
];

export const RISK_TREATMENTS: string[] = [
  "Mitigate",
  "Accept",
  "Transfer",
  "Avoid",
  "Monitor",
];

export const SEED_EXCEL_PATHS = [
  "/data/RiskAssessment/IBM_Synthetic_Risk_Assessment_Standardized.xlsx",
  "/data/RiskAssessment/Microsoft_Synthetic_Risk_Assessment_Standardized.xlsx",
  "/data/RiskAssessment/Splunk_Synthetic_Risk_Assessment_Standardized.xlsx",
] as const;

/** Compliance Management domain types — permissive for Excel/UI compatibility. */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ComplianceRegisterItem = {
  id: string;
  complianceId: string;
  framework: string;
  controlId: string;
  controlName: string;
  businessUnit?: string;
  department: string;
  owner: string;
  status: string;
  complianceScore: number | null;
  riskLevel: string;
  findingSeverity?: string;
  evidenceRequired: string;
  evidenceStatus: string;
  lastAssessment: string;
  nextReview: string;
  auditor: string;
  priority: string;
  dueDate: string;
  notes: string;
  assessmentStatus: string;
  sourceFilename?: string;
  [key: string]: any;
};

export type ComplianceAssessmentItem = {
  id: string;
  assessmentId: string;
  complianceId: string;
  framework: string;
  controlId: string;
  assessmentDate: string;
  assessor: string;
  department: string;
  result: string;
  compliancePercent: number | null;
  gap: string;
  recommendation: string;
  targetCompletion: string;
  approvalStatus: string;
  approvedBy: string;
  comments: string;
  sourceFilename?: string;
  [key: string]: any;
};

export type ComplianceEvidenceItem = {
  id: string;
  evidenceId: string;
  complianceId: string;
  controlId: string;
  evidenceType: string;
  evidenceName: string;
  uploadedBy: string;
  uploadDate: string;
  reviewStatus: string;
  reviewer: string;
  fileName: string;
  version: string;
  expiryDate: string;
  framework: string;
  department: string;
  comments: string;
  owner: string;
  sourceFilename?: string;
  [key: string]: any;
};

export type ComplianceFindingItem = {
  id: string;
  findingId: string;
  complianceId: string;
  controlId: string;
  controlName: string;
  framework: string;
  description: string;
  severity: string;
  asset: string;
  department: string;
  owner: string;
  recommendation: string;
  targetDate: string;
  status: string;
  evidenceStatus: string;
  riskLink: string;
  source: string;
  [key: string]: any;
};

export type ComplianceFrameworkSummary = {
  id: string;
  name: string;
  compliancePercent: number;
  mappedControls: number;
  passedControls: number;
  failedControls: number;
  evidenceCount: number;
  findingsCount: number;
  departmentCoverage: Array<{ name: string; count: number }>;
  [key: string]: any;
};

export type ComplianceStats = {
  overallCompliancePercent: number;
  passedControls: number;
  failedControls: number;
  openFindings: number;
  overdueReviews: number;
  evidenceCoveragePercent: number;
  byFramework: Record<string, number>;
  byDepartment: Record<string, number>;
  byBusinessUnit: Record<string, number>;
  byRiskLevel: Record<string, number>;
  byStatus: Record<string, number>;
  [key: string]: any;
};

export type ComplianceImportSummary = {
  filename: string;
  kind?: string;
  imported: number;
  updated: number;
  skipped?: number;
  skipped_duplicates?: number;
  errors: number;
  errorMessages?: string[];
  error_messages?: string[];
  [key: string]: any;
};

export const COMPLIANCE_FRAMEWORK_CATALOG: string[] = [
  "NCA ECC",
  "ISO 27001",
  "SAMA CSF",
  "PCI DSS",
  "NIST CSF",
];

export const COMPLIANCE_STATUSES = [
  "Compliant",
  "Partially Compliant",
  "Non-Compliant",
  "Under Review",
  "Not Assessed",
] as const;

export const COMPLIANCE_RISK_LEVELS = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

export const COMPLIANCE_SEED_PATHS = [
  "/data/compliance/register.xlsx",
  "/data/compliance/assessments.xlsx",
  "/data/compliance/evidence.xlsx",
] as const;

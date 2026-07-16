export type RiskCaseStatus =
  | "Open"
  | "Under Assessment"
  | "Remediation in Progress"
  | "Accepted"
  | "Closed"
  | "Archived";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type RiskTreatmentDecision =
  | "Mitigate"
  | "Accept"
  | "Transfer"
  | "Avoid"
  | "Monitor";

export type ControlImplementationStatus =
  | "Not Started"
  | "In Progress"
  | "Implemented"
  | "Partially Implemented"
  | "Not Applicable";

export type EvidenceVerificationStatus =
  | "Pending"
  | "Verified"
  | "Rejected"
  | "Expired";

export type RemediationTaskStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Blocked"
  | "Deferred";

export interface RiskScoreScale {
  likelihood: number;
  impact: number;
  score: number;
  level: RiskLevel;
}

export interface RiskAssessment {
  likelihood: number;
  impact: number;
  inherentScore: number;
  inherentLevel: RiskLevel;
  controlEffectivenessPercent: number;
  residualLikelihood: number;
  residualImpact: number;
  residualScore: number;
  residualLevel: RiskLevel;
  treatmentDecision: RiskTreatmentDecision;
  acceptanceStatus: "Not Accepted" | "Pending Approval" | "Accepted" | "Rejected";
  methodologyNote: string;
}

export interface RiskEvidence {
  id: string;
  name: string;
  type: string;
  relatedControl: string;
  uploadedBy: string;
  uploadDate: string;
  verificationStatus: EvidenceVerificationStatus;
}

export interface RiskControl {
  id: string;
  framework: string;
  name: string;
  implementationStatus: ControlImplementationStatus;
  effectiveness: string;
  owner: string;
  lastTested: string;
  result: "Pass" | "Fail" | "Partial" | "Not Tested";
}

export interface RiskRemediationTask {
  id: string;
  action: string;
  owner: string;
  dueDate: string;
  status: RemediationTaskStatus;
  priority: RiskLevel;
}

export interface RiskActivityEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface RiskCase {
  id: string;
  caseId: string;
  title: string;
  category: string;
  affectedAsset: string;
  department: string;
  owner: string;
  source: string;
  status: RiskCaseStatus;
  inherentRisk: RiskLevel;
  residualRisk: RiskLevel;
  createdDate: string;
  lastUpdated: string;
  dueDate: string;
  description: string;
  relatedViolation: string;
  relatedIncident: string;
  relatedGrcCase: string;
  businessImpact: string;
  threatScenario: string;
  vulnerability: string;
  assessment: RiskAssessment;
  evidence: RiskEvidence[];
  controls: RiskControl[];
  remediation: RiskRemediationTask[];
  activityLog: RiskActivityEntry[];
}

export interface RiskManagementData {
  cases: RiskCase[];
  categories: string[];
  departments: string[];
  owners: string[];
  statuses: RiskCaseStatus[];
  levels: RiskLevel[];
}

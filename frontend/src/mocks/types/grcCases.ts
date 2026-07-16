/**
 * SOAR-ingested GRC Cases — ServiceNow / Purview style case queue.
 * Source is always SOAR; GRCx owns governance review & closure.
 */

export type SoarGrcCaseStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Pending Evidence"
  | "Pending Approval"
  | "Resolved"
  | "Closed"
  | "Rejected"
  | "Archived";

export type SoarGrcSeverity = "Low" | "Medium" | "High" | "Critical";

export type SoarSpecialization =
  | "Identity"
  | "Compliance"
  | "BCM"
  | "Risk"
  | "DR"
  | "General";

export type CaseSlaState = "On Track" | "At Risk" | "Breached";

export type CaseEvidenceType =
  | "Log"
  | "Screenshot"
  | "File"
  | "Link"
  | "Hash"
  | "Timeline";

export type RemediationTaskStatus =
  | "Open"
  | "In Progress"
  | "Blocked"
  | "Completed";

export const SOAR_CASE_STATUSES: SoarGrcCaseStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Pending Evidence",
  "Pending Approval",
  "Resolved",
  "Closed",
  "Rejected",
  "Archived",
];

export const OPEN_CASE_STATUSES: SoarGrcCaseStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Pending Evidence",
  "Pending Approval",
  "Resolved",
];

export const CLOSED_CASE_STATUSES: SoarGrcCaseStatus[] = [
  "Closed",
  "Rejected",
];

export interface CaseEvidenceItem {
  id: string;
  type: CaseEvidenceType;
  name: string;
  detail: string;
  addedAt: string;
  hash?: string;
  url?: string;
}

export interface CaseRiskAssessment {
  likelihood: string;
  impact: string;
  riskScore: number;
  residualRisk: string;
  riskOwner: string;
}

export interface CaseComplianceMapping {
  framework: string;
  controlNumber: string;
  controlDescription: string;
  complianceStatus: string;
  gapExplanation: string;
}

export interface CaseRemediationTask {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: RemediationTaskStatus;
  comments: string;
  completed: boolean;
}

export interface CaseActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

/** Canonical SOAR → GRCx case record. */
export interface SoarGrcCase {
  caseId: string;
  title: string;
  source: "SOAR";
  severity: SoarGrcSeverity;
  status: SoarGrcCaseStatus;
  control: string;
  framework: string;
  affectedAsset: string;
  department: string;
  /** Active assignee (may equal owner). */
  assignedTo: string;
  /** Original / primary case owner — never changes on share. */
  owner: string;
  collaborators: string[];
  createdAt: string;
  updatedAt: string;
  slaState: CaseSlaState;
  slaDueAt: string;
  specialization: SoarSpecialization;
  description: string;
  violationSummary: string;
  detectionTime: string;
  evidence: CaseEvidenceItem[];
  risk: CaseRiskAssessment;
  compliance: CaseComplianceMapping;
  remediationTasks: CaseRemediationTask[];
  internalNotes: string[];
  activityLog: CaseActivityEntry[];
  archived: boolean;
}

/** @deprecated Prefer SoarGrcCase — flat Excel / legacy alias shape */
export type GrcCaseStatus = SoarGrcCaseStatus;
export type GrcCasePriority = SoarGrcSeverity;
export type AssignedGrcCase = SoarGrcCase;

export type CaseQueueView =
  | "mine"
  | "all"
  | "team"
  | "closed"
  | "archived";

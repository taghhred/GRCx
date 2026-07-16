export type BcmCriticality = "Critical" | "High" | "Medium" | "Low";
export type BcmProcessStatus =
  | "Ready"
  | "Testing"
  | "At Risk"
  | "Draft"
  | "Review";
export type BcmRiskLevel = "Critical" | "High" | "Medium" | "Low";
export type BcmBusinessImpact = "Severe" | "Major" | "Moderate" | "Minor";
export type ActivityPriority = "Critical" | "High" | "Medium" | "Low";
export type ActivityStatus =
  | "Scheduled"
  | "In Progress"
  | "Overdue"
  | "Planned"
  | "Pending";
export type ActivityCategory =
  | "BCP Review"
  | "Exercise"
  | "Recovery Test"
  | "Expired Plan"
  | "Approval"
  | "Audit";

export interface BcmKpi {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "default" | "danger" | "warning" | "success" | "info";
  trend: string;
  trendDirection: "up" | "down" | "stable";
  badge: string;
}

export interface BcmChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface BcmBiaDetail {
  financialImpact: string;
  operationalImpact: string;
  regulatoryImpact: string;
  reputationalImpact: string;
  peakDependency: string;
  downtimeCostPerHour: number;
  recoveryPriority: number;
  riskScenario: string;
}

export interface BcmRecoveryPlanDetail {
  primarySite: string;
  drSite: string;
  backupType: string;
  backupFrequency: string;
  recoveryMethod: string;
  alternateService: string;
  runbookRef: string;
  steps: string[];
}

export interface BcmCommunicationPlan {
  internalContacts: string[];
  externalContacts: string[];
  escalationPath: string[];
  channels: string[];
  templates: string[];
}

export interface BcmEvidenceItem {
  id: string;
  title: string;
  type: string;
  date: string;
  owner: string;
  status: "Approved" | "Pending" | "Expired";
}

export interface BcmAttachment {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface BcmTestHistoryItem {
  id: string;
  date: string;
  type: string;
  scenario: string;
  result: "Passed" | "Partial" | "Failed";
  targetRto: string;
  actualRto: string;
  observations: string;
}

export interface BcmAuditHistoryItem {
  id: string;
  date: string;
  action: string;
  actor: string;
  detail: string;
}

export interface BcmLessonLearned {
  id: string;
  date: string;
  source: string;
  finding: string;
  action: string;
  owner: string;
  status: "Open" | "In Progress" | "Closed";
}

export interface BcmProcessTimelineEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  complete: boolean;
}

export interface BcmComment {
  id: string;
  author: string;
  date: string;
  body: string;
}

export interface BcmVersionHistoryItem {
  id: string;
  version: string;
  date: string;
  author: string;
  changeSummary: string;
}

export interface CriticalBusinessProcess {
  id: string;
  name: string;
  businessUnit: string;
  department: string;
  owner: string;
  criticality: BcmCriticality;
  businessImpact: BcmBusinessImpact;
  rto: string;
  rpo: string;
  mao: string;
  recoveryStrategy: string;
  dependencies: string[];
  recoveryTeam: string;
  status: BcmProcessStatus;
  lastTest: string;
  nextTest: string;
  nextReview: string;
  version: string;
  riskLevel: BcmRiskLevel;
  riskScore: number;
  checklist: BcmChecklistItem[];
  documents: string[];
  aiRecommendations: string[];
  bia: BcmBiaDetail;
  recoveryPlan: BcmRecoveryPlanDetail;
  communicationPlan: BcmCommunicationPlan;
  evidence: BcmEvidenceItem[];
  attachments: BcmAttachment[];
  testHistory: BcmTestHistoryItem[];
  auditHistory: BcmAuditHistoryItem[];
  lessonsLearned: BcmLessonLearned[];
  timeline: BcmProcessTimelineEvent[];
  comments: BcmComment[];
  versionHistory: BcmVersionHistoryItem[];
}

export interface BcmActivity {
  id: string;
  title: string;
  category: ActivityCategory;
  priority: ActivityPriority;
  owner: string;
  dueDate: string;
  status: ActivityStatus;
}

export interface BcmRecommendation {
  id: string;
  title: string;
  detail: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  actionLabel: string;
}

export interface BcmDashboardData {
  kpis: BcmKpi[];
  processes: CriticalBusinessProcess[];
  activities: BcmActivity[];
  recommendations: BcmRecommendation[];
}

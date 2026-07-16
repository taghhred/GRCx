/** Governance domain types — Policies & KPIs */

export type PolicyStatus =
  | "Draft"
  | "Under Review"
  | "Pending Approval"
  | "Approved"
  | "Published"
  | "Expired"
  | "Archived";

export type ApprovalStatus =
  | "Not Submitted"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Changes Requested";

export type PolicyCategory =
  | "Information Security"
  | "Access Control"
  | "Risk Assessment"
  | "Data Protection"
  | "Business Continuity"
  | "Disaster Recovery"
  | "Third-Party Risk"
  | "Incident Management"
  | "Acceptable Use"
  | "Identity and Access Management"
  | "Cloud Security"
  | "Asset Management"
  | "Compliance";

export type GovernanceDepartment =
  | "Cybersecurity GRC"
  | "Cybersecurity Operations"
  | "Information Technology"
  | "Finance"
  | "Human Resources"
  | "Legal"
  | "Operations"
  | "Internal Audit"
  | "Risk Assessment"
  | "Compliance"
  | "Procurement"
  | "Business Continuity"
  | "Executive Management";

export type ReviewFrequency =
  | "Monthly"
  | "Quarterly"
  | "Semi-Annual"
  | "Annual"
  | "On Demand";

export interface PolicyVersion {
  version: string;
  changeSummary: string;
  changedBy: string;
  changeDate: string;
  approvalStatus: ApprovalStatus;
  isCurrent: boolean;
}

export interface PolicyActivity {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  department: GovernanceDepartment;
  owner: string;
  approver: string;
  version: string;
  effectiveDate: string;
  nextReviewDate: string;
  reviewFrequency: ReviewFrequency;
  approvalStatus: ApprovalStatus;
  policyStatus: PolicyStatus;
  frameworks: string[];
  controls: string[];
  documentName?: string;
  evidenceNames: string[];
  notes: string;
  lastUpdated: string;
  versions: PolicyVersion[];
  activity: PolicyActivity[];
}

export type KpiCategory =
  | "Governance"
  | "Compliance"
  | "Risk Assessment"
  | "Identity & Access"
  | "Security Operations"
  | "Business Continuity"
  | "Disaster Recovery"
  | "Third-Party Risk"
  | "Policy Management"
  | "Audit";

export type KpiFrequency =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Semi-Annual"
  | "Annual"
  | "On Demand";

export type KpiUnit =
  | "Percentage"
  | "Count"
  | "Hours"
  | "Days"
  | "Minutes"
  | "Currency"
  | "Score"
  | "Ratio"
  | "Custom";

export type KpiDataSource =
  | "Manual Entry"
  | "Excel Import"
  | "API"
  | "SIEM"
  | "SOAR"
  | "EDR"
  | "IAM"
  | "PAM"
  | "Active Directory"
  | "Cloud Platform"
  | "Audit System"
  | "Custom Integration";

export type PerformanceDirection =
  | "Higher Is Better"
  | "Lower Is Better"
  | "Target Range";

export type KpiStatusLabel = "On Target" | "Warning" | "Critical" | "No Data";

export interface KpiMeasurement {
  id: string;
  periodStart: string;
  periodEnd: string;
  value: number | null;
  status: KpiStatusLabel;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface GovernanceKpi {
  id: string;
  name: string;
  description: string;
  category: KpiCategory;
  department: GovernanceDepartment;
  owner: string;
  frequency: KpiFrequency;
  unit: KpiUnit;
  formula: string;
  direction: PerformanceDirection;
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  /** Used when direction is Target Range */
  targetMin?: number;
  targetMax?: number;
  currentValue: number | null;
  status: KpiStatusLabel;
  dataSource: KpiDataSource;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
  evidenceNames: string[];
  notes: string;
  measurements: KpiMeasurement[];
}

export const GOVERNANCE_DEPARTMENTS: GovernanceDepartment[] = [
  "Cybersecurity GRC",
  "Cybersecurity Operations",
  "Information Technology",
  "Finance",
  "Human Resources",
  "Legal",
  "Operations",
  "Internal Audit",
  "Risk Assessment",
  "Compliance",
  "Procurement",
  "Business Continuity",
  "Executive Management",
];

export const POLICY_CATEGORIES: PolicyCategory[] = [
  "Information Security",
  "Access Control",
  "Risk Assessment",
  "Data Protection",
  "Business Continuity",
  "Disaster Recovery",
  "Third-Party Risk",
  "Incident Management",
  "Acceptable Use",
  "Identity and Access Management",
  "Cloud Security",
  "Asset Management",
  "Compliance",
];

export const POLICY_STATUSES: PolicyStatus[] = [
  "Draft",
  "Under Review",
  "Pending Approval",
  "Approved",
  "Published",
  "Expired",
  "Archived",
];

export const APPROVAL_STATUSES: ApprovalStatus[] = [
  "Not Submitted",
  "Pending",
  "Approved",
  "Rejected",
  "Changes Requested",
];

export const REVIEW_FREQUENCIES: ReviewFrequency[] = [
  "Monthly",
  "Quarterly",
  "Semi-Annual",
  "Annual",
  "On Demand",
];

export const KPI_CATEGORIES: KpiCategory[] = [
  "Governance",
  "Compliance",
  "Risk Assessment",
  "Identity & Access",
  "Security Operations",
  "Business Continuity",
  "Disaster Recovery",
  "Third-Party Risk",
  "Policy Management",
  "Audit",
];

export const KPI_FREQUENCIES: KpiFrequency[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Semi-Annual",
  "Annual",
  "On Demand",
];

export const KPI_UNITS: KpiUnit[] = [
  "Percentage",
  "Count",
  "Hours",
  "Days",
  "Minutes",
  "Currency",
  "Score",
  "Ratio",
  "Custom",
];

export const KPI_DATA_SOURCES: KpiDataSource[] = [
  "Manual Entry",
  "Excel Import",
  "API",
  "SIEM",
  "SOAR",
  "EDR",
  "IAM",
  "PAM",
  "Active Directory",
  "Cloud Platform",
  "Audit System",
  "Custom Integration",
];

export const PERFORMANCE_DIRECTIONS: PerformanceDirection[] = [
  "Higher Is Better",
  "Lower Is Better",
  "Target Range",
];

export const KPI_STATUS_LABELS: KpiStatusLabel[] = [
  "On Target",
  "Warning",
  "Critical",
  "No Data",
];

/** Validate threshold logic for a KPI definition. Returns error message or null. */
export function validateKpiThresholds(options: {
  direction: PerformanceDirection;
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  targetMin?: number;
  targetMax?: number;
}): string | null {
  const {
    direction,
    target,
    warningThreshold,
    criticalThreshold,
    targetMin,
    targetMax,
  } = options;
  if ([target, warningThreshold, criticalThreshold].some((n) => Number.isNaN(n))) {
    return "KPI thresholds must be valid numbers.";
  }
  if (direction === "Higher Is Better") {
    if (!(criticalThreshold <= warningThreshold && warningThreshold <= target)) {
      return "For Higher Is Better: Critical ≤ Warning ≤ Target.";
    }
  } else if (direction === "Lower Is Better") {
    if (!(target <= warningThreshold && warningThreshold <= criticalThreshold)) {
      return "For Lower Is Better: Target ≤ Warning ≤ Critical.";
    }
  } else {
    const min = targetMin ?? Math.min(target, warningThreshold);
    const max = targetMax ?? Math.max(target, warningThreshold);
    if (!(min <= max)) {
      return "For Target Range: minimum must be less than or equal to maximum.";
    }
  }
  return null;
}

export type BehaviorStatus =
  | "Normal"
  | "Baseline Matched"
  | "Minor Deviation"
  | "Suspicious Activity"
  | "Behavior Anomaly";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type PolicyStatus =
  | "Compliant"
  | "Policy Warning"
  | "Policy Violation"
  | "Unauthorized Activity";

export type RecommendedAction =
  | "No Action"
  | "Review Activity"
  | "Force MFA"
  | "Reset Password"
  | "Disable Account"
  | "Investigate"
  | "Escalate to SOC";

export type BaselineIndicatorState = "match" | "warn" | "fail";

export interface BaselineIndicator {
  id: string;
  label: string;
  state: BaselineIndicatorState;
}

export interface IdentityActivity {
  id: string;
  time: string;
  detail: string;
}

export interface IdentityMonitoringRow {
  id: string;
  employee: string;
  department: string;
  role: string;
  email: string;
  lastLogin: string;
  currentActivity: string;
  behaviorStatus: BehaviorStatus;
  riskLevel: RiskLevel;
  policyStatus: PolicyStatus;
  recommendedAction: RecommendedAction;
  baseline: BaselineIndicator[];
  recentActivities: IdentityActivity[];
  deviations: string[];
  policyViolations: string[];
  accessHistory: string[];
  relatedIncidents: string[];
  aiRecommendation: string;
}

export interface IdentityMonitoringData {
  identities: IdentityMonitoringRow[];
  departments: string[];
}

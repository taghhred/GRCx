export type DrSeverity = "Critical" | "High" | "Medium" | "Low";
export type SystemRecoveryStatus =
  | "Operational"
  | "Recovering"
  | "Offline"
  | "Pending";
export type TestResult = "Passed" | "Failed" | "Scheduled";
export type Availability = "24/7" | "Business hours" | "On-call";

export interface DrKpi {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "default" | "danger" | "warning" | "success" | "info";
  statusLabel: string;
}

export interface RecoveryStatusCounts {
  overall: "Critical" | "Degraded" | "Stable";
  lastUpdated: string;
  operational: number;
  recovering: number;
  offline: number;
  pending: number;
}

export interface RecoveryProgressSummary {
  percent: number;
  recoveredSystems: number;
  pendingSystems: number;
  estimatedRemaining: string;
}

export interface DrNotification {
  id: string;
  title: string;
  detail: string;
  severity: DrSeverity;
  time: string;
}

export interface StrategyPhase {
  id: string;
  title: string;
  progress: number;
  items: { id: string; label: string; done: boolean }[];
}

export interface DrContact {
  id: string;
  role: string;
  name: string;
  department: string;
  phone: string;
  email: string;
  availability: Availability;
  owner?: string;
  checklist?: { id: string; label: string; done: boolean }[];
  dependencies?: string[];
  documents?: string[];
  logs?: string[];
  objectives?: { rto: string; rpo: string; mao: string };
  aiRecommendations?: string[];
}

export interface DrTimelineEvent {
  id: string;
  title: string;
  time: string;
  detail: string;
  complete: boolean;
}

export interface RecoveryObjectiveMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  compliance: "Compliant" | "Watch" | "Gap";
}

export interface DrTest {
  id: string;
  name: string;
  environment: string;
  lastTest: string;
  nextTest: string;
  result: TestResult;
  owner: string;
  checklist: { id: string; label: string; done: boolean }[];
  dependencies: string[];
  documents: string[];
  logs: string[];
  objectives: { rto: string; rpo: string; mao: string };
  aiRecommendations: string[];
}

export interface CriticalSystem {
  id: string;
  system: string;
  owner: string;
  priority: DrSeverity;
  recoveryStatus: SystemRecoveryStatus;
  recoveryTime: string;
  dependencies: string[];
  checklist: { id: string; label: string; done: boolean }[];
  documents: string[];
  logs: string[];
  objectives: { rto: string; rpo: string; mao: string };
  aiRecommendations: string[];
}

export interface AiInsight {
  id: string;
  title: string;
  detail: string;
}

export interface ReadinessScore {
  id: string;
  label: string;
  value: number;
  tone: "warning" | "success" | "info";
}

export interface DrDashboardData {
  kpis: DrKpi[];
  currentStatus: RecoveryStatusCounts;
  progress: RecoveryProgressSummary;
  notifications: DrNotification[];
  strategy: StrategyPhase[];
  contacts: DrContact[];
  timeline: DrTimelineEvent[];
  objectives: RecoveryObjectiveMetric[];
  tests: DrTest[];
  systems: CriticalSystem[];
  insights: AiInsight[];
  readinessScores: ReadinessScore[];
}

/** Normalized drawer model for systems, tests, and contacts */
export interface DrDrawerContent {
  id: string;
  kind: "system" | "test" | "contact" | "notification";
  title: string;
  subtitle: string;
  statusLabel?: string;
  priority?: DrSeverity;
  owner: string;
  objectives?: { rto: string; rpo: string; mao: string };
  checklist: { id: string; label: string; done: boolean }[];
  dependencies: string[];
  documents: string[];
  logs: string[];
  aiRecommendations: string[];
}

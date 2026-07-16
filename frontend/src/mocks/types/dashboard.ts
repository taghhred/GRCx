export type Severity = "Critical" | "High" | "Medium" | "Low";
export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type AsyncState = "idle" | "loading" | "success" | "empty" | "error";

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: "default" | "danger" | "warning" | "success" | "info";
}

export interface ViolationTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SeveritySlice {
  name: Severity;
  value: number;
  color: string;
}

export interface ViolationTypeSlice {
  name: string;
  count: number;
}

export interface RegulatoryCoverageItem {
  framework: string;
  coverage: number;
}

export interface RecentViolationRow {
  id: string;
  title: string;
  identity: string;
  severity: Severity;
  status: string;
  detectedAt: string;
}

export interface CriticalAssetRow {
  id: string;
  name: string;
  type: "User" | "Asset";
  riskScore: number;
  violations: number;
}

export interface AiInsight {
  id: string;
  title: string;
  body: string;
  tone: "success" | "warning" | "info";
}

export interface DashboardData {
  metrics: DashboardMetric[];
  overallRisk: RiskLevel;
  complianceScore: number;
  trend: ViolationTrendPoint[];
  severity: SeveritySlice[];
  topTypes: ViolationTypeSlice[];
  regulatoryCoverage: RegulatoryCoverageItem[];
  recentViolations: RecentViolationRow[];
  criticalAssets: CriticalAssetRow[];
  insights: AiInsight[];
  dateRangeLabel: string;
}

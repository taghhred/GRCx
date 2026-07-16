export type ReportCategory = "Executive" | "Detailed";

export type EnterpriseReportType =
  | "Executive Report"
  | "Technical Report"
  | "Compliance Report"
  | "Risk Assessment Report"
  | "Business Continuity Report"
  | "Disaster Recovery Report"
  | "Identity & Access Report"
  | "Governance Report"
  | "SOAR Report"
  | "Custom Report";

export type ReportStatus =
  | "Draft"
  | "Generating"
  | "Ready"
  | "Approved"
  | "Archived"
  | "Failed";

export type ReportModuleScope =
  | "Dashboard Overview"
  | "Identity & Access"
  | "Security Operations"
  | "Compliance"
  | "Risk Assessment"
  | "Business Continuity"
  | "Disaster Recovery"
  | "AI Advisor Insights";

export type ReportFramework =
  | "NCA ECC"
  | "SAMA CSF"
  | "PCI DSS"
  | "ISO 27001"
  | "All Frameworks";

export type ReportDepartment =
  | "All Departments"
  | "IT"
  | "Information Security"
  | "Finance"
  | "Operations"
  | "Human Resources"
  | "Risk"
  | "Compliance"
  | "Infrastructure";

export type ExecutiveSectionId =
  | "Executive Summary"
  | "Compliance Overview"
  | "Risk Overview"
  | "Critical Violations"
  | "Identity Risks"
  | "Business Continuity Readiness"
  | "Disaster Recovery Readiness"
  | "Top Recommendations"
  | "Charts"
  | "Management Conclusion";

export type DetailedSectionId =
  | "Full Findings"
  | "Asset Compliance Table"
  | "Identity Monitoring Table"
  | "Risk Cases"
  | "Risk Assessment Calculations"
  | "Evidence Register"
  | "Control Mapping"
  | "Remediation Plan"
  | "BCM Details"
  | "DR Details"
  | "Activity Logs"
  | "Auditor Notes"
  | "Appendices";

export type ReportSectionId = ExecutiveSectionId | DetailedSectionId;

export type PeriodPreset =
  | "Last 7 Days"
  | "Last 30 Days"
  | "Last Quarter"
  | "Last 6 Months"
  | "Current Year"
  | "Custom Range";

export type WatermarkPosition =
  | "Center"
  | "Top Left"
  | "Top Right"
  | "Bottom Left"
  | "Bottom Right";

export type ReportClassification =
  | "Internal"
  | "Confidential"
  | "Restricted"
  | "Top Secret";

export type GenerationPhase =
  | "Preparing Data"
  | "Generating Charts"
  | "Building Report"
  | "Applying Watermark"
  | "Finalizing PDF"
  | "Ready";

export type ScheduleFrequency =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Yearly";

export type ScheduleStatus = "Active" | "Paused" | "Completed" | "Failed";

export interface Auditor {
  name: string;
  role: string;
}

export interface ReportWatermark {
  enabled: boolean;
  text: string;
  opacity: number;
  position: WatermarkPosition;
  rotation: number;
  fontSize: number;
}

export interface ReportScope {
  modules: ReportModuleScope[];
  frameworks: ReportFramework[];
  departments: ReportDepartment[];
}

export interface ReportMetadata {
  title: string;
  description: string;
  issueDate: string;
  auditorName: string;
  auditorRole: string;
  preparedBy: string;
  approvedBy: string;
  organizationName: string;
  classification: ReportClassification;
  userPosition?: string;
  department?: string;
}

export interface ReportPeriod {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
  label: string;
}

export interface ReportSection {
  id: ReportSectionId;
  title: string;
  summary: string;
  bullets?: string[];
  rows?: Array<Record<string, string>>;
  columns?: string[];
}

export interface ReportPreviewPage {
  pageNumber: number;
  title: string;
  sections: ReportSection[];
}

export interface AggregatedReportContent {
  pages: ReportPreviewPage[];
  pageCount: number;
  executiveNarrative: string;
  keyRecommendations: string[];
  summaryMetrics: Array<{ label: string; value: string }>;
}

export interface ReportIncludeOptions {
  charts: boolean;
  kpis: boolean;
  recommendations: boolean;
  evidence: boolean;
  attachments: boolean;
  auditTrail: boolean;
}

/** Step 3 wizard section toggles — maps to aggregated PDF sections. */
export interface ReportSectionToggles {
  executiveSummary: boolean;
  kpiSummary: boolean;
  charts: boolean;
  topRisks: boolean;
  complianceStatus: boolean;
  violations: boolean;
  treatmentPlans: boolean;
  heatMaps: boolean;
  evidence: boolean;
  attachments: boolean;
  recommendations: boolean;
  auditTrail: boolean;
  rawTechnicalDetails: boolean;
}

export interface ReportBuilderFilters {
  department: string;
  businessUnit: string;
  framework: string;
  status: string;
  riskLevel: string;
  complianceStatus: string;
  owner: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReportBuilderState {
  reportType: EnterpriseReportType;
  filters: ReportBuilderFilters;
  includes: ReportIncludeOptions;
  sectionToggles: ReportSectionToggles;
  classification: ReportClassification;
}

/** Report types shown in the Step 1 wizard picker. */
export const WIZARD_REPORT_TYPES: EnterpriseReportType[] = [
  "Executive Report",
  "Technical Report",
  "Compliance Report",
  "Risk Assessment Report",
  "Business Continuity Report",
  "Disaster Recovery Report",
  "Identity & Access Report",
  "Governance Report",
];

export const SECTION_TOGGLE_LABELS: Array<{
  key: keyof ReportSectionToggles;
  label: string;
  executiveOnly?: boolean;
  technicalOnly?: boolean;
}> = [
  { key: "executiveSummary", label: "Executive Summary" },
  { key: "kpiSummary", label: "KPI Summary" },
  { key: "charts", label: "Charts" },
  { key: "topRisks", label: "Top Risks" },
  { key: "complianceStatus", label: "Compliance Status" },
  { key: "violations", label: "Violations" },
  { key: "treatmentPlans", label: "Treatment Plans", technicalOnly: true },
  { key: "heatMaps", label: "Heat Maps" },
  { key: "evidence", label: "Evidence", technicalOnly: true },
  { key: "attachments", label: "Attachments", technicalOnly: true },
  { key: "recommendations", label: "Recommendations" },
  { key: "auditTrail", label: "Audit Trail", technicalOnly: true },
  { key: "rawTechnicalDetails", label: "Raw Technical Details", technicalOnly: true },
];

export interface Report {
  id: string;
  reportId: string;
  name: string;
  category: ReportCategory;
  reportType: EnterpriseReportType;
  reportingPeriod: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  createdAt: string;
  generatedBy: string;
  userPosition: string;
  department: string;
  organizationName: string;
  generatedTime: string;
  dayOfWeek: string;
  version: string;
  auditor: string;
  auditorRole: string;
  frameworks: string[];
  status: ReportStatus;
  pages: number;
  scope: ReportScope;
  sections: ReportSectionId[];
  metadata: ReportMetadata;
  watermark: ReportWatermark;
  content: AggregatedReportContent;
  approvalStatus: string;
  watermarkEnabled: boolean;
  classification: ReportClassification;
  /** Session-only PDF as base64 data URL for in-app viewer / download. */
  pdfDataUrl?: string;
}

export interface ReportDraftInput {
  category: ReportCategory;
  period: ReportPeriod;
  scope: ReportScope;
  sections: ReportSectionId[];
  metadata: ReportMetadata;
  watermark: ReportWatermark;
  enterpriseType?: EnterpriseReportType;
  filters?: {
    businessUnit?: string;
    status?: string;
    riskLevel?: string;
    complianceStatus?: string;
    owner?: string;
  };
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: EnterpriseReportType;
  frequency: ScheduleFrequency;
  recipients: string[];
  notificationsEnabled: boolean;
  emailDeliveryEnabled: boolean;
  nextRun: string;
  status: ScheduleStatus;
  classification: ReportClassification;
  owner: string;
  createdAt: string;
}

export type ReportGenerationStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "generating"; phase: GenerationPhase; progress: number }
  | { state: "ready"; report: Report }
  | { state: "error"; message: string }
  | { state: "empty" };

export const ENTERPRISE_REPORT_TYPES: EnterpriseReportType[] = [
  "Executive Report",
  "Technical Report",
  "Compliance Report",
  "Risk Assessment Report",
  "Business Continuity Report",
  "Disaster Recovery Report",
  "Identity & Access Report",
  "Governance Report",
  "SOAR Report",
  "Custom Report",
];

export const REPORT_CLASSIFICATIONS: ReportClassification[] = [
  "Internal",
  "Confidential",
  "Restricted",
  "Top Secret",
];

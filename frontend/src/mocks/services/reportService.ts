import type {
  AggregatedReportContent,
  EnterpriseReportType,
  Report,
  ReportCategory,
  ReportClassification,
  ReportDraftInput,
  ReportStatus,
  ReportWatermark,
  ScheduledReport,
  ScheduleFrequency,
  ScheduleStatus,
} from "../types/reports";
import { aggregateReportContent } from "./reportAggregation";
import { buildEnterprisePdf } from "../../services/grcxPdfEngine";
import { displayFirstName } from "../../utils/reportDisplay";
import { isMocksEnabled } from "../../services/api/config";
import {
  listReports as listReportsApi,
  upsertReport as upsertReportApi,
} from "../../services/api/reportsApi";

const GENERATION_PHASES = [
  "Preparing Data",
  "Generating Charts",
  "Building Report",
  "Applying Watermark",
  "Finalizing PDF",
  "Ready",
] as const;

function defaultWatermark(classification?: ReportClassification): ReportWatermark {
  return {
    enabled: true,
    text: (classification || "Confidential").toUpperCase(),
    opacity: 6,
    position: "Center",
    rotation: -35,
    fontSize: 64,
  };
}

function nowParts(date = new Date()) {
  const issueDate = date.toISOString().slice(0, 10);
  const generatedTime = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(date);
  return { issueDate, generatedTime, dayOfWeek, createdAt: issueDate };
}

function seedContent(
  category: ReportCategory,
  title: string
): AggregatedReportContent {
  return {
    pageCount: category === "Executive" ? 3 : 5,
    executiveNarrative: `${title} summarizing GRCx posture for the selected period.`,
    keyRecommendations: [
      "Prioritize Critical privileged access remediation.",
      "Close encryption gaps on non-compliant databases.",
      "Complete overdue DR testing evidence.",
    ],
    summaryMetrics: [
      { label: "Overall Risk", value: "High" },
      { label: "Compliance Score", value: "78%" },
      { label: "Active Violations", value: "27" },
      { label: "BCM Readiness", value: "86%" },
    ],
    pages: [
      {
        pageNumber: 1,
        title: "Cover & Summary",
        sections: [
          {
            id: category === "Executive" ? "Executive Summary" : "Full Findings",
            title: category === "Executive" ? "Executive Summary" : "Full Findings",
            summary:
              "Historical report snapshot from the Reporting Center catalog. Regenerate for live aggregation.",
            bullets: [
              "Overall risk remains High.",
              "Compliance score 78% across NCA ECC and SAMA CSF.",
              "Critical remediation tracked in Risk and Asset Compliance.",
            ],
          },
        ],
      },
      {
        pageNumber: 2,
        title: "Details",
        sections: [
          {
            id: category === "Executive" ? "Top Recommendations" : "Appendices",
            title:
              category === "Executive" ? "Top Recommendations" : "Appendices",
            summary: "Supporting recommendations and references.",
            bullets: [
              "Remediate Critical residual risks within 14 days.",
              "Validate BCM and DR evidence packs.",
            ],
          },
        ],
      },
    ],
  };
}

function makeSeedReport(partial: {
  id: string;
  reportId: string;
  name: string;
  category: ReportCategory;
  reportType: EnterpriseReportType;
  reportingPeriod: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  generatedBy: string;
  userPosition: string;
  department: string;
  status: ReportStatus;
  pages: number;
  classification: ReportClassification;
  frameworks: string[];
}): Report {
  const { generatedTime, dayOfWeek } = nowParts(
    new Date(`${partial.issueDate}T10:30:00`)
  );
  return {
    ...partial,
    createdAt: partial.issueDate,
    generatedTime,
    dayOfWeek,
    version: "1.0",
    organizationName: "GRCx Financial Group",
    auditor: partial.generatedBy,
    auditorRole: partial.userPosition,
    scope: {
      modules: [
        "Dashboard Overview",
        "Compliance",
        "Risk Assessment",
        "Identity & Access",
        "Business Continuity",
        "Disaster Recovery",
      ],
      frameworks: partial.frameworks as never[],
      departments: ["All Departments"],
    },
    sections:
      partial.category === "Executive"
        ? [
            "Executive Summary",
            "Compliance Overview",
            "Risk Overview",
            "Top Recommendations",
          ]
        : [
            "Full Findings",
            "Asset Compliance Table",
            "Risk Cases",
            "Evidence Register",
            "Control Mapping",
            "Appendices",
          ],
    metadata: {
      title: partial.name,
      description: partial.name,
      issueDate: partial.issueDate,
      auditorName: partial.generatedBy,
      auditorRole: partial.userPosition,
      preparedBy: partial.generatedBy,
      approvedBy: "",
      organizationName: "GRCx Financial Group",
      classification: partial.classification,
      userPosition: partial.userPosition,
      department: partial.department,
    },
    watermark: defaultWatermark(partial.classification),
    content: seedContent(partial.category, partial.name),
    approvalStatus: partial.status === "Approved" ? "Approved" : "Pending",
    watermarkEnabled: true,
  };
}

const initialReports: Report[] = [
  makeSeedReport({
    id: "rep-exec-001",
    reportId: "RPT-EXE-001",
    name: "GRCx Monthly Executive Briefing — May 2026",
    category: "Executive",
    reportType: "Executive Report",
    reportingPeriod: "01 May 2026 – 31 May 2026",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    issueDate: "2026-05-31",
    generatedBy: "Sara",
    userPosition: "Chief Risk Officer",
    department: "Risk",
    status: "Approved",
    pages: 4,
    classification: "Confidential",
    frameworks: ["NCA ECC", "SAMA CSF"],
  }),
  makeSeedReport({
    id: "rep-tech-001",
    reportId: "RPT-TEC-001",
    name: "Detailed Compliance & Risk Technical Pack — May 2026",
    category: "Detailed",
    reportType: "Technical Report",
    reportingPeriod: "01 May 2026 – 31 May 2026",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    issueDate: "2026-05-31",
    generatedBy: "Ahmed",
    userPosition: "External Auditor",
    department: "Compliance",
    status: "Ready",
    pages: 8,
    classification: "Confidential",
    frameworks: ["NCA ECC", "PCI DSS", "ISO 27001"],
  }),
  makeSeedReport({
    id: "rep-bcm-001",
    reportId: "RPT-BCM-001",
    name: "Business Continuity Readiness Pack — Q2 2026",
    category: "Detailed",
    reportType: "Business Continuity Report",
    reportingPeriod: "01 Apr 2026 – 30 Jun 2026",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    issueDate: "2026-07-01",
    generatedBy: "Khalid",
    userPosition: "BCM Lead",
    department: "Operations",
    status: "Ready",
    pages: 6,
    classification: "Internal",
    frameworks: ["SAMA CSF", "ISO 27001"],
  }),
  makeSeedReport({
    id: "rep-id-001",
    reportId: "RPT-IAM-001",
    name: "Identity & Access Investigation — June 2026",
    category: "Detailed",
    reportType: "Identity & Access Report",
    reportingPeriod: "01 Jun 2026 – 30 Jun 2026",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    issueDate: "2026-07-02",
    generatedBy: "Noura",
    userPosition: "IAM Auditor",
    department: "Information Security",
    status: "Draft",
    pages: 5,
    classification: "Restricted",
    frameworks: ["SAMA CSF", "NCA ECC"],
  }),
  makeSeedReport({
    id: "rep-risk-001",
    reportId: "RPT-RSK-001",
    name: "Enterprise Risk Assessment Report — H1 2026",
    category: "Detailed",
    reportType: "Risk Assessment Report",
    reportingPeriod: "01 Jan 2026 – 30 Jun 2026",
    periodStart: "2026-01-01",
    periodEnd: "2026-06-30",
    issueDate: "2026-07-05",
    generatedBy: "Mohammed",
    userPosition: "Risk Manager",
    department: "Risk",
    status: "Approved",
    pages: 7,
    classification: "Confidential",
    frameworks: ["All Frameworks"],
  }),
];

let reportsStore: Report[] = [...initialReports];
let reportCounter = 200;

const initialSchedules: ScheduledReport[] = [
  {
    id: "sch-001",
    name: "Monthly Executive Briefing",
    reportType: "Executive Report",
    frequency: "Monthly",
    recipients: ["cro@grcx.local", "board-risk@grcx.local"],
    notificationsEnabled: true,
    emailDeliveryEnabled: true,
    nextRun: "2026-08-01",
    status: "Active",
    classification: "Confidential",
    owner: "Sara Al-Harbi",
    createdAt: "2026-05-01",
  },
  {
    id: "sch-002",
    name: "Weekly Technical Risk Digest",
    reportType: "Technical Report",
    frequency: "Weekly",
    recipients: ["risk-ops@grcx.local"],
    notificationsEnabled: true,
    emailDeliveryEnabled: false,
    nextRun: "2026-07-21",
    status: "Active",
    classification: "Internal",
    owner: "Ahmed Qureshi",
    createdAt: "2026-06-10",
  },
  {
    id: "sch-003",
    name: "Quarterly BCM Evidence Pack",
    reportType: "Business Continuity Report",
    frequency: "Quarterly",
    recipients: ["bcm-office@grcx.local", "audit@grcx.local"],
    notificationsEnabled: true,
    emailDeliveryEnabled: true,
    nextRun: "2026-10-01",
    status: "Paused",
    classification: "Restricted",
    owner: "Khalid Mansour",
    createdAt: "2026-03-15",
  },
];

let schedulesStore: ScheduledReport[] = [...initialSchedules];
let scheduleCounter = 10;

export function listReports(category?: ReportCategory): Report[] {
  if (!category) return [...reportsStore];
  return reportsStore.filter((item) => item.category === category);
}

export function listAllReports(): Report[] {
  return [...reportsStore];
}

/** Hydrate local catalog from API when mocks are off. */
export async function hydrateReportsFromApi(): Promise<Report[]> {
  if (isMocksEnabled()) return listAllReports();
  try {
    const remote = await listReportsApi();
    if (remote.length > 0) {
      reportsStore = remote.map((r) => ({ ...r }));
    }
  } catch {
    /* keep local seed */
  }
  return listAllReports();
}

export function getReportById(id: string): Report | undefined {
  return reportsStore.find((item) => item.id === id || item.reportId === id);
}

export function updateReport(
  id: string,
  patch: Partial<Report>
): Report | undefined {
  reportsStore = reportsStore.map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  return getReportById(id);
}

export function deleteReport(id: string): void {
  reportsStore = reportsStore.filter((item) => item.id !== id);
}

export function duplicateReport(id: string): Report | undefined {
  const source = getReportById(id);
  if (!source) return undefined;
  reportCounter += 1;
  const parts = nowParts();
  const clone: Report = {
    ...source,
    id: `rep-${Date.now()}`,
    reportId: `RPT-DUP-${reportCounter}`,
    name: `${source.name} (Copy)`,
    status: "Draft",
    createdAt: parts.createdAt,
    issueDate: parts.issueDate,
    generatedTime: parts.generatedTime,
    dayOfWeek: parts.dayOfWeek,
    version: source.version,
    pdfDataUrl: undefined,
    approvalStatus: "Draft",
    metadata: {
      ...source.metadata,
      title: `${source.metadata.title} (Copy)`,
      issueDate: parts.issueDate,
    },
  };
  reportsStore = [clone, ...reportsStore];
  return clone;
}

export async function generateReport(
  input: ReportDraftInput,
  onPhase?: (phase: (typeof GENERATION_PHASES)[number], progress: number) => void
): Promise<Report> {
  for (let i = 0; i < GENERATION_PHASES.length; i += 1) {
    const phase = GENERATION_PHASES[i];
    onPhase?.(phase, Math.round(((i + 1) / GENERATION_PHASES.length) * 100));
    await new Promise((resolve) => setTimeout(resolve, 280));
  }

  const content = aggregateReportContent(input);
  reportCounter += 1;
  const parts = nowParts();
  const enterpriseType =
    input.enterpriseType ??
    (input.category === "Executive"
      ? "Executive Report"
      : "Technical Report");

  const report: Report = {
    id: `rep-${Date.now()}`,
    reportId: `RPT-${reportCounter}`,
    name: input.metadata.title.trim() || enterpriseType,
    category: input.category,
    reportType: enterpriseType,
    reportingPeriod: input.period.label,
    periodStart: input.period.startDate,
    periodEnd: input.period.endDate,
    issueDate: input.metadata.issueDate || parts.issueDate,
    createdAt: parts.createdAt,
    generatedBy: displayFirstName(input.metadata.preparedBy || "GRCx"),
    userPosition:
      input.metadata.userPosition || input.metadata.auditorRole || "Analyst",
    department: input.metadata.department || "Enterprise GRC",
    organizationName: input.metadata.organizationName || "GRCx Financial Group",
    generatedTime: parts.generatedTime,
    dayOfWeek: parts.dayOfWeek,
    version: "1.0",
    auditor: input.metadata.auditorName,
    auditorRole: input.metadata.auditorRole,
    frameworks: input.scope.frameworks.map(String),
    status: "Ready" satisfies ReportStatus,
    pages: content.pageCount,
    scope: input.scope,
    sections: input.sections,
    metadata: input.metadata,
    watermark: input.watermark,
    content,
    approvalStatus: "Pending",
    watermarkEnabled: input.watermark.enabled,
    classification: input.metadata.classification,
  };

  const pdf = await buildEnterprisePdf(report);
  report.pdfDataUrl = pdf.dataUrl;
  report.pages = pdf.pageCount;

  reportsStore = [report, ...reportsStore];

  if (!isMocksEnabled()) {
    try {
      const pdfBase64 = report.pdfDataUrl?.includes(",")
        ? report.pdfDataUrl.split(",", 1)[1]
        : report.pdfDataUrl;
      await upsertReportApi({ report, pdfBase64 });
    } catch {
      /* local catalog still holds the report for this session */
    }
  }

  return report;
}

/** Ensure a historical report has a PDF blob available for the in-app viewer. */
export async function ensureReportPdf(report: Report): Promise<Report> {
  if (report.pdfDataUrl) return report;
  const pdf = await buildEnterprisePdf(report);
  const updated = updateReport(report.id, {
    pdfDataUrl: pdf.dataUrl,
    pages: pdf.pageCount,
  });
  return updated ?? { ...report, pdfDataUrl: pdf.dataUrl, pages: pdf.pageCount };
}

export function listScheduledReports(): ScheduledReport[] {
  return [...schedulesStore];
}

export function createScheduledReport(
  input: Omit<ScheduledReport, "id" | "createdAt" | "status"> & {
    status?: ScheduleStatus;
  }
): ScheduledReport {
  scheduleCounter += 1;
  const item: ScheduledReport = {
    ...input,
    id: `sch-${Date.now()}`,
    createdAt: new Date().toISOString().slice(0, 10),
    status: input.status ?? "Active",
  };
  schedulesStore = [item, ...schedulesStore];
  return item;
}

export function updateScheduledReport(
  id: string,
  patch: Partial<ScheduledReport>
): ScheduledReport | undefined {
  schedulesStore = schedulesStore.map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  return schedulesStore.find((item) => item.id === id);
}

export function deleteScheduledReport(id: string): void {
  schedulesStore = schedulesStore.filter((item) => item.id !== id);
}

export const SCHEDULE_FREQUENCIES: ScheduleFrequency[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];

export { GENERATION_PHASES, defaultWatermark };

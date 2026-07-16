import type {
  EnterpriseReportType,
  ReportBuilderState,
  ReportCategory,
  ReportDraftInput,
  ReportIncludeOptions,
  ReportSectionId,
  ReportSectionToggles,
  ReportWatermark,
} from "../mocks/types/reports";
import { buildPeriodFromPreset } from "../utils/reportPeriod";

export function categoryForReportType(type: EnterpriseReportType): ReportCategory {
  if (
    type === "Executive Report" ||
    type === "Governance Report"
  ) {
    return "Executive";
  }
  return "Detailed";
}

export function defaultSectionTogglesForType(
  type: EnterpriseReportType
): ReportSectionToggles {
  const isExecutive =
    type === "Executive Report" || type === "Governance Report";

  if (isExecutive) {
    return {
      executiveSummary: true,
      kpiSummary: true,
      charts: true,
      topRisks: true,
      complianceStatus: true,
      violations: true,
      treatmentPlans: false,
      heatMaps: true,
      evidence: false,
      attachments: false,
      recommendations: true,
      auditTrail: false,
      rawTechnicalDetails: false,
    };
  }

  if (type === "Technical Report") {
    return {
      executiveSummary: true,
      kpiSummary: true,
      charts: true,
      topRisks: true,
      complianceStatus: true,
      violations: true,
      treatmentPlans: true,
      heatMaps: true,
      evidence: true,
      attachments: true,
      recommendations: true,
      auditTrail: true,
      rawTechnicalDetails: true,
    };
  }

  const label = String(type);
  return {
    executiveSummary: true,
    kpiSummary: true,
    charts: true,
    topRisks: true,
    complianceStatus: true,
    violations: label === "Compliance Report",
    treatmentPlans: true,
    heatMaps: false,
    evidence: label !== "Executive Report",
    attachments: false,
    recommendations: true,
    auditTrail: true,
    rawTechnicalDetails: label === "Technical Report",
  };
}

export function defaultIncludesForType(
  type: EnterpriseReportType
): ReportIncludeOptions {
  const toggles = defaultSectionTogglesForType(type);
  return {
    charts: toggles.charts || toggles.heatMaps,
    kpis: toggles.kpiSummary,
    recommendations: toggles.recommendations,
    evidence: toggles.evidence,
    attachments: toggles.attachments,
    auditTrail: toggles.auditTrail,
  };
}

export function sectionsFromToggles(
  type: EnterpriseReportType,
  toggles: ReportSectionToggles
): ReportSectionId[] {
  const category = categoryForReportType(type);
  const sections: ReportSectionId[] = [];

  if (toggles.executiveSummary) sections.push("Executive Summary");
  if (toggles.complianceStatus) sections.push("Compliance Overview");
  if (toggles.topRisks) {
    sections.push(category === "Executive" ? "Risk Overview" : "Risk Cases");
  }
  if (toggles.violations) sections.push("Critical Violations");
  if (toggles.charts || toggles.heatMaps) sections.push("Charts");
  if (toggles.recommendations) {
    sections.push(
      category === "Executive" ? "Top Recommendations" : "Remediation Plan"
    );
  }

  if (category === "Executive") {
    if (type === "Governance Report") sections.push("Management Conclusion");
    sections.push("Business Continuity Readiness", "Disaster Recovery Readiness");
    sections.push("Identity Risks");
    return [...new Set(sections)];
  }

  if (toggles.rawTechnicalDetails) sections.push("Full Findings");

  if (type === "Compliance Report" || toggles.rawTechnicalDetails) {
    sections.push("Asset Compliance Table", "Control Mapping");
  }
  if (type === "Risk Assessment Report" || toggles.rawTechnicalDetails) {
    sections.push("Risk Assessment Calculations");
  }
  if (type === "Identity & Access Report" || toggles.rawTechnicalDetails) {
    sections.push("Identity Monitoring Table");
  }
  if (type === "Business Continuity Report" || toggles.rawTechnicalDetails) {
    sections.push("BCM Details");
  }
  if (type === "Disaster Recovery Report" || toggles.rawTechnicalDetails) {
    sections.push("DR Details");
  }
  if (type === "Technical Report") {
    sections.push(
      "Asset Compliance Table",
      "Identity Monitoring Table",
      "Risk Cases",
      "Risk Assessment Calculations",
      "Control Mapping",
      "BCM Details",
      "DR Details"
    );
  }

  if (toggles.treatmentPlans) sections.push("Remediation Plan");
  if (toggles.evidence) sections.push("Evidence Register");
  if (toggles.attachments) sections.push("Appendices");
  if (toggles.auditTrail) sections.push("Activity Logs");

  return [...new Set(sections)];
}

export function sectionsForBuilder(
  type: EnterpriseReportType,
  includes: ReportIncludeOptions,
  toggles?: ReportSectionToggles
): ReportSectionId[] {
  if (toggles) return sectionsFromToggles(type, toggles);

  const category = categoryForReportType(type);

  if (category === "Executive") {
    const sections: ReportSectionId[] = ["Executive Summary"];
    sections.push("Compliance Overview", "Risk Overview");
    if (type === "Governance Report") sections.push("Management Conclusion");
    sections.push("Business Continuity Readiness", "Disaster Recovery Readiness");
    if (includes.recommendations) sections.push("Top Recommendations");
    if (includes.charts) sections.push("Charts");
    sections.push("Critical Violations", "Identity Risks");
    return [...new Set(sections)];
  }

  const sections: ReportSectionId[] = [];

  if (type === "Compliance Report") {
    sections.push(
      "Full Findings",
      "Asset Compliance Table",
      "Control Mapping",
      "Remediation Plan"
    );
  } else if (type === "Risk Assessment Report") {
    sections.push(
      "Risk Cases",
      "Risk Assessment Calculations",
      "Remediation Plan",
      "Full Findings"
    );
  } else if (type === "Business Continuity Report") {
    sections.push("BCM Details", "Appendices");
  } else if (type === "Disaster Recovery Report") {
    sections.push("DR Details", "Appendices");
  } else if (type === "Identity & Access Report") {
    sections.push("Identity Monitoring Table", "Activity Logs", "Remediation Plan");
  } else {
    sections.push(
      "Full Findings",
      "Asset Compliance Table",
      "Identity Monitoring Table",
      "Risk Cases",
      "Control Mapping",
      "BCM Details",
      "DR Details"
    );
  }

  if (includes.evidence) sections.push("Evidence Register");
  if (includes.attachments) sections.push("Appendices");
  if (includes.auditTrail) sections.push("Activity Logs");
  if (includes.recommendations) sections.push("Remediation Plan");

  return [...new Set(sections)];
}

export function defaultWatermark(classification?: string): ReportWatermark {
  return {
    enabled: true,
    text: (classification || "CONFIDENTIAL").toUpperCase(),
    opacity: 6,
    position: "Center",
    rotation: -35,
    fontSize: 64,
  };
}

export function builderToDraftInput(
  state: ReportBuilderState,
  meta: {
    preparedBy: string;
    userPosition: string;
    department: string;
    organizationName: string;
  }
): ReportDraftInput {
  const category = categoryForReportType(state.reportType);
  const period =
    state.filters.dateFrom && state.filters.dateTo
      ? {
          preset: "Custom Range" as const,
          startDate: state.filters.dateFrom,
          endDate: state.filters.dateTo,
          label: `${state.filters.dateFrom} – ${state.filters.dateTo}`,
        }
      : buildPeriodFromPreset("Last 30 Days");

  const frameworks =
    state.filters.framework && state.filters.framework !== "All"
      ? [state.filters.framework as ReportDraftInput["scope"]["frameworks"][number]]
      : (["All Frameworks"] as ReportDraftInput["scope"]["frameworks"]);

  const departments =
    state.filters.department && state.filters.department !== "All"
      ? [state.filters.department as ReportDraftInput["scope"]["departments"][number]]
      : (["All Departments"] as ReportDraftInput["scope"]["departments"]);

  const title = `${state.reportType} — ${period.label}`;

  return {
    category,
    enterpriseType: state.reportType,
    period,
    scope: {
      modules: [
        "Dashboard Overview",
        "Compliance",
        "Risk Assessment",
        "Identity & Access",
        "Business Continuity",
        "Disaster Recovery",
        "Security Operations",
        "AI Advisor Insights",
      ],
      frameworks,
      departments,
    },
    sections: sectionsForBuilder(
      state.reportType,
      state.includes,
      state.sectionToggles
    ),
    metadata: {
      title,
      description: `Enterprise ${state.reportType} generated from the GRCx Reporting Center.`,
      issueDate: new Date().toISOString().slice(0, 10),
      auditorName: meta.preparedBy,
      auditorRole: meta.userPosition,
      preparedBy: meta.preparedBy,
      approvedBy: "",
      organizationName: meta.organizationName,
      classification: state.classification,
      userPosition: meta.userPosition,
      department: meta.department || state.filters.department || "Enterprise GRC",
    },
    watermark: defaultWatermark(state.classification),
    filters: {
      businessUnit: state.filters.businessUnit,
      status: state.filters.status,
      riskLevel: state.filters.riskLevel,
      complianceStatus: state.filters.complianceStatus,
      owner: state.filters.owner,
    },
  };
}

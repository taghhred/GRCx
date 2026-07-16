import type {
  AggregatedReportContent,
  DetailedSectionId,
  ExecutiveSectionId,
  ReportDraftInput,
  ReportPreviewPage,
  ReportSection,
  ReportSectionId,
} from "../types/reports";
import { GOVERNANCE_KPIS, GOVERNANCE_POLICIES } from "../data/governanceData";
import { dashboardMock } from "../data/dashboardData";
import { assetComplianceData } from "../data/complianceData";
import { identityMonitoringData } from "../data/identityData";
import { riskManagementData } from "../data/riskData";
import { bcmDashboardData } from "../data/bcmData";
import { drDashboardData } from "../data/drpData";

function includesSection(
  selected: ReportSectionId[],
  id: ReportSectionId
): boolean {
  return selected.includes(id);
}

function tableSection(
  id: ReportSectionId,
  title: string,
  summary: string,
  columns: string[],
  rows: Array<Record<string, string>>
): ReportSection {
  return { id, title, summary, columns, rows };
}

function textSection(
  id: ReportSectionId,
  title: string,
  summary: string,
  bullets?: string[]
): ReportSection {
  return { id, title, summary, bullets };
}

function filterByDepartment<T extends { department?: string }>(
  items: T[],
  departments: ReportDraftInput["scope"]["departments"]
): T[] {
  if (
    departments.length === 0 ||
    departments.includes("All Departments")
  ) {
    return items;
  }
  return items.filter(
    (item) => item.department && departments.includes(item.department as never)
  );
}

function filterFrameworks(
  frameworks: string[],
  selected: ReportDraftInput["scope"]["frameworks"]
): string[] {
  if (selected.includes("All Frameworks") || selected.length === 0) {
    return frameworks;
  }
  return frameworks.filter((item) =>
    selected.some((framework) => framework === item || framework === "All Frameworks")
  );
}

function applyDraftFilters<T extends { department?: string; status?: string; riskLevel?: string; complianceStatus?: string; owner?: string; inherentRisk?: string; residualRisk?: string }>(
  items: T[],
  input: ReportDraftInput
): T[] {
  const f = input.filters;
  let result = items;

  if (
    input.scope.departments.length > 0 &&
    !input.scope.departments.includes("All Departments")
  ) {
    result = result.filter(
      (item) =>
        item.department &&
        input.scope.departments.includes(item.department as never)
    );
  }

  if (f?.status && f.status !== "All" && "status" in (result[0] ?? {})) {
    result = result.filter((item) => item.status === f.status);
  }

  if (f?.riskLevel && f.riskLevel !== "All") {
    result = result.filter(
      (item) =>
        item.riskLevel === f.riskLevel ||
        item.inherentRisk === f.riskLevel ||
        item.residualRisk === f.riskLevel
    );
  }

  if (f?.complianceStatus && f.complianceStatus !== "All" && "complianceStatus" in (result[0] ?? {})) {
    result = result.filter(
      (item) => item.complianceStatus === f.complianceStatus
    );
  }

  if (f?.owner && f.owner !== "All" && "owner" in (result[0] ?? {})) {
    result = result.filter((item) => item.owner === f.owner);
  }

  return result;
}

function buildExecutivePages(input: ReportDraftInput): ReportPreviewPage[] {
  const pages: ReportPreviewPage[] = [];
  const sections: ReportSection[] = [];
  const selected = input.sections as ExecutiveSectionId[];

  if (includesSection(selected, "Executive Summary")) {
    sections.push(
      textSection(
        "Executive Summary",
        "Executive Summary",
        `During ${input.period.label}, GRCx observed an overall risk posture of ${dashboardMock.overallRisk} with a compliance score of ${dashboardMock.complianceScore}%. This briefing highlights management-level movements across compliance, identity, risk, and resilience.`,
        [
          `${dashboardMock.metrics.find((m) => m.id === "violations")?.value ?? "—"} active violations require attention.`,
          `Regulatory coverage remains strongest on NCA ECC (${dashboardMock.regulatoryCoverage[0]?.coverage ?? "—"}%).`,
          "AI Advisor prioritizes privileged access and encryption remediation before the next attestation cycle.",
        ]
      )
    );
  }

  if (includesSection(selected, "Compliance Overview")) {
    const frameworks = filterFrameworks(
      dashboardMock.regulatoryCoverage.map((item) => item.framework),
      input.scope.frameworks
    );
    sections.push(
      tableSection(
        "Compliance Overview",
        "Compliance Overview",
        "High-level framework coverage for executive oversight.",
        ["Framework", "Coverage"],
        dashboardMock.regulatoryCoverage
          .filter((item) => frameworks.includes(item.framework))
          .map((item) => ({
            Framework: item.framework,
            Coverage: `${item.coverage}%`,
          }))
      )
    );
  }

  if (includesSection(selected, "Risk Overview")) {
    let cases = applyDraftFilters(riskManagementData.cases, input);
    if (input.filters?.riskLevel && input.filters.riskLevel !== "All") {
      cases = cases.filter(
        (item) =>
          item.inherentRisk === input.filters!.riskLevel ||
          item.residualRisk === input.filters!.riskLevel
      );
    }
    const critical = cases.filter(
      (item) => item.inherentRisk === "Critical" || item.residualRisk === "Critical"
    ).length;
    sections.push(
      textSection(
        "Risk Overview",
        "Top Risks",
        `${cases.length} active risk cases in scope. ${critical} at Critical severity. Overall enterprise risk: ${dashboardMock.overallRisk}.`,
        cases.slice(0, 5).map(
          (item) =>
            `${item.caseId}: ${item.title} — Residual ${item.residualRisk}`
        )
      )
    );
  }

  if (includesSection(selected, "Critical Violations")) {
    sections.push(
      tableSection(
        "Critical Violations",
        "Critical Violations",
        "Highest-priority security operations findings.",
        ["ID", "Title", "Identity", "Status"],
        dashboardMock.recentViolations
          .filter((item) => item.severity === "Critical")
          .map((item) => ({
            ID: item.id,
            Title: item.title,
            Identity: item.identity,
            Status: item.status,
          }))
      )
    );
  }

  if (includesSection(selected, "Identity Risks")) {
    const elevated = identityMonitoringData.identities.filter(
      (item) => item.riskLevel === "High" || item.riskLevel === "Critical"
    );
    sections.push(
      textSection(
        "Identity Risks",
        "Identity Risks",
        `${elevated.length} identities currently present elevated risk signals against behavioral baselines.`,
        elevated.slice(0, 4).map(
          (item) =>
            `${item.employee} (${item.department}) — ${item.riskLevel}: ${item.behaviorStatus}`
        )
      )
    );
  }

  if (includesSection(selected, "Business Continuity Readiness")) {
    const readinessKpi =
      bcmDashboardData.kpis.find((item) => item.id === "readiness")?.value ??
      "—";
    sections.push(
      textSection(
        "Business Continuity Readiness",
        "Business Continuity Readiness",
        `BCM readiness score stands at ${readinessKpi} with priority focus on overdue continuity exercises.`,
        bcmDashboardData.recommendations.slice(0, 3).map((item) => item.title)
      )
    );
  }

  if (includesSection(selected, "Disaster Recovery Readiness")) {
    const readinessKpi =
      drDashboardData.kpis.find((item) => item.id === "readiness")?.value ?? "—";
    sections.push(
      textSection(
        "Disaster Recovery Readiness",
        "Disaster Recovery Readiness",
        `DR readiness is ${readinessKpi}. Current dashboard tracks ${drDashboardData.tests.length} recovery tests.`,
        [
          "Confirm failover runbooks for Core Banking.",
          "Close overdue DR evidence packs before next board pack.",
        ]
      )
    );
  }

  if (includesSection(selected, "Top Recommendations")) {
    const recs = [
      ...bcmDashboardData.recommendations.slice(0, 2).map((r) => r.title),
      `Complete overdue DR failover testing (${drDashboardData.tests.filter((t) => t.result !== "Passed").length} tests need attention).`,
      `${dashboardMock.metrics.find((m) => m.id === "violations")?.value ?? "—"} violations require remediation before next attestation.`,
    ];
    sections.push(
      textSection(
        "Top Recommendations",
        "Recommendations",
        "Priority actions derived from live GRCx module data.",
        recs
      )
    );
  }

  if (includesSection(selected, "Charts")) {
    sections.push(
      tableSection(
        "Charts",
        "Trend Snapshot",
        "Severity movement across the selected period (tabular executive chart equivalent).",
        ["Date", "Critical", "High", "Medium", "Low"],
        dashboardMock.trend.map((item) => ({
          Date: item.date,
          Critical: String(item.critical),
          High: String(item.high),
          Medium: String(item.medium),
          Low: String(item.low),
        }))
      )
    );
  }

  if (includesSection(selected, "Management Conclusion")) {
    const publishedPolicies = GOVERNANCE_POLICIES.filter(
      (p) => p.policyStatus === "Published"
    ).length;
    sections.push(
      textSection(
        "Management Conclusion",
        "Governance & Management Conclusion",
        `${publishedPolicies} published policies govern the scoped environment. GRCx recommends maintaining board-level oversight on ${dashboardMock.overallRisk.toLowerCase()} residual exposure while compliance reaches ${dashboardMock.complianceScore}%.`,
        GOVERNANCE_KPIS.slice(0, 3).map(
          (kpi) => `${kpi.name}: ${kpi.currentValue}${kpi.unit === "Percentage" ? "%" : ""}`
        )
      )
    );
  }

  pages.push({
    pageNumber: 1,
    title: "Cover & Summary",
    sections: sections.slice(0, Math.ceil(sections.length / 2) || 1),
  });
  if (sections.length > 1) {
    pages.push({
      pageNumber: 2,
      title: "Executive Detail",
      sections: sections.slice(Math.ceil(sections.length / 2)),
    });
  }
  return pages.length > 0
    ? pages
    : [{ pageNumber: 1, title: "Cover", sections: [] }];
}

function buildDetailedPages(input: ReportDraftInput): ReportPreviewPage[] {
  const selected = input.sections as DetailedSectionId[];
  const pages: ReportPreviewPage[] = [];
  const chunk: ReportSection[] = [];

  if (includesSection(selected, "Full Findings")) {
    chunk.push(
      textSection(
        "Full Findings",
        "Full Findings",
        "Consolidated technical findings across scoped modules for auditor review.",
        [
          `${assetComplianceData.assets.filter((a) => a.complianceStatus === "Non-Compliant").length} non-compliant assets.`,
          `${riskManagementData.cases.filter((c) => c.status !== "Closed").length} open or in-progress risk cases.`,
          `${identityMonitoringData.identities.filter((i) => i.behaviorStatus !== "Normal" && i.behaviorStatus !== "Baseline Matched").length} identity monitoring anomalies.`,
        ]
      )
    );
  }

  if (includesSection(selected, "Asset Compliance Table")) {
    let assets = assetComplianceData.assets;
    assets = filterByDepartment(assets, input.scope.departments);
    if (!input.scope.frameworks.includes("All Frameworks")) {
      assets = assets.filter((asset) =>
        input.scope.frameworks.includes(asset.framework as never)
      );
    }
    chunk.push(
      tableSection(
        "Asset Compliance Table",
        "Asset Compliance Table",
        "Asset inventory compliance posture within selected scope.",
        ["Asset", "Type", "Framework", "Status", "Failed Control", "Owner"],
        assets.slice(0, 12).map((asset) => ({
          Asset: asset.name,
          Type: asset.assetType,
          Framework: asset.framework,
          Status: asset.complianceStatus,
          "Failed Control": asset.failedControlId,
          Owner: asset.owner,
        }))
      )
    );
  }

  if (includesSection(selected, "Identity Monitoring Table")) {
    let identities = identityMonitoringData.identities;
    identities = filterByDepartment(identities, input.scope.departments);
    chunk.push(
      tableSection(
        "Identity Monitoring Table",
        "Identity Monitoring Table",
        "Identity and access monitoring records with behavioral status.",
        ["Identity", "Department", "Risk", "Status", "Last Login"],
        identities.slice(0, 12).map((item) => ({
          Identity: item.employee,
          Department: item.department,
          Risk: item.riskLevel,
          Status: item.behaviorStatus,
          "Last Login": item.lastLogin,
        }))
      )
    );
  }

  if (includesSection(selected, "Risk Cases")) {
    let cases = riskManagementData.cases;
    cases = filterByDepartment(cases, input.scope.departments);
    chunk.push(
      tableSection(
        "Risk Cases",
        "Risk Cases",
        "Risk case register excerpt for the reporting period.",
        ["Case ID", "Title", "Owner", "Inherent", "Residual", "Status"],
        cases.map((item) => ({
          "Case ID": item.caseId,
          Title: item.title,
          Owner: item.owner,
          Inherent: item.inherentRisk,
          Residual: item.residualRisk,
          Status: item.status,
        }))
      )
    );
  }

  if (includesSection(selected, "Risk Assessment Calculations")) {
    const sample = riskManagementData.cases[0];
    chunk.push(
      tableSection(
        "Risk Assessment Calculations",
        "Risk Assessment Calculations",
        sample
          ? `Example calculation for ${sample.caseId} using Likelihood × Impact.`
          : "No risk calculations available.",
        ["Metric", "Value"],
        sample
          ? [
              { Metric: "Likelihood", Value: `${sample.assessment.likelihood}/5` },
              { Metric: "Impact", Value: `${sample.assessment.impact}/5` },
              {
                Metric: "Inherent Score",
                Value: `${sample.assessment.inherentScore}/25 (${sample.assessment.inherentLevel})`,
              },
              {
                Metric: "Control Effectiveness",
                Value: `${sample.assessment.controlEffectivenessPercent}%`,
              },
              {
                Metric: "Residual Score",
                Value: `${sample.assessment.residualScore}/25 (${sample.assessment.residualLevel})`,
              },
            ]
          : []
      )
    );
  }

  if (includesSection(selected, "Evidence Register")) {
    const evidence = riskManagementData.cases.flatMap((item) =>
      item.evidence.map((ev) => ({
        ...ev,
        caseId: item.caseId,
      }))
    );
    chunk.push(
      tableSection(
        "Evidence Register",
        "Evidence Register",
        "Evidence linked to scoped risk cases.",
        ["Evidence ID", "Name", "Case", "Status", "Uploaded By"],
        evidence.slice(0, 10).map((item) => ({
          "Evidence ID": item.id,
          Name: item.name,
          Case: item.caseId,
          Status: item.verificationStatus,
          "Uploaded By": item.uploadedBy,
        }))
      )
    );
  }

  if (includesSection(selected, "Control Mapping")) {
    const controls = riskManagementData.cases.flatMap((item) =>
      item.controls.map((ctl) => ({ ...ctl, caseId: item.caseId }))
    );
    chunk.push(
      tableSection(
        "Control Mapping",
        "Control Mapping",
        "Controls mapped to risk cases and frameworks.",
        ["Control ID", "Framework", "Name", "Result", "Case"],
        controls.slice(0, 10).map((item) => ({
          "Control ID": item.id,
          Framework: item.framework,
          Name: item.name,
          Result: item.result,
          Case: item.caseId,
        }))
      )
    );
  }

  if (includesSection(selected, "Remediation Plan")) {
    const tasks = riskManagementData.cases.flatMap((item) =>
      item.remediation.map((task) => ({ ...task, caseId: item.caseId }))
    );
    chunk.push(
      tableSection(
        "Remediation Plan",
        "Remediation Plan",
        "Open remediation actions with owners and due dates.",
        ["Task", "Case", "Owner", "Due", "Status"],
        tasks.map((item) => ({
          Task: item.action,
          Case: item.caseId,
          Owner: item.owner,
          Due: item.dueDate,
          Status: item.status,
        }))
      )
    );
  }

  if (includesSection(selected, "BCM Details")) {
    chunk.push(
      textSection(
        "BCM Details",
        "BCM Details",
        "Business continuity processes and readiness notes pulled from the BCM module.",
        bcmDashboardData.processes.slice(0, 5).map(
          (process) =>
            `${process.name} — ${process.criticality} / ${process.status}`
        )
      )
    );
  }

  if (includesSection(selected, "DR Details")) {
    chunk.push(
      textSection(
        "DR Details",
        "DR Details",
        "Disaster recovery test and system posture details.",
        drDashboardData.tests.slice(0, 5).map(
          (test) => `${test.name} — ${test.result} (${test.lastTest})`
        )
      )
    );
  }

  if (includesSection(selected, "Activity Logs")) {
    const activities = riskManagementData.cases.flatMap((item) =>
      item.activityLog.map((act) => ({ ...act, caseId: item.caseId }))
    );
    chunk.push(
      tableSection(
        "Activity Logs",
        "Activity Logs",
        "Selected case activity timeline entries.",
        ["Timestamp", "Actor", "Action", "Case"],
        activities.slice(0, 12).map((item) => ({
          Timestamp: item.timestamp,
          Actor: item.actor,
          Action: item.action,
          Case: item.caseId,
        }))
      )
    );
  }

  if (includesSection(selected, "Auditor Notes")) {
    chunk.push(
      textSection(
        "Auditor Notes",
        "Auditor Notes",
        `Review notes for ${input.period.label}. Evidence packages were validated against scoped controls and frameworks.`,
        [
          `${GOVERNANCE_POLICIES.length} governance policies in catalog; ${GOVERNANCE_POLICIES.filter((p) => p.approvalStatus === "Approved").length} approved.`,
          `Compliance posture: ${dashboardMock.complianceScore}% across monitored frameworks.`,
        ]
      )
    );
  }

  if (includesSection(selected, "Appendices")) {
    chunk.push(
      textSection(
        "Appendices",
        "Appendices",
        "Reference listings and methodology notes.",
        [
          "Risk methodology: Inherent = Likelihood × Impact; Residual = Residual Likelihood × Residual Impact.",
          "Data sources: Asset Compliance, Identity Monitoring, Risk Assessment, BCM, DR, Dashboard mocks.",
          `Classification: ${input.metadata.classification}`,
        ]
      )
    );
  }

  const size = 2;
  for (let i = 0; i < chunk.length; i += size) {
    pages.push({
      pageNumber: pages.length + 1,
      title: chunk[i]?.title ?? `Section ${pages.length + 1}`,
      sections: chunk.slice(i, i + size),
    });
  }

  return pages.length > 0
    ? pages
    : [{ pageNumber: 1, title: "Detailed Report", sections: [] }];
}

export function aggregateReportContent(
  input: ReportDraftInput
): AggregatedReportContent {
  const pages =
    input.category === "Executive"
      ? buildExecutivePages(input)
      : buildDetailedPages(input);

  const nonCompliant = assetComplianceData.assets.filter(
    (item) => item.complianceStatus === "Non-Compliant"
  ).length;

  const bcmRecs = bcmDashboardData.recommendations.map((r) => r.title);
  const failedDrTests = drDashboardData.tests.filter((t) => t.result !== "Passed").length;

  return {
    pages,
    pageCount: Math.max(pages.length, 1),
    executiveNarrative: `During ${input.period.label}, enterprise risk is ${dashboardMock.overallRisk} with ${dashboardMock.complianceScore}% compliance. ${nonCompliant} assets are non-compliant; ${riskManagementData.cases.length} risk cases are active across the register.`,
    keyRecommendations: [
      ...bcmRecs.slice(0, 2),
      ...(failedDrTests > 0
        ? [`Address ${failedDrTests} DR test gaps and update recovery evidence.`]
        : []),
      "Close Critical privileged-access and encryption gaps before the next audit cycle.",
    ],
    summaryMetrics: [
      { label: "Overall Risk Score", value: dashboardMock.overallRisk },
      {
        label: "Compliance Percentage",
        value: `${dashboardMock.complianceScore}%`,
      },
      {
        label: "Active Violations",
        value:
          dashboardMock.metrics.find((item) => item.id === "violations")
            ?.value ?? "—",
      },
      {
        label: "Risk Cases",
        value: String(riskManagementData.cases.length),
      },
    ],
  };
}

import { FileBarChart, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { useComplianceModule } from "../../../services/compliance/ComplianceModuleContext";
import Button from "../../common/Button";
import { excelFilename, exportTableToXlsx } from "../../../services/excelExportService";
import styles from "../Compliance.module.css";

export default function ComplianceReportsSection() {
  const { register, assessments, evidence, findings, frameworks, stats, setNotice } =
    useComplianceModule();

  function exportRegisterSummary() {
    exportTableToXlsx({
      filename: excelFilename("Compliance_Register_Report"),
      sheetName: "Register",
      columns: [
        { key: "complianceId", header: "Compliance ID" },
        { key: "framework", header: "Framework" },
        { key: "controlName", header: "Control Name" },
        { key: "status", header: "Status" },
        { key: "complianceScore", header: "Score %" },
        { key: "riskLevel", header: "Risk Level" },
        { key: "department", header: "Department" },
        { key: "owner", header: "Owner" },
      ],
      rows: register.map((r) => ({
        complianceId: r.complianceId,
        framework: r.framework,
        controlName: r.controlName,
        status: r.status,
        complianceScore: r.complianceScore,
        riskLevel: r.riskLevel,
        department: r.department,
        owner: r.owner,
      })),
      exportInfo: [
        { label: "Overall compliance", value: `${stats.overallCompliancePercent}%` },
        { label: "Passed", value: String(stats.passedControls) },
        { label: "Failed", value: String(stats.failedControls) },
      ],
    });
    setNotice("Generated Compliance Register report.");
  }

  function exportFindingsPack() {
    exportTableToXlsx({
      filename: excelFilename("Compliance_Findings_Report"),
      sheetName: "Findings",
      columns: [
        { key: "findingId", header: "Finding ID" },
        { key: "framework", header: "Framework" },
        { key: "severity", header: "Severity" },
        { key: "description", header: "Description" },
        { key: "recommendation", header: "Recommendation" },
        { key: "targetDate", header: "Target Date" },
        { key: "status", header: "Status" },
        { key: "source", header: "Source" },
      ],
      rows: findings.map((f) => ({
        findingId: f.findingId,
        framework: f.framework,
        severity: f.severity,
        description: f.description,
        recommendation: f.recommendation,
        targetDate: f.targetDate,
        status: f.status,
        source: f.source,
      })),
      exportInfo: [{ label: "Open findings", value: String(findings.length) }],
    });
    setNotice("Generated Findings report.");
  }

  function exportFrameworkScorecard() {
    exportTableToXlsx({
      filename: excelFilename("Compliance_Framework_Scorecard"),
      sheetName: "Frameworks",
      columns: [
        { key: "name", header: "Framework" },
        { key: "compliancePercent", header: "Compliance %" },
        { key: "mappedControls", header: "Mapped Controls" },
        { key: "passedControls", header: "Passed" },
        { key: "failedControls", header: "Failed" },
        { key: "evidenceCount", header: "Evidence" },
        { key: "findingsCount", header: "Findings" },
      ],
      rows: frameworks.map((f) => ({
        name: f.name,
        compliancePercent: f.compliancePercent,
        mappedControls: f.mappedControls,
        passedControls: f.passedControls,
        failedControls: f.failedControls,
        evidenceCount: f.evidenceCount,
        findingsCount: f.findingsCount,
      })),
      exportInfo: [
        { label: "Assessments", value: String(assessments.length) },
        { label: "Evidence", value: String(evidence.length) },
      ],
    });
    setNotice("Generated Framework Scorecard.");
  }

  const tiles = [
    {
      id: "register",
      title: "Register Summary",
      description: `Export ${register.length} control rows with current status and scores.`,
      icon: FileSpreadsheet,
      action: exportRegisterSummary,
    },
    {
      id: "findings",
      title: "Findings Pack",
      description: `Export ${findings.length} derived findings for remediation tracking.`,
      icon: FileBarChart,
      action: exportFindingsPack,
    },
    {
      id: "frameworks",
      title: "Framework Scorecard",
      description: `Export ${frameworks.length} framework posture cards for leadership review.`,
      icon: ShieldCheck,
      action: exportFrameworkScorecard,
    },
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Compliance report generation</h3>
        <p className={styles.panelSub}>
          Generate Excel deliverables from the live portfolio. Analytics remain on the Compliance
          Dashboard — this page only produces export packs.
        </p>
        <div className={styles.grid3}>
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.id} className={styles.panel} style={{ margin: 0, boxShadow: "none" }}>
                <div className={styles.panelHeaderRow}>
                  <div>
                    <h4 className={styles.panelTitle}>
                      <Icon size={18} aria-hidden style={{ marginRight: 8, verticalAlign: -3 }} />
                      {tile.title}
                    </h4>
                    <p className={styles.panelSub}>{tile.description}</p>
                  </div>
                </div>
                <Button type="button" variant="primary" onClick={tile.action}>
                  Generate Excel
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

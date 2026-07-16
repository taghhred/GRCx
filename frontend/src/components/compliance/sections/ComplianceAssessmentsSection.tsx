// @ts-nocheck
import { useMemo, useState } from "react";
import { useComplianceModule } from "../../../services/compliance/ComplianceModuleContext";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";
import ComplianceFilterBar, {
  EMPTY_COMPLIANCE_FILTERS,
  type ComplianceFilterValues,
} from "../ComplianceFilterBar";
import ComplianceQuickActions from "../ComplianceQuickActions";
import ComplianceRecordDrawer from "../ComplianceRecordDrawer";
import { excelFilename, exportTableToXlsx } from "../../../services/excelExportService";
import {
  complianceStatusTone,
  formatDate,
  fmtScore,
  isOverdueReview,
  uniqueSorted,
} from "./complianceSectionUtils";
import styles from "../Compliance.module.css";

export default function ComplianceAssessmentsSection() {
  const {
    assessments,
    loading,
    selectedId,
    selectedType,
    setSelection,
    importFiles,
    refreshFromFolder,
    setNotice,
  } = useComplianceModule();
  const [filters, setFilters] = useState<ComplianceFilterValues>(EMPTY_COMPLIANCE_FILTERS);
  const [importing, setImporting] = useState(false);

  const options = useMemo(
    () => ({
      frameworks: uniqueSorted(assessments.map((a) => a.framework)),
      departments: uniqueSorted(assessments.map((a) => a.department)),
      businessUnits: [],
      statuses: uniqueSorted([
        ...assessments.map((a) => a.result),
        ...assessments.map((a) => a.approvalStatus),
      ]),
      assessmentStatuses: uniqueSorted(assessments.map((a) => a.result)),
      riskLevels: [],
      evidenceStatuses: [],
      owners: uniqueSorted(assessments.map((a) => a.assessor)),
    }),
    [assessments]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return assessments.filter((a) => {
      const matchesQuery =
        q.length === 0 ||
        a.assessmentId.toLowerCase().includes(q) ||
        a.complianceId.toLowerCase().includes(q) ||
        a.controlId.toLowerCase().includes(q) ||
        a.gap.toLowerCase().includes(q) ||
        a.recommendation.toLowerCase().includes(q);
      const assessed = a.assessmentDate || "";
      const target = a.targetCompletion || "";
      const inDateRange =
        (!filters.dateFrom && !filters.dateTo) ||
        [assessed, target].some((d) => {
          if (!d) return false;
          if (filters.dateFrom && d < filters.dateFrom) return false;
          if (filters.dateTo && d > filters.dateTo) return false;
          return true;
        });
      return (
        matchesQuery &&
        (filters.framework === "All" || a.framework === filters.framework) &&
        (filters.department === "All" || a.department === filters.department) &&
        (filters.status === "All" ||
          a.result === filters.status ||
          a.approvalStatus === filters.status) &&
        (filters.assessmentStatus === "All" || a.result === filters.assessmentStatus) &&
        (filters.owner === "All" || a.assessor === filters.owner) &&
        (!filters.overdueOnly || isOverdueReview(a.targetCompletion)) &&
        inDateRange
      );
    });
  }, [assessments, filters]);

  async function handleImport(files: FileList) {
    setImporting(true);
    try {
      await importFiles(files);
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    exportTableToXlsx({
      filename: excelFilename("Compliance_Assessments"),
      sheetName: "Compliance Assessment",
      columns: [
        { key: "assessmentId", header: "Assessment ID" },
        { key: "complianceId", header: "Compliance ID" },
        { key: "framework", header: "Framework" },
        { key: "controlId", header: "Control ID" },
        { key: "assessmentDate", header: "Assessment Date" },
        { key: "assessor", header: "Assessor" },
        { key: "department", header: "Department" },
        { key: "result", header: "Assessment Result" },
        { key: "compliancePercent", header: "Compliance %" },
        { key: "gap", header: "Gap Identified" },
        { key: "recommendation", header: "Recommendation" },
        { key: "targetCompletion", header: "Target Completion" },
        { key: "approvalStatus", header: "Approval Status" },
        { key: "approvedBy", header: "Approved By" },
        { key: "comments", header: "Comments" },
      ],
      rows: filtered.map((a) => ({
        assessmentId: a.assessmentId,
        complianceId: a.complianceId,
        framework: a.framework,
        controlId: a.controlId,
        assessmentDate: a.assessmentDate,
        assessor: a.assessor,
        department: a.department,
        result: a.result,
        compliancePercent: a.compliancePercent,
        gap: a.gap,
        recommendation: a.recommendation,
        targetCompletion: a.targetCompletion,
        approvalStatus: a.approvalStatus,
        approvedBy: a.approvedBy,
        comments: a.comments,
      })),
      exportInfo: [{ label: "Rows", value: String(filtered.length) }],
    });
    setNotice(`Exported ${filtered.length} assessment(s).`);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.registerToolbarCard}>
        <ComplianceQuickActions
          onNewAssessment={() =>
            setNotice("Import an Assessment workbook to add new assessment records to the portfolio.")
          }
          onImport={handleImport}
          onExport={handleExport}
          onRefresh={() => void refreshFromFolder()}
          importing={importing}
          refreshing={loading}
        />
        <ComplianceFilterBar
          values={filters}
          options={options}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onClear={() => setFilters(EMPTY_COMPLIANCE_FILTERS)}
          showBusinessUnit={false}
          showRiskLevel={false}
          showAssessmentStatus
          showEvidenceStatus={false}
          showDateRange
          searchPlaceholder="Search assessmentsâ€¦"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No assessments"
          description="Import a Compliance Assessment workbook to populate assessment history."
        />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Assessment ID</th>
                  <th>Control / Framework</th>
                  <th>Result</th>
                  <th>Compliance %</th>
                  <th>Assessor</th>
                  <th>Approval</th>
                  <th>Date</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.assessmentId}
                    onClick={() => setSelection(a.assessmentId, "assessment")}
                  >
                    <td>
                      <strong className={styles.riskIdCell}>{a.assessmentId}</strong>
                      <div className={styles.listMeta}>{a.complianceId || "â€”"}</div>
                    </td>
                    <td>
                      <div>{a.controlId || "â€”"}</div>
                      <div className={styles.listMeta}>{a.framework || "â€”"}</div>
                    </td>
                    <td>
                      <StatusBadge label={a.result || "â€”"} tone={complianceStatusTone(a.result)} />
                    </td>
                    <td>
                      <span className={styles.scoreCell}>{fmtScore(a.compliancePercent)}</span>
                    </td>
                    <td>{a.assessor || "â€”"}</td>
                    <td>
                      <StatusBadge
                        label={a.approvalStatus || "Pending"}
                        tone={complianceStatusTone(a.approvalStatus)}
                      />
                    </td>
                    <td>{formatDate(a.assessmentDate)}</td>
                    <td
                      style={
                        isOverdueReview(a.targetCompletion)
                          ? { color: "var(--color-danger)", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {formatDate(a.targetCompletion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ComplianceRecordDrawer
        open={Boolean(selectedId && selectedType === "assessment")}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}


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
  isOverdueReview,
  uniqueSorted,
} from "./complianceSectionUtils";
import styles from "../Compliance.module.css";

export default function ComplianceEvidenceSection() {
  const {
    evidence,
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
      frameworks: uniqueSorted(evidence.map((e) => e.framework)),
      departments: uniqueSorted(evidence.map((e) => e.department)),
      businessUnits: [],
      statuses: uniqueSorted(evidence.map((e) => e.reviewStatus)),
      assessmentStatuses: [],
      riskLevels: [],
      evidenceStatuses: uniqueSorted(evidence.map((e) => e.reviewStatus)),
      owners: uniqueSorted(evidence.map((e) => e.uploadedBy || e.owner)),
    }),
    [evidence]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return evidence.filter((e) => {
      const matchesQuery =
        q.length === 0 ||
        e.evidenceId.toLowerCase().includes(q) ||
        e.evidenceName.toLowerCase().includes(q) ||
        e.fileName.toLowerCase().includes(q) ||
        e.complianceId.toLowerCase().includes(q) ||
        e.controlId.toLowerCase().includes(q);
      const upload = e.uploadDate || "";
      const expiry = e.expiryDate || "";
      const inDateRange =
        (!filters.dateFrom && !filters.dateTo) ||
        [upload, expiry].some((d) => {
          if (!d) return false;
          if (filters.dateFrom && d < filters.dateFrom) return false;
          if (filters.dateTo && d > filters.dateTo) return false;
          return true;
        });
      return (
        matchesQuery &&
        (filters.framework === "All" || e.framework === filters.framework) &&
        (filters.department === "All" || e.department === filters.department) &&
        (filters.status === "All" || e.reviewStatus === filters.status) &&
        (filters.evidenceStatus === "All" || e.reviewStatus === filters.evidenceStatus) &&
        (filters.owner === "All" ||
          e.uploadedBy === filters.owner ||
          e.owner === filters.owner) &&
        (!filters.overdueOnly || isOverdueReview(e.expiryDate)) &&
        inDateRange
      );
    });
  }, [evidence, filters]);

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
      filename: excelFilename("Compliance_Evidence"),
      sheetName: "Compliance Evidence",
      columns: [
        { key: "evidenceId", header: "Evidence ID" },
        { key: "complianceId", header: "Compliance ID" },
        { key: "controlId", header: "Control ID" },
        { key: "evidenceType", header: "Evidence Type" },
        { key: "evidenceName", header: "Evidence Name" },
        { key: "uploadedBy", header: "Uploaded By" },
        { key: "uploadDate", header: "Upload Date" },
        { key: "reviewStatus", header: "Review Status" },
        { key: "reviewer", header: "Reviewer" },
        { key: "fileName", header: "File Name" },
        { key: "version", header: "Version" },
        { key: "expiryDate", header: "Expiry Date" },
        { key: "framework", header: "Related Framework" },
        { key: "department", header: "Department" },
        { key: "comments", header: "Comments" },
      ],
      rows: filtered.map((e) => ({
        evidenceId: e.evidenceId,
        complianceId: e.complianceId,
        controlId: e.controlId,
        evidenceType: e.evidenceType,
        evidenceName: e.evidenceName,
        uploadedBy: e.uploadedBy,
        uploadDate: e.uploadDate,
        reviewStatus: e.reviewStatus,
        reviewer: e.reviewer,
        fileName: e.fileName,
        version: e.version,
        expiryDate: e.expiryDate,
        framework: e.framework,
        department: e.department,
        comments: e.comments,
      })),
      exportInfo: [{ label: "Rows", value: String(filtered.length) }],
    });
    setNotice(`Exported ${filtered.length} evidence row(s).`);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.registerToolbarCard}>
        <ComplianceQuickActions
          onUploadEvidence={() =>
            setNotice("Select an Excel evidence workbook via Import to add portfolio evidence records.")
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
          showAssessmentStatus={false}
          showEvidenceStatus
          showDateRange
          searchPlaceholder="Search evidenceâ€¦"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No evidence records"
          description="Import a Compliance Evidence workbook to populate this inventory."
        />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Evidence ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Framework</th>
                  <th>Review</th>
                  <th>Uploaded</th>
                  <th>Expiry</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.evidenceId} onClick={() => setSelection(e.evidenceId, "evidence")}>
                    <td>
                      <strong className={styles.riskIdCell}>{e.evidenceId}</strong>
                    </td>
                    <td>
                      <div>{e.evidenceName || e.fileName || "â€”"}</div>
                      <div className={styles.listMeta}>
                        {e.fileName || "â€”"} آ· v{e.version || "â€”"}
                      </div>
                    </td>
                    <td>{e.evidenceType || "â€”"}</td>
                    <td>{e.framework || "â€”"}</td>
                    <td>
                      <StatusBadge
                        label={e.reviewStatus || "Pending"}
                        tone={complianceStatusTone(e.reviewStatus)}
                      />
                    </td>
                    <td>
                      {formatDate(e.uploadDate)}
                      <div className={styles.listMeta}>{e.uploadedBy || "â€”"}</div>
                    </td>
                    <td
                      style={
                        isOverdueReview(e.expiryDate)
                          ? { color: "var(--color-danger)", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {formatDate(e.expiryDate)}
                    </td>
                    <td>{e.department || "â€”"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ComplianceRecordDrawer
        open={Boolean(selectedId && selectedType === "evidence")}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}


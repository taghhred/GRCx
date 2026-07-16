// @ts-nocheck
import { useMemo, useState } from "react";
import { useComplianceModule } from "../../../services/compliance/ComplianceModuleContext";
import StatusBadge from "../../ui/StatusBadge";
import SeverityBadge from "../../ui/SeverityBadge";
import EmptyState from "../../ui/EmptyState";
import ComplianceFilterBar, {
  EMPTY_COMPLIANCE_FILTERS,
  type ComplianceFilterValues,
} from "../ComplianceFilterBar";
import ComplianceQuickActions from "../ComplianceQuickActions";
import ComplianceRecordDrawer from "../ComplianceRecordDrawer";
import { excelFilename, exportTableToXlsx } from "../../../services/excelExportService";
import {
  asSeverity,
  complianceStatusTone,
  formatDate,
  uniqueSorted,
} from "./complianceSectionUtils";
import styles from "../Compliance.module.css";

export default function ComplianceFindingsSection() {
  const {
    findings,
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
      frameworks: uniqueSorted(findings.map((f) => f.framework)),
      departments: uniqueSorted(findings.map((f) => f.department)),
      businessUnits: [],
      statuses: uniqueSorted(findings.map((f) => f.status)),
      assessmentStatuses: [],
      riskLevels: uniqueSorted(findings.map((f) => f.severity)),
      evidenceStatuses: uniqueSorted(findings.map((f) => f.evidenceStatus)),
      owners: uniqueSorted(findings.map((f) => f.owner)),
    }),
    [findings]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return findings.filter((f) => {
      const matchesQuery =
        q.length === 0 ||
        f.findingId.toLowerCase().includes(q) ||
        f.complianceId.toLowerCase().includes(q) ||
        f.controlId.toLowerCase().includes(q) ||
        f.controlName.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q);
      const target = f.targetDate || "";
      const inDateRange =
        (!filters.dateFrom || (target && target >= filters.dateFrom)) &&
        (!filters.dateTo || (target && target <= filters.dateTo));
      return (
        matchesQuery &&
        (filters.framework === "All" || f.framework === filters.framework) &&
        (filters.department === "All" || f.department === filters.department) &&
        (filters.status === "All" || f.status === filters.status) &&
        (filters.evidenceStatus === "All" || f.evidenceStatus === filters.evidenceStatus) &&
        (filters.riskLevel === "All" || f.severity === filters.riskLevel) &&
        (filters.owner === "All" || f.owner === filters.owner) &&
        ((!filters.dateFrom && !filters.dateTo) || inDateRange)
      );
    });
  }, [findings, filters]);

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
      filename: excelFilename("Compliance_Findings"),
      sheetName: "Findings",
      columns: [
        { key: "findingId", header: "Finding ID" },
        { key: "complianceId", header: "Compliance ID" },
        { key: "controlId", header: "Control ID" },
        { key: "controlName", header: "Control Name" },
        { key: "framework", header: "Framework" },
        { key: "description", header: "Description" },
        { key: "severity", header: "Severity" },
        { key: "department", header: "Department" },
        { key: "owner", header: "Owner" },
        { key: "recommendation", header: "Recommendation" },
        { key: "targetDate", header: "Target Date" },
        { key: "status", header: "Status" },
        { key: "source", header: "Source" },
      ],
      rows: filtered.map((f) => ({
        findingId: f.findingId,
        complianceId: f.complianceId,
        controlId: f.controlId,
        controlName: f.controlName,
        framework: f.framework,
        description: f.description,
        severity: f.severity,
        department: f.department,
        owner: f.owner,
        recommendation: f.recommendation,
        targetDate: f.targetDate,
        status: f.status,
        source: f.source,
      })),
      exportInfo: [{ label: "Rows", value: String(filtered.length) }],
    });
    setNotice(`Exported ${filtered.length} finding(s).`);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.registerToolbarCard}>
        <ComplianceQuickActions
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
          showOverdue={false}
          showAssessmentStatus={false}
          showEvidenceStatus
          showDateRange
          searchPlaceholder="Search findingsâ€¦"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No findings"
          description="Findings are derived from non-compliant register rows and assessment gaps."
        />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Finding ID</th>
                  <th>Control</th>
                  <th>Framework</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Target</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.findingId} onClick={() => setSelection(f.findingId, "finding")}>
                    <td>
                      <strong className={styles.riskIdCell}>{f.findingId}</strong>
                    </td>
                    <td>
                      <div>{f.controlName || f.controlId || "â€”"}</div>
                      <div className={styles.listMeta}>{f.description || "â€”"}</div>
                    </td>
                    <td>{f.framework || "â€”"}</td>
                    <td>
                      <SeverityBadge severity={asSeverity(f.severity)} />
                    </td>
                    <td>
                      <StatusBadge label={f.status || "Open"} tone={complianceStatusTone(f.status)} />
                    </td>
                    <td>{f.owner || "â€”"}</td>
                    <td>{formatDate(f.targetDate)}</td>
                    <td>{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ComplianceRecordDrawer
        open={Boolean(selectedId && selectedType === "finding")}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}


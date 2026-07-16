// @ts-nocheck
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useComplianceModule } from "../../../services/compliance/ComplianceModuleContext";
import {
  COMPLIANCE_RISK_LEVELS,
  COMPLIANCE_STATUSES,
} from "../../../mocks/types/complianceManagement";
import Button from "../../common/Button";
import StatusBadge from "../../ui/StatusBadge";
import SeverityBadge from "../../ui/SeverityBadge";
import EmptyState from "../../ui/EmptyState";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
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
  fmtScore,
  isOverdueReview,
  uniqueSorted,
} from "./complianceSectionUtils";
import styles from "../Compliance.module.css";

const PAGE_SIZE = 25;
const SAVED_VIEW_KEY = "grcx.compliance.register.savedView";

const EXPORT_COLUMNS = [
  { key: "complianceId", header: "Compliance ID" },
  { key: "framework", header: "Framework" },
  { key: "controlId", header: "Control ID" },
  { key: "controlName", header: "Control Name" },
  { key: "businessUnit", header: "Business Unit" },
  { key: "department", header: "Department" },
  { key: "owner", header: "Control Owner" },
  { key: "status", header: "Status" },
  { key: "assessmentStatus", header: "Assessment Status" },
  { key: "complianceScore", header: "Compliance Score %" },
  { key: "riskLevel", header: "Risk Level" },
  { key: "findingSeverity", header: "Finding Severity" },
  { key: "evidenceRequired", header: "Evidence Required" },
  { key: "evidenceStatus", header: "Evidence Status" },
  { key: "lastAssessment", header: "Last Assessment" },
  { key: "nextReview", header: "Next Review" },
  { key: "auditor", header: "Auditor" },
  { key: "priority", header: "Priority" },
  { key: "dueDate", header: "Due Date" },
  { key: "notes", header: "Notes" },
];

function matchesDateRange(
  dateFrom: string,
  dateTo: string,
  ...candidates: Array<string | null | undefined>
): boolean {
  if (!dateFrom && !dateTo) return true;
  const dates = candidates.filter((d): d is string => Boolean(d && d.trim()));
  if (dates.length === 0) return false;
  return dates.some((d) => {
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });
}

function loadSavedView(): ComplianceFilterValues | null {
  try {
    const raw = localStorage.getItem(SAVED_VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ComplianceFilterValues>;
    return { ...EMPTY_COMPLIANCE_FILTERS, ...parsed };
  } catch {
    return null;
  }
}

export default function ComplianceRegisterSection() {
  const navigate = useNavigate();
  const {
    register,
    loading,
    selectedId,
    selectedType,
    setSelection,
    importFiles,
    refreshFromFolder,
    setNotice,
  } = useComplianceModule();

  const [filters, setFilters] = useState<ComplianceFilterValues>(
    () => loadSavedView() ?? EMPTY_COMPLIANCE_FILTERS
  );
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const options = useMemo(
    () => ({
      frameworks: uniqueSorted(register.map((r) => r.framework)),
      departments: uniqueSorted(register.map((r) => r.department)),
      businessUnits: uniqueSorted(register.map((r) => r.businessUnit)),
      statuses: uniqueSorted([...COMPLIANCE_STATUSES, ...register.map((r) => r.status)]),
      assessmentStatuses: uniqueSorted(register.map((r) => r.assessmentStatus)),
      riskLevels: uniqueSorted([...COMPLIANCE_RISK_LEVELS, ...register.map((r) => r.riskLevel)]),
      evidenceStatuses: uniqueSorted(register.map((r) => r.evidenceStatus)),
      owners: uniqueSorted(register.map((r) => r.owner)),
    }),
    [register]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return register.filter((r) => {
      const matchesQuery =
        q.length === 0 ||
        r.complianceId.toLowerCase().includes(q) ||
        r.controlId.toLowerCase().includes(q) ||
        r.controlName.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.framework.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q);
      return (
        matchesQuery &&
        (filters.framework === "All" || r.framework === filters.framework) &&
        (filters.department === "All" || r.department === filters.department) &&
        (filters.businessUnit === "All" || r.businessUnit === filters.businessUnit) &&
        (filters.status === "All" || r.status === filters.status) &&
        (filters.assessmentStatus === "All" || r.assessmentStatus === filters.assessmentStatus) &&
        (filters.riskLevel === "All" || r.riskLevel === filters.riskLevel) &&
        (filters.evidenceStatus === "All" || r.evidenceStatus === filters.evidenceStatus) &&
        (filters.owner === "All" || r.owner === filters.owner) &&
        (!filters.overdueOnly || isOverdueReview(r.nextReview)) &&
        matchesDateRange(filters.dateFrom, filters.dateTo, r.nextReview, r.lastAssessment)
      );
    });
  }, [register, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function patchFilters(patch: Partial<ComplianceFilterValues>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function handleSaveView() {
    try {
      localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(filters));
      setNotice("Saved and applied Compliance Register view.");
    } catch {
      setNotice("Unable to save view in this browser.");
    }
  }

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
      filename: excelFilename("Compliance_Register"),
      sheetName: "Compliance Register",
      columns: EXPORT_COLUMNS,
      rows: filtered.map((r) => ({
        complianceId: r.complianceId,
        framework: r.framework,
        controlId: r.controlId,
        controlName: r.controlName,
        businessUnit: r.businessUnit,
        department: r.department,
        owner: r.owner,
        status: r.status,
        assessmentStatus: r.assessmentStatus,
        complianceScore: r.complianceScore,
        riskLevel: r.riskLevel,
        findingSeverity: r.findingSeverity,
        evidenceRequired: r.evidenceRequired,
        evidenceStatus: r.evidenceStatus,
        lastAssessment: r.lastAssessment,
        nextReview: r.nextReview,
        auditor: r.auditor,
        priority: r.priority,
        dueDate: r.dueDate,
        notes: r.notes,
      })),
      exportInfo: [
        { label: "Filtered rows", value: String(filtered.length) },
        { label: "Total rows", value: String(register.length) },
      ],
    });
    setNotice(`Exported ${filtered.length} compliance register row(s).`);
  }

  if (loading && register.length === 0) {
    return <LoadingSkeleton rows={6} height={56} />;
  }

  return (
    <div className={styles.registerPage}>
      <div className={styles.registerToolbarCard}>
        <ComplianceQuickActions
          onNewAssessment={() => navigate("/compliance/assessments")}
          onUploadEvidence={() => navigate("/compliance/evidence")}
          onImport={handleImport}
          onExport={handleExport}
          onGenerateReport={() => navigate("/compliance/reports")}
          onRefresh={() => void refreshFromFolder()}
          importing={importing}
          refreshing={loading}
          extra={
            <Button type="button" variant="ghost" onClick={() => setFiltersOpen((v) => !v)}>
              {filtersOpen ? "Hide filters" : "Show filters"}
            </Button>
          }
        />
        {filtersOpen ? (
          <ComplianceFilterBar
            values={filters}
            options={options}
            onChange={patchFilters}
            onClear={() => {
              setFilters(EMPTY_COMPLIANCE_FILTERS);
              setPage(1);
            }}
            onSaveView={handleSaveView}
            showAssessmentStatus
            showEvidenceStatus
            showDateRange
          />
        ) : null}
        <div className={styles.resultMeta}>
          Showing {filtered.length} of {register.length} controls
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching controls"
          description="Adjust filters or import a Compliance Register workbook."
        />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Compliance ID</th>
                  <th>Framework</th>
                  <th>Control ID</th>
                  <th>Control Name</th>
                  <th>Business Unit</th>
                  <th>Department</th>
                  <th>Owner</th>
                  <th>Compliance Score</th>
                  <th>Assessment Status</th>
                  <th>Compliance Status</th>
                  <th>Risk Level</th>
                  <th>Evidence</th>
                  <th>Last Assessment</th>
                  <th>Next Review</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr
                    key={r.complianceId}
                    onClick={() => setSelection(r.complianceId, "register")}
                  >
                    <td>
                      <strong className={styles.riskIdCell}>{r.complianceId}</strong>
                    </td>
                    <td>{r.framework || "â€”"}</td>
                    <td>{r.controlId || "â€”"}</td>
                    <td>{r.controlName || "â€”"}</td>
                    <td>{r.businessUnit || "â€”"}</td>
                    <td>{r.department || "â€”"}</td>
                    <td>{r.owner || "Unassigned"}</td>
                    <td>
                      <span className={styles.scoreCell}>{fmtScore(r.complianceScore)}</span>
                    </td>
                    <td>
                      <StatusBadge
                        label={r.assessmentStatus || "â€”"}
                        tone={complianceStatusTone(r.assessmentStatus || "")}
                      />
                    </td>
                    <td>
                      <StatusBadge label={r.status} tone={complianceStatusTone(r.status)} />
                    </td>
                    <td>
                      <SeverityBadge severity={asSeverity(r.riskLevel)} />
                    </td>
                    <td>{r.evidenceStatus || "â€”"}</td>
                    <td>{formatDate(r.lastAssessment)}</td>
                    <td
                      style={
                        isOverdueReview(r.nextReview)
                          ? { color: "var(--color-danger)", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {formatDate(r.nextReview)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelection(r.complianceId, "register")}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, Math.min(p, pageCount) - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <span className={styles.pageInfo}>
              Page {safePage} of {pageCount}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <ComplianceRecordDrawer
        open={Boolean(selectedId && (selectedType === "register" || selectedType == null))}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}


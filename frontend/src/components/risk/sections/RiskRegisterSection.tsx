import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRiskModule } from "../../../services/risk/RiskModuleContext";
import type { EnrichedRisk } from "../../../services/risk/RiskModuleContext";
import type { RiskRegisterItem } from "../../../mocks/types/riskRegister";
import { RISK_LEVELS, RISK_STATUSES, RISK_TREATMENTS } from "../../../mocks/types/riskRegister";
import Button from "../../common/Button";
import StatusBadge from "../../ui/StatusBadge";
import SeverityBadge from "../../ui/SeverityBadge";
import EmptyState from "../../ui/EmptyState";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
import ErrorState from "../../ui/ErrorState";
import ConfirmDialog from "../../ui/ConfirmDialog";
import RiskRegisterDrawer from "../RiskRegisterDrawer";
import RiskRegisterFormModal, { type RiskFormValues } from "../RiskRegisterFormModal";
import { EXCEL_ACCEPT, excelFilename, exportTableToXlsx, isAllowedExcelFilename } from "../../../services/excelExportService";
import { SEARCH_MAX_LENGTH } from "../../../utils/security";
import {
  asSeverity,
  fmtScore,
  formatDate,
  impactOf,
  isOverdue,
  levelOf,
  likelihoodOf,
  scoreOf,
  statusTone,
  uniqueSorted,
} from "./riskSectionUtils";
import styles from "../../../pages/Risk/RiskAssessment.module.css";

const PAGE_SIZE = 25;
const SAVED_FILTER_KEY = "grcx.risk.register.savedFilters";

const EXPORT_COLUMNS = [
  { key: "riskId", header: "Risk ID" },
  { key: "title", header: "Title" },
  { key: "category", header: "Category" },
  { key: "businessUnit", header: "Business Unit" },
  { key: "department", header: "Department" },
  { key: "affectedAsset", header: "Asset" },
  { key: "assetCriticality", header: "Asset Criticality" },
  { key: "threatName", header: "Threat" },
  { key: "vulnerabilityName", header: "Vulnerability" },
  { key: "owner", header: "Owner" },
  { key: "status", header: "Status" },
  { key: "likelihood", header: "Likelihood" },
  { key: "impact", header: "Impact" },
  { key: "score", header: "Score" },
  { key: "level", header: "Level" },
  { key: "residualScore", header: "Residual Score" },
  { key: "treatment", header: "Treatment" },
  { key: "framework", header: "Framework" },
  { key: "evidenceCount", header: "Evidence Count" },
  { key: "lastUpdated", header: "Last Reviewed" },
  { key: "nextReviewDate", header: "Next Review" },
];

interface ColumnDef {
  key: string;
  label: string;
  render: (risk: EnrichedRisk) => ReactNode;
}

function displayStatus(risk: EnrichedRisk): { label: string; tone: ReturnType<typeof statusTone> } {
  if (isOverdue(risk)) {
    return { label: "Overdue", tone: "danger" };
  }
  if (risk.treatment === "Mitigate" && (risk.status === "Closed" || risk.status === "Accepted")) {
    return { label: "Mitigated", tone: "success" };
  }
  if (risk.status === "Remediation in Progress") {
    return { label: "In Progress", tone: "warning" };
  }
  return { label: risk.status, tone: statusTone(risk.status) };
}

const COLUMNS: ColumnDef[] = [
  { key: "riskId", label: "Risk ID", render: (r) => <strong className={styles.riskIdCell}>{r.riskId}</strong> },
  { key: "title", label: "Title", render: (r) => r.title },
  { key: "category", label: "Category", render: (r) => r.category || "—" },
  { key: "businessUnit", label: "Business Unit", render: (r) => r.businessUnit || "—" },
  { key: "department", label: "Department", render: (r) => r.department || "—" },
  { key: "asset", label: "Asset", render: (r) => r.affectedAsset || "—" },
  {
    key: "assetCriticality",
    label: "Asset Criticality",
    render: (r) => <SeverityBadge severity={asSeverity(r.assetCriticality)} />,
  },
  { key: "threat", label: "Threat", render: (r) => r.threatName || "—" },
  { key: "vulnerability", label: "Vulnerability", render: (r) => r.vulnerabilityName || "—" },
  { key: "owner", label: "Owner", render: (r) => r.owner || "Unassigned" },
  {
    key: "status",
    label: "Status",
    render: (r) => {
      const s = displayStatus(r);
      return <StatusBadge label={s.label} tone={s.tone} />;
    },
  },
  { key: "likelihood", label: "Likelihood", render: (r) => fmtScore(likelihoodOf(r)) },
  { key: "impact", label: "Impact", render: (r) => fmtScore(impactOf(r)) },
  {
    key: "score",
    label: "Score",
    render: (r) => <span className={styles.scoreCell}>{fmtScore(scoreOf(r))}</span>,
  },
  { key: "level", label: "Level", render: (r) => <SeverityBadge severity={asSeverity(levelOf(r))} /> },
  { key: "residualScore", label: "Residual Score", render: (r) => fmtScore(r.residualScore) },
  { key: "treatment", label: "Treatment", render: (r) => r.treatment || "—" },
  { key: "framework", label: "Framework", render: (r) => r.framework || "—" },
  { key: "evidence", label: "Evidence", render: (r) => String(r.evidence.length) },
  { key: "lastReviewed", label: "Last Reviewed", render: (r) => formatDate(r.lastUpdated) },
  {
    key: "nextReview",
    label: "Next Review",
    render: (r) => (
      <span style={isOverdue(r) ? { color: "var(--color-danger)", fontWeight: 700 } : undefined}>
        {formatDate(r.nextReviewDate)}
      </span>
    ),
  },
];

function toFormValues(risk: RiskRegisterItem): RiskFormValues {
  return {
    riskId: risk.riskId,
    title: risk.title,
    category: risk.category,
    affectedAsset: risk.affectedAsset,
    businessUnit: risk.businessUnit,
    department: risk.department,
    vendor: risk.vendor,
    owner: risk.owner,
    description: risk.description,
    inherentLikelihood: risk.inherentLikelihood,
    inherentImpact: risk.inherentImpact,
    inherentLevel: risk.inherentLevel,
    treatment: risk.treatment,
    plannedControls: risk.plannedControls,
    framework: risk.framework,
    frameworkControlRef: risk.frameworkControlRef,
    residualLikelihood: risk.residualLikelihood,
    residualImpact: risk.residualImpact,
    residualLevel: risk.residualLevel,
    status: risk.status,
    dateIdentified: risk.dateIdentified,
    nextReviewDate: risk.nextReviewDate,
    notes: risk.notes,
  };
}

export default function RiskRegisterSection() {
  const navigate = useNavigate();
  const {
    risks,
    loading,
    error,
    reload,
    refreshFromFolder,
    importFiles,
    saveRisk,
    removeRisk,
    selectedRisk,
    setSelectedRiskId,
    heatmapFilter,
    setHeatmapFilter,
    setNotice,
  } = useRiskModule();

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [businessUnit, setBusinessUnit] = useState("All");
  const [owner, setOwner] = useState("All");
  const [framework, setFramework] = useState("All");
  const [category, setCategory] = useState("All");
  const [treatment, setTreatment] = useState("All");
  const [status, setStatus] = useState("All");
  const [level, setLevel] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [formState, setFormState] = useState<{ mode: "create" | "edit"; initial: RiskFormValues | null } | null>(
    null
  );
  const [confirmArchive, setConfirmArchive] = useState<EnrichedRisk | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);

  const departments = useMemo(() => uniqueSorted(risks.map((r) => r.department)), [risks]);
  const businessUnits = useMemo(() => uniqueSorted(risks.map((r) => r.businessUnit)), [risks]);
  const owners = useMemo(() => uniqueSorted(risks.map((r) => r.owner)), [risks]);
  const frameworks = useMemo(() => uniqueSorted(risks.map((r) => r.framework)), [risks]);
  const categories = useMemo(() => uniqueSorted(risks.map((r) => r.category)), [risks]);
  const statusOptions = useMemo(
    () => uniqueSorted([...RISK_STATUSES, ...risks.map((r) => r.status)]),
    [risks]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return risks.filter((r) => {
      const matchesQuery =
        q.length === 0 ||
        r.riskId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.affectedAsset.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.threatName.toLowerCase().includes(q) ||
        r.vulnerabilityName.toLowerCase().includes(q);
      const matchesDept = department === "All" || r.department === department;
      const matchesBu = businessUnit === "All" || r.businessUnit === businessUnit;
      const matchesOwner = owner === "All" || r.owner === owner;
      const matchesFramework = framework === "All" || r.framework === framework;
      const matchesCategory = category === "All" || r.category === category;
      const matchesTreatment = treatment === "All" || r.treatment === treatment;
      const matchesStatus = status === "All" || r.status === status;
      const matchesLevel = level === "All" || levelOf(r) === level;
      const matchesOverdue = !overdueOnly || isOverdue(r);
      const matchesHeatmap =
        !heatmapFilter ||
        ((r.residualLikelihood ?? 3) === heatmapFilter.likelihood &&
          (r.residualImpact ?? 3) === heatmapFilter.impact);
      const review = r.nextReviewDate || r.dateIdentified || "";
      const matchesFrom = !dateFrom || review >= dateFrom;
      const matchesTo = !dateTo || review <= dateTo;
      return (
        matchesQuery &&
        matchesDept &&
        matchesBu &&
        matchesOwner &&
        matchesFramework &&
        matchesCategory &&
        matchesTreatment &&
        matchesStatus &&
        matchesLevel &&
        matchesOverdue &&
        matchesHeatmap &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    risks,
    query,
    department,
    businessUnit,
    owner,
    framework,
    category,
    treatment,
    status,
    level,
    overdueOnly,
    heatmapFilter,
    dateFrom,
    dateTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp page index when filtered results shrink
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  function clearFilters() {
    setQuery("");
    setDepartment("All");
    setBusinessUnit("All");
    setOwner("All");
    setFramework("All");
    setCategory("All");
    setTreatment("All");
    setStatus("All");
    setLevel("All");
    setOverdueOnly(false);
    setDateFrom("");
    setDateTo("");
    setHeatmapFilter(null);
    setPage(1);
  }

  function saveCurrentFilter() {
    const snapshot = {
      query,
      department,
      businessUnit,
      owner,
      framework,
      category,
      treatment,
      status,
      level,
      overdueOnly,
      dateFrom,
      dateTo,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(SAVED_FILTER_KEY, JSON.stringify(snapshot));
      setNotice("Filter view saved for this browser.");
    } catch {
      setNotice("Unable to save filter view.");
    }
  }

  function applySavedFilter() {
    try {
      const raw = localStorage.getItem(SAVED_FILTER_KEY);
      if (!raw) {
        setNotice("No saved filter view found.");
        return;
      }
      const snapshot = JSON.parse(raw) as {
        query?: string;
        department?: string;
        businessUnit?: string;
        owner?: string;
        framework?: string;
        category?: string;
        treatment?: string;
        status?: string;
        level?: string;
        overdueOnly?: boolean;
        dateFrom?: string;
        dateTo?: string;
      };
      setQuery(snapshot.query ?? "");
      setDepartment(snapshot.department ?? "All");
      setBusinessUnit(snapshot.businessUnit ?? "All");
      setOwner(snapshot.owner ?? "All");
      setFramework(snapshot.framework ?? "All");
      setCategory(snapshot.category ?? "All");
      setTreatment(snapshot.treatment ?? "All");
      setStatus(snapshot.status ?? "All");
      setLevel(snapshot.level ?? "All");
      setOverdueOnly(Boolean(snapshot.overdueOnly));
      setDateFrom(snapshot.dateFrom ?? "");
      setDateTo(snapshot.dateTo ?? "");
      setPage(1);
      setNotice("Saved filter view applied.");
    } catch {
      setNotice("Saved filter view could not be loaded.");
    }
  }

  async function handleImport(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => isAllowedExcelFilename(f.name));
    if (files.length === 0) return;
    setImporting(true);
    try {
      await importFiles(files);
    } finally {
      setImporting(false);
    }
  }

  function handleExportExcel() {
    exportTableToXlsx({
      filename: excelFilename("Risk_Register"),
      sheetName: "Risk Register",
      columns: EXPORT_COLUMNS,
      rows: filtered.map((r) => ({
        riskId: r.riskId,
        title: r.title,
        category: r.category,
        businessUnit: r.businessUnit,
        department: r.department,
        affectedAsset: r.affectedAsset,
        assetCriticality: r.assetCriticality,
        threatName: r.threatName,
        vulnerabilityName: r.vulnerabilityName,
        owner: r.owner,
        status: r.status,
        likelihood: likelihoodOf(r),
        impact: impactOf(r),
        score: scoreOf(r),
        level: levelOf(r),
        residualScore: r.residualScore,
        treatment: r.treatment,
        framework: r.framework,
        evidenceCount: r.evidence.length,
        lastUpdated: r.lastUpdated,
        nextReviewDate: r.nextReviewDate,
      })),
      exportInfo: [
        { label: "Filtered rows", value: String(filtered.length) },
        { label: "Total rows", value: String(risks.length) },
      ],
    });
  }

  async function attachEvidence(risk: EnrichedRisk, files: FileList) {
    const now = new Date().toISOString();
    const newItems = Array.from(files).map((file, idx) => ({
      id: `ev-${risk.riskId}-${Date.now()}-${idx}`,
      filename: file.name,
      fileType: file.type || "application/octet-stream",
      uploadedBy: "Current User",
      uploadedAt: now,
      description: "Uploaded via Risk Register (metadata captured client-side).",
    }));
    await saveRisk(
      { riskId: risk.riskId, title: risk.title, evidence: [...risk.evidence, ...newItems] },
      "update"
    );
  }

  async function handleSaveRisk(values: RiskFormValues, closeAfter: boolean) {
    const payload: Partial<RiskRegisterItem> & { riskId: string; title: string } = {
      riskId: values.riskId.trim(),
      title: values.title.trim(),
      category: values.category || "General",
      affectedAsset: values.affectedAsset,
      businessUnit: values.businessUnit,
      department: values.department || values.businessUnit,
      vendor: values.vendor,
      owner: values.owner || "Unassigned",
      description: values.description,
      inherentLikelihood: values.inherentLikelihood,
      inherentImpact: values.inherentImpact,
      inherentScore:
        values.inherentLikelihood != null && values.inherentImpact != null
          ? values.inherentLikelihood * values.inherentImpact
          : null,
      inherentLevel: values.inherentLevel,
      treatment: values.treatment,
      plannedControls: values.plannedControls,
      framework: values.framework,
      frameworkControlRef: values.frameworkControlRef,
      residualLikelihood: values.residualLikelihood,
      residualImpact: values.residualImpact,
      residualScore:
        values.residualLikelihood != null && values.residualImpact != null
          ? values.residualLikelihood * values.residualImpact
          : null,
      residualLevel: values.residualLevel,
      status: values.status,
      dateIdentified: values.dateIdentified,
      nextReviewDate: values.nextReviewDate,
      notes: values.notes,
    };

    const mode = formState?.mode ?? "create";
    await saveRisk(payload, mode === "edit" ? "update" : "create");
    if (closeAfter) {
      setFormState(null);
    } else if (mode === "create") {
      setFormState({ mode: "edit", initial: values });
    }
  }

  const activeFilterCount = [
    department !== "All",
    businessUnit !== "All",
    owner !== "All",
    framework !== "All",
    category !== "All",
    treatment !== "All",
    status !== "All",
    level !== "All",
    overdueOnly,
    Boolean(heatmapFilter),
    Boolean(dateFrom),
    Boolean(dateTo),
  ].filter(Boolean).length;

  return (
    <div className={styles.registerPage}>
      <div className={styles.registerToolbarCard}>
        <div className={styles.actionBar}>
          <div className={styles.actionButtons}>
            <Button variant="primary" onClick={() => navigate("/risk/new")}>
              <Plus size={16} aria-hidden />
              New Risk
            </Button>
            <Button variant="secondary" onClick={() => importInputRef.current?.click()} disabled={importing}>
              <Upload size={16} aria-hidden />
              {importing ? "Importing…" : "Import"}
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} aria-hidden />
              Export Excel
            </Button>
            <Button variant="ghost" onClick={() => refreshFromFolder()} disabled={loading}>
              <RefreshCw size={16} aria-hidden className={loading ? styles.spin : ""} />
              Refresh
            </Button>
          </div>
          <button
            type="button"
            className={styles.filtersToggle}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {filtersOpen ? "Hide filters" : "Show filters"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            multiple
            accept={EXCEL_ACCEPT}
            className={styles.hiddenInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              if (event.target.files) handleImport(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {filtersOpen ? (
          <div className={styles.filtersBar} role="search">
            <div className={styles.search}>
              <Search size={16} aria-hidden />
              <label className={styles.srOnly} htmlFor="register-search">
                Search risks
              </label>
              <input
                id="register-search"
                type="search"
                placeholder="Search risk ID, title, asset, owner…"
                value={query}
                maxLength={SEARCH_MAX_LENGTH}
                onChange={(event) => resetPageAnd(setQuery)(event.target.value.slice(0, SEARCH_MAX_LENGTH))}
                autoComplete="off"
              />
            </div>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Department</span>
              <select value={department} onChange={(e) => resetPageAnd(setDepartment)(e.target.value)}>
                <option value="All">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Business unit</span>
              <select value={businessUnit} onChange={(e) => resetPageAnd(setBusinessUnit)(e.target.value)}>
                <option value="All">All business units</option>
                {businessUnits.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Owner</span>
              <select value={owner} onChange={(e) => resetPageAnd(setOwner)(e.target.value)}>
                <option value="All">All owners</option>
                {owners.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Framework</span>
              <select value={framework} onChange={(e) => resetPageAnd(setFramework)(e.target.value)}>
                <option value="All">All frameworks</option>
                {frameworks.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Category</span>
              <select value={category} onChange={(e) => resetPageAnd(setCategory)(e.target.value)}>
                <option value="All">All categories</option>
                {categories.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Treatment</span>
              <select value={treatment} onChange={(e) => resetPageAnd(setTreatment)(e.target.value)}>
                <option value="All">All treatments</option>
                {RISK_TREATMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Status</span>
              <select value={status} onChange={(e) => resetPageAnd(setStatus)(e.target.value)}>
                <option value="All">All statuses</option>
                {statusOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Risk level</span>
              <select value={level} onChange={(e) => resetPageAnd(setLevel)(e.target.value)}>
                <option value="All">All levels</option>
                {RISK_LEVELS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Date from</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => resetPageAnd(setDateFrom)(e.target.value)}
                aria-label="Date range from"
              />
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Date to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => resetPageAnd(setDateTo)(e.target.value)}
                aria-label="Date range to"
              />
            </label>

            <label className={styles.checkboxFilter}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => resetPageAnd(setOverdueOnly)(e.target.checked)}
              />
              Overdue only
            </label>

            <Button variant="ghost" onClick={clearFilters}>
              <X size={14} aria-hidden />
              Reset Filters ({activeFilterCount})
            </Button>
            <Button variant="ghost" onClick={saveCurrentFilter}>
              <Bookmark size={14} aria-hidden />
              Save Filter
            </Button>
            <Button variant="ghost" onClick={applySavedFilter}>
              Apply Saved
            </Button>
          </div>
        ) : null}

        {heatmapFilter ? (
          <div className={styles.chipRow}>
            <span className={styles.chipActive}>
              Heatmap filter: Likelihood {heatmapFilter.likelihood} × Impact {heatmapFilter.impact}
              <button
                type="button"
                className={styles.chipClear}
                aria-label="Clear heatmap filter"
                onClick={() => setHeatmapFilter(null)}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          </div>
        ) : null}

        <p className={styles.resultMeta}>
          Showing <strong>{filtered.length}</strong> of <strong>{risks.length}</strong> risks
        </p>
      </div>

      {loading && risks.length === 0 ? (
        <LoadingSkeleton rows={4} height={64} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : risks.length === 0 ? (
        <EmptyState
          title="No risks loaded yet"
          description="Import an Excel risk register workbook, or refresh to load the seeded risk data."
          action={
            <div className={styles.emptyActions}>
              <Button variant="primary" onClick={() => importInputRef.current?.click()}>
                <Upload size={16} aria-hidden />
                Import Excel
              </Button>
              <Button variant="secondary" onClick={() => refreshFromFolder()}>
                <RefreshCw size={16} aria-hidden />
                Refresh
              </Button>
            </div>
          }
        />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table} style={{ minWidth: 2200 }}>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} scope="col">
                      {col.label}
                    </th>
                  ))}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className={styles.emptyCell}>
                      No risks match the current filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((risk) => (
                    <tr
                      key={risk.id}
                      tabIndex={0}
                      className={styles.clickRow}
                      onClick={() => setSelectedRiskId(risk.riskId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRiskId(risk.riskId);
                        }
                      }}
                    >
                      {COLUMNS.map((col) => (
                        <td key={col.key}>{col.render(risk)}</td>
                      ))}
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`Edit ${risk.riskId}`}
                            onClick={() => setFormState({ mode: "edit", initial: toFormValues(risk) })}
                          >
                            <Pencil size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            aria-label={`Archive ${risk.riskId}`}
                            onClick={() => setConfirmArchive(risk)}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} aria-hidden />
              Previous
            </button>
            <span className={styles.pageInfo}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <RiskRegisterDrawer
        risk={selectedRisk}
        open={Boolean(selectedRisk)}
        onClose={() => setSelectedRiskId(null)}
        onEdit={(risk) => {
          setSelectedRiskId(null);
          setFormState({ mode: "edit", initial: toFormValues(risk) });
        }}
        onDuplicate={(risk) => {
          setSelectedRiskId(null);
          const copy = toFormValues(risk);
          copy.riskId = `${risk.riskId}-COPY-${Date.now().toString(36).toUpperCase()}`;
          copy.title = `(Copy) ${risk.title}`;
          setFormState({ mode: "create", initial: copy });
        }}
        onArchive={(risk) => setConfirmArchive(risk as EnrichedRisk)}
        onUploadEvidence={(risk, files) => attachEvidence(risk as EnrichedRisk, files)}
      />

      <RiskRegisterFormModal
        open={Boolean(formState)}
        mode={formState?.mode ?? "create"}
        initial={formState?.initial ?? null}
        risks={risks}
        onCancel={() => setFormState(null)}
        onSave={handleSaveRisk}
      />

      <ConfirmDialog
        open={Boolean(confirmArchive)}
        title={confirmArchive ? `Archive ${confirmArchive.riskId}?` : ""}
        message={
          confirmArchive
            ? `"${confirmArchive.title}" will be marked as Archived. This does not permanently delete the record.`
            : ""
        }
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onCancel={() => setConfirmArchive(null)}
        onConfirm={async () => {
          if (confirmArchive) await removeRisk(confirmArchive.riskId);
          setConfirmArchive(null);
        }}
      />
    </div>
  );
}

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  FilterX,
  HeartPulse,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Undo2,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import SeverityBadge from "../../components/ui/SeverityBadge";
import Button from "../../components/common/Button";
import {
  ExportCurrentViewButton,
  ImportMergeExcelButton,
} from "../../components/common/DataTransferButton";
import ExcelImportWizard from "../../components/excel/ExcelImportWizard";
import ExcelExportDialog from "../../components/excel/ExcelExportDialog";
import BcmProcessDrawer from "../../components/bcm/BcmProcessDrawer";
import BcmKpiCard from "../../components/bcm/BcmKpiCard";
import BcmProcessTable from "../../components/bcm/BcmProcessTable";
import BcmReadinessCharts from "../../components/bcm/BcmReadinessCharts";
import BcmCreateProcessModal from "../../components/bcm/BcmCreateProcessModal";
import { bcmDashboardData } from "../../mocks/data/bcmData";
import type {
  ActivityCategory,
  ActivityStatus,
  BcmCriticality,
  BcmProcessStatus,
  CriticalBusinessProcess,
} from "../../mocks/types/bcm";
import {
  bcmBuildNew,
  bcmMerge,
  bcmToFlat,
} from "../../services/excel/adapters/bcmAdapters";
import { bcmSchema } from "../../services/excel/moduleSchemas";
import { useOperationalModuleData } from "../../services/excel/useOperationalModuleData";
import {
  getModuleRows,
  replaceModuleRows,
  resetModuleStore,
} from "../../mocks/services/operationalDataStore";
import {
  fetchBcmDashboard,
  replaceProcesses,
} from "../../services/api/bcmApi";
import styles from "./BusinessContinuity.module.css";

const KPI_ICONS = {
  readiness: <Shield size={20} aria-hidden />,
  processes: <Activity size={20} aria-hidden />,
  recovery: <CheckCircle2 size={20} aria-hidden />,
  health: <HeartPulse size={20} aria-hidden />,
} as const;

const EXPORT_COLUMNS = [
  { key: "id", header: "Process ID" },
  { key: "name", header: "Business Process" },
  { key: "businessUnit", header: "Business Unit" },
  { key: "department", header: "Department" },
  { key: "owner", header: "Owner" },
  { key: "criticality", header: "Criticality" },
  { key: "businessImpact", header: "Business Impact" },
  { key: "rto", header: "RTO" },
  { key: "rpo", header: "RPO" },
  { key: "mao", header: "MAO" },
  { key: "recoveryStrategy", header: "Recovery Strategy" },
  { key: "dependencies", header: "Dependencies" },
  { key: "recoveryTeam", header: "Recovery Team" },
  { key: "status", header: "Status" },
  { key: "lastTest", header: "Last Test" },
  { key: "nextTest", header: "Next Test" },
  { key: "nextReview", header: "Next Review" },
  { key: "version", header: "Version" },
];

const ACTIVITY_GROUPS: ActivityCategory[] = [
  "BCP Review",
  "Exercise",
  "Recovery Test",
  "Expired Plan",
  "Approval",
  "Audit",
];

const ACTIVITY_LABELS: Record<ActivityCategory, string> = {
  "BCP Review": "Upcoming BCP Reviews",
  Exercise: "Upcoming Exercises",
  "Recovery Test": "Upcoming Recovery Tests",
  "Expired Plan": "Expired Recovery Plans",
  Approval: "Pending Approvals",
  Audit: "Upcoming Audits",
};

function activityStatusTone(
  status: ActivityStatus
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "In Progress") return "info";
  if (status === "Scheduled") return "success";
  if (status === "Overdue") return "danger";
  if (status === "Pending") return "warning";
  return "neutral";
}

function useDebouncedValue<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function deriveKpis(processes: CriticalBusinessProcess[]) {
  const criticalCount = processes.filter(
    (p) => p.criticality === "Critical" || p.criticality === "High"
  ).length;
  const ready = processes.filter((p) => p.status === "Ready").length;
  const readiness =
    processes.length === 0 ? 0 : Math.round((ready / processes.length) * 100);
  const atRisk = processes.filter((p) => p.status === "At Risk").length;
  const overdueTests = processes.filter((p) => {
    if (!p.lastTest) return true;
    return p.lastTest < "2026-05-01";
  }).length;
  const compliance = Math.max(
    0,
    Math.min(100, 100 - overdueTests * 3 - atRisk * 4)
  );
  const health = Math.round(readiness * 0.55 + compliance * 0.45);

  return bcmDashboardData.kpis.map((kpi) => {
    if (kpi.id === "readiness") {
      return {
        ...kpi,
        value: `${readiness}%`,
        tone:
          readiness >= 85 ? "success" : readiness >= 70 ? "warning" : "danger",
        badge: readiness >= 85 ? "On Track" : "Watch",
      } as const;
    }
    if (kpi.id === "processes") {
      return {
        ...kpi,
        value: String(criticalCount),
      } as const;
    }
    if (kpi.id === "recovery") {
      return {
        ...kpi,
        value: `${compliance}%`,
        tone:
          compliance >= 90
            ? "success"
            : compliance >= 80
              ? "warning"
              : "danger",
        badge: compliance >= 90 ? "Compliant" : "Watch",
        trend:
          compliance < 90 ? "-4% vs prior month" : kpi.trend,
        trendDirection: compliance < 90 ? "down" : kpi.trendDirection,
      } as const;
    }
    if (kpi.id === "health") {
      return {
        ...kpi,
        value: String(health),
        tone: health >= 80 ? "success" : health >= 65 ? "warning" : "danger",
        badge: health >= 80 ? "Healthy" : "Attention",
      } as const;
    }
    return kpi;
  });
}

export default function BusinessContinuity() {
  const [data, setData] = useState(bcmDashboardData);
  const [seedProcesses, setSeedProcesses] = useState(bcmDashboardData.processes);
  const { rows, flatRecords, affectedIds, canUndo, applyImport, undo } =
    useOperationalModuleData("bcm", seedProcesses, bcmSchema, {
      toFlat: bcmToFlat,
      buildNew: bcmBuildNew,
      mergeExisting: bcmMerge,
    });

  useEffect(() => {
    let cancelled = false;
    void fetchBcmDashboard().then((bundle) => {
      if (cancelled) return;
      setData({
        ...bcmDashboardData,
        processes: bundle.processes,
        kpis: bundle.kpis,
        activities: bundle.activities,
        recommendations: bundle.recommendations,
      });
      setSeedProcesses(bundle.processes);
      resetModuleStore(
        "bcm",
        bundle.processes
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyImport = useCallback(
    (payload: Parameters<typeof applyImport>[0]) => {
      const result = applyImport(payload);
      void replaceProcesses(
        getModuleRows<CriticalBusinessProcess>("bcm")
      ).catch(() => undefined);
      return result;
    },
    [applyImport]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightOnly, setHighlightOnly] = useState(false);
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [department, setDepartment] = useState("All");
  const [businessUnit, setBusinessUnit] = useState("All");
  const [criticality, setCriticality] = useState<"All" | BcmCriticality>("All");
  const [status, setStatus] = useState<"All" | BcmProcessStatus>("All");
  const [strategy, setStrategy] = useState("All");
  const [owner, setOwner] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filterOptions = useMemo(() => {
    const departments = [...new Set(rows.map((r) => r.department).filter(Boolean))].sort();
    const units = [...new Set(rows.map((r) => r.businessUnit).filter(Boolean))].sort();
    const owners = [...new Set(rows.map((r) => r.owner).filter(Boolean))].sort();
    const strategies = [
      ...new Set(rows.map((r) => r.recoveryStrategy).filter(Boolean)),
    ].sort();
    return { departments, units, owners, strategies };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (highlightOnly && !affectedIds.includes(row.id)) return false;
      if (department !== "All" && row.department !== department) return false;
      if (businessUnit !== "All" && row.businessUnit !== businessUnit) return false;
      if (criticality !== "All" && row.criticality !== criticality) return false;
      if (status !== "All" && row.status !== status) return false;
      if (strategy !== "All" && row.recoveryStrategy !== strategy) return false;
      if (owner !== "All" && row.owner !== owner) return false;
      if (dateFrom && row.lastTest && row.lastTest < dateFrom) return false;
      if (dateTo && row.lastTest && row.lastTest > dateTo) return false;
      if (!q) return true;
      const haystack = [
        row.id,
        row.name,
        row.businessUnit,
        row.department,
        row.owner,
        row.recoveryStrategy,
        row.recoveryTeam,
        row.status,
        ...row.dependencies,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    rows,
    debouncedQuery,
    department,
    businessUnit,
    criticality,
    status,
    strategy,
    owner,
    dateFrom,
    dateTo,
    highlightOnly,
    affectedIds,
  ]);

  const kpis = useMemo(() => deriveKpis(rows), [rows]);

  const selectedProcess = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? null,
    [rows, selectedId]
  );

  const existingIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  const filterSummary = useMemo(() => {
    const summary: Array<{ label: string; value: string }> = [];
    if (debouncedQuery) summary.push({ label: "Search", value: debouncedQuery });
    if (department !== "All") summary.push({ label: "Department", value: department });
    if (businessUnit !== "All")
      summary.push({ label: "Business Unit", value: businessUnit });
    if (criticality !== "All")
      summary.push({ label: "Criticality", value: criticality });
    if (status !== "All") summary.push({ label: "Status", value: status });
    if (strategy !== "All")
      summary.push({ label: "Recovery Strategy", value: strategy });
    if (owner !== "All") summary.push({ label: "Owner", value: owner });
    if (dateFrom || dateTo)
      summary.push({
        label: "Date Range",
        value: `${dateFrom || "â€¦"} â†’ ${dateTo || "â€¦"}`,
      });
    return summary;
  }, [
    debouncedQuery,
    department,
    businessUnit,
    criticality,
    status,
    strategy,
    owner,
    dateFrom,
    dateTo,
  ]);

  const groupedActivities = useMemo(() => {
    return ACTIVITY_GROUPS.map((category) => ({
      category,
      items: data.activities.filter((a) => a.category === category),
    })).filter((group) => group.items.length > 0);
  }, [data.activities]);

  const openProcess = useCallback((process: CriticalBusinessProcess) => {
    setSelectedId(process.id);
  }, []);

  const closeDrawer = useCallback(() => setSelectedId(null), []);

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setQuery("");
      setDepartment("All");
      setBusinessUnit("All");
      setCriticality("All");
      setStatus("All");
      setStrategy("All");
      setOwner("All");
      setDateFrom("");
      setDateTo("");
      setHighlightOnly(false);
    });
  }, [startTransition]);

  const hasActiveFilters =
    Boolean(query) ||
    department !== "All" ||
    businessUnit !== "All" ||
    criticality !== "All" ||
    status !== "All" ||
    strategy !== "All" ||
    owner !== "All" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    highlightOnly;

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          title="Business Continuity"
          description="Enterprise BCM workspace for critical processes, recovery readiness, exercises, and continuity insights â€” without leaving this page."
        />

        {notice ? (
          <div className={styles.notice} role="status">
            <span>{notice}</span>
            <button
              type="button"
              className={styles.noticeClose}
              aria-label="Dismiss notice"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <section className={styles.section} aria-labelledby="bcm-exec">
          <h2 id="bcm-exec" className={styles.sectionTitle}>
            Executive Summary
          </h2>
          <div className={styles.kpiGrid}>
            {kpis.map((kpi) => (
              <BcmKpiCard
                key={kpi.id}
                kpi={kpi}
                icon={KPI_ICONS[kpi.id as keyof typeof KPI_ICONS]}
              />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="bcm-toolbar-label">
          <h2 id="bcm-toolbar-label" className={styles.srOnly}>
            Global actions toolbar
          </h2>
          <div className={styles.toolbar} role="search">
            <div className={styles.search}>
              <Search size={18} aria-hidden />
              <label className={styles.srOnly} htmlFor="bcm-search">
                Search processes
              </label>
              <input
                id="bcm-search"
                type="search"
                placeholder="Search processes, owners, dependenciesâ€¦"
                value={query}
                maxLength={120}
                onChange={(e) => setQuery(e.target.value.slice(0, 120))}
                autoComplete="off"
              />
            </div>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Department</span>
              <select
                value={department}
                aria-label="Department filter"
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="All">All departments</option>
                {filterOptions.departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Business Unit</span>
              <select
                value={businessUnit}
                aria-label="Business Unit filter"
                onChange={(e) => setBusinessUnit(e.target.value)}
              >
                <option value="All">All business units</option>
                {filterOptions.units.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterCompact}>
              <span className={styles.srOnly}>Criticality</span>
              <select
                value={criticality}
                aria-label="Criticality filter"
                onChange={(e) =>
                  setCriticality(e.target.value as "All" | BcmCriticality)
                }
              >
                <option value="All">All criticality</option>
                {(["Critical", "High", "Medium", "Low"] as const).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterCompact}>
              <span className={styles.srOnly}>Status</span>
              <select
                value={status}
                aria-label="Status filter"
                onChange={(e) =>
                  setStatus(e.target.value as "All" | BcmProcessStatus)
                }
              >
                <option value="All">All statuses</option>
                {(["Ready", "Testing", "At Risk", "Draft", "Review"] as const).map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className={styles.filter}>
              <span className={styles.srOnly}>Recovery Strategy</span>
              <select
                value={strategy}
                aria-label="Recovery Strategy filter"
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="All">All strategies</option>
                {filterOptions.strategies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterCompact}>
              <span className={styles.srOnly}>Owner</span>
              <select
                value={owner}
                aria-label="Owner filter"
                onChange={(e) => setOwner(e.target.value)}
              >
                <option value="All">All owners</option>
                {filterOptions.owners.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.dateRange} aria-label="Date range filter">
              <label>
                <span className={styles.srOnly}>From date</span>
                <input
                  type="date"
                  value={dateFrom}
                  aria-label="Last test from date"
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <span className={styles.dateSep} aria-hidden>
                â€“
              </span>
              <label>
                <span className={styles.srOnly}>To date</span>
                <input
                  type="date"
                  value={dateTo}
                  aria-label="Last test to date"
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
            </div>

            <div className={styles.toolbarActions}>
              <ImportMergeExcelButton onClick={() => setImportOpen(true)} />
              <ExportCurrentViewButton onClick={() => setExportOpen(true)} />
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} aria-hidden />
                Create Process
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setNotice(`Refreshed ${rows.length} processes from session store.`)
                }
              >
                <RefreshCw size={16} aria-hidden />
                Refresh
              </Button>
              <Button
                variant="ghost"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                <FilterX size={16} aria-hidden />
                Clear Filters
              </Button>
              {canUndo ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    undo();
                    setHighlightOnly(false);
                    setNotice("Last import undone for this session.");
                  }}
                >
                  <Undo2 size={16} aria-hidden />
                  Undo
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="bcm-processes">
          <div className={styles.sectionHead}>
            <h2 id="bcm-processes" className={styles.sectionTitle}>
              Critical Business Processes
            </h2>
            <p className={styles.sectionHint}>
              Click a row to open the process drawer. Sorting, columns, and
              virtualization stay on this page.
            </p>
          </div>
          <BcmProcessTable
            rows={filtered}
            affectedIds={affectedIds}
            onRowOpen={openProcess}
          />
        </section>

        <section className={styles.section} aria-labelledby="bcm-readiness">
          <div className={styles.sectionHead}>
            <h2 id="bcm-readiness" className={styles.sectionTitle}>
              Recovery Readiness Dashboard
            </h2>
            <p className={styles.sectionHint}>
              Live analytics for the current filtered process set.
            </p>
          </div>
          <BcmReadinessCharts rows={filtered.length ? filtered : rows} />
        </section>

        <section className={styles.section} aria-labelledby="bcm-activities">
          <h2 id="bcm-activities" className={styles.sectionTitle}>
            Upcoming Activities
          </h2>
          <div className={styles.activityBoard}>
            {groupedActivities.map((group) => (
              <article key={group.category} className={styles.activityGroup}>
                <h3>{ACTIVITY_LABELS[group.category]}</h3>
                <ul className={styles.activityList}>
                  {group.items.map((activity) => (
                    <li key={activity.id}>
                      <div className={styles.activityMain}>
                        <div className={styles.activityTitleRow}>
                          <CalendarClock size={15} aria-hidden />
                          <strong>{activity.title}</strong>
                        </div>
                        <div className={styles.activityMeta}>
                          <span>{activity.owner}</span>
                          <span>Due {activity.dueDate}</span>
                        </div>
                      </div>
                      <div className={styles.activityTags}>
                        <SeverityBadge severity={activity.priority} />
                        <StatusBadge
                          label={activity.status}
                          tone={activityStatusTone(activity.status)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="bcm-ai">
          <div className={styles.sectionHead}>
            <h2 id="bcm-ai" className={styles.sectionTitle}>
              AI Insights
            </h2>
            <p className={styles.sectionHint}>
              Static demo recommendations â€” no AI backend required.
            </p>
          </div>
          <div className={styles.aiPanel}>
            <div className={styles.aiHeader}>
              <Sparkles size={18} aria-hidden />
              <div>
                <h3>Continuity recommendations</h3>
                <p>
                  Prioritized actions based on overdue plans, RTO gaps, and
                  dependency concentration.
                </p>
              </div>
            </div>
            <div className={styles.aiGrid}>
              {data.recommendations.map((rec) => (
                <article key={rec.id} className={styles.aiCard}>
                  <div className={styles.aiCardTop}>
                    <SeverityBadge severity={rec.severity} />
                    <span className={styles.aiAction}>{rec.actionLabel}</span>
                  </div>
                  <h4>{rec.title}</h4>
                  <p>{rec.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <BcmProcessDrawer
        open={Boolean(selectedProcess)}
        process={selectedProcess}
        onClose={closeDrawer}
      />

      <BcmCreateProcessModal
        open={createOpen}
        existingIds={existingIds}
        onClose={() => setCreateOpen(false)}
        onCreate={(process) => {
          replaceModuleRows("bcm", [...rows, process], { preserveUndo: true });
          setNotice(`Created process ${process.id}.`);
          setSelectedId(process.id);
        }}
      />

      <ExcelImportWizard
        open={importOpen}
        schema={bcmSchema}
        existingRecords={flatRecords}
        onClose={() => setImportOpen(false)}
        onApply={handleApplyImport}
        onViewImported={() => {
          setHighlightOnly(true);
          setNotice("Showing imported or updated critical processes.");
        }}
      />

      <ExcelExportDialog
        open={exportOpen}
        moduleLabel={bcmSchema.moduleLabel}
        filenamePrefix={bcmSchema.filenamePrefix}
        sheetName={bcmSchema.sheetName}
        columns={EXPORT_COLUMNS}
        rows={filtered.map((row) => bcmToFlat(row))}
        selectedRows={filtered.map((row) => bcmToFlat(row))}
        allRows={rows.map((row) => bcmToFlat(row))}
        filterSummary={filterSummary}
        onClose={() => setExportOpen(false)}
      />
    </DashboardLayout>
  );
}


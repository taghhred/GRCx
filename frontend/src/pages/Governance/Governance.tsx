import { useMemo, useState, type FormEvent } from "react";
import { Eye, Pencil, Plus, RefreshCw, Search, Undo2, X } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/common/Button";
import {
  ExportCurrentViewButton,
  ImportMergeExcelButton,
} from "../../components/common/DataTransferButton";
import ExcelImportWizard from "../../components/excel/ExcelImportWizard";
import ExcelExportDialog from "../../components/excel/ExcelExportDialog";
import StatusBadge from "../../components/ui/StatusBadge";
import DashboardTimeRangePicker from "../../components/dashboard/DashboardTimeRangePicker";
import { useAuth } from "../../auth/useAuth";
import {
  GOVERNANCE_KPIS,
  GOVERNANCE_POLICIES,
} from "../../mocks/data/governanceData";
import type {
  ApprovalStatus,
  GovernanceDepartment,
  GovernanceKpi,
  GovernancePolicy,
  KpiCategory,
  KpiDataSource,
  KpiFrequency,
  KpiStatusLabel,
  KpiUnit,
  PerformanceDirection,
  PolicyCategory,
  PolicyStatus,
  ReviewFrequency,
} from "../../mocks/types/governance";
import {
  APPROVAL_STATUSES,
  GOVERNANCE_DEPARTMENTS,
  KPI_CATEGORIES,
  KPI_DATA_SOURCES,
  KPI_FREQUENCIES,
  KPI_STATUS_LABELS,
  KPI_UNITS,
  PERFORMANCE_DIRECTIONS,
  POLICY_CATEGORIES,
  POLICY_STATUSES,
  REVIEW_FREQUENCIES,
  validateKpiThresholds,
} from "../../mocks/types/governance";
import type { DashboardTimeRange } from "../../mocks/types/executiveKpi";
import {
  kpiBuildNew,
  kpiMerge,
  kpiToFlat,
} from "../../services/excel/adapters/governanceKpiAdapters";
import {
  policyBuildNew,
  policyMerge,
  policyToFlat,
} from "../../services/excel/adapters/governancePolicyAdapters";
import {
  governanceKpisSchema,
  governancePoliciesSchema,
} from "../../services/excel/moduleSchemas";
import { useOperationalModuleData } from "../../services/excel/useOperationalModuleData";
import {
  patchModuleRow,
  replaceModuleRows,
} from "../../mocks/services/operationalDataStore";
import { createTimeRangeFromPreset } from "../../utils/dashboardTimeRange";
import {
  calculateKpiStatus,
  kpiStatusTone,
  policyStatusTone,
} from "../../utils/kpiStatus";
import { SEARCH_MAX_LENGTH } from "../../utils/security";
import { validateSecureUpload } from "../../utils/secureUpload";
import styles from "./Governance.module.css";

type TabId = "policies" | "kpis";
type PolicySort =
  | "name"
  | "owner"
  | "lastUpdated"
  | "nextReviewDate"
  | "policyStatus";

const PAGE_SIZE = 10;

const POLICY_EXPORT_COLUMNS = [
  { key: "id", header: "Policy ID" },
  { key: "name", header: "Policy Name" },
  { key: "category", header: "Policy Category" },
  { key: "department", header: "Department" },
  { key: "owner", header: "Owner" },
  { key: "version", header: "Version" },
  { key: "effectiveDate", header: "Effective Date" },
  { key: "nextReviewDate", header: "Next Review Date" },
  { key: "approvalStatus", header: "Approval Status" },
  { key: "policyStatus", header: "Policy Status" },
  { key: "frameworks", header: "Related Frameworks" },
  { key: "lastUpdated", header: "Last Updated" },
];

const KPI_EXPORT_COLUMNS = [
  { key: "id", header: "KPI ID" },
  { key: "name", header: "KPI Name" },
  { key: "category", header: "Category" },
  { key: "department", header: "Department" },
  { key: "owner", header: "Owner" },
  { key: "frequency", header: "Frequency" },
  { key: "unit", header: "Unit" },
  { key: "formula", header: "Formula" },
  { key: "target", header: "Target" },
  { key: "warningThreshold", header: "Warning Threshold" },
  { key: "criticalThreshold", header: "Critical Threshold" },
  { key: "currentValue", header: "Current Value" },
  { key: "status", header: "Status" },
  { key: "dataSource", header: "Data Source" },
  { key: "periodStart", header: "Reporting Period Start" },
  { key: "periodEnd", header: "Reporting Period End" },
  { key: "lastUpdated", header: "Last Updated" },
  { key: "notes", header: "Notes" },
];

function formatUnit(unit: KpiUnit, value: number | null): string {
  if (value == null) return "—";
  if (unit === "Percentage") return `${value}%`;
  return `${value}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function inDateRange(isoDate: string, range: DashboardTimeRange): boolean {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return false;
  return (
    t >= new Date(range.startIso).getTime() &&
    t <= new Date(range.endIso).getTime()
  );
}

export default function Governance() {
  const { user } = useAuth();
  const actorName = user?.full_name ?? "User";

  const policyStore = useOperationalModuleData(
    "governance-policies",
    GOVERNANCE_POLICIES,
    governancePoliciesSchema,
    {
      toFlat: policyToFlat,
      buildNew: policyBuildNew,
      mergeExisting: policyMerge,
    }
  );

  const kpiStore = useOperationalModuleData(
    "governance-kpis",
    GOVERNANCE_KPIS,
    governanceKpisSchema,
    {
      toFlat: kpiToFlat,
      buildNew: kpiBuildNew,
      mergeExisting: kpiMerge,
    }
  );

  const [tab, setTab] = useState<TabId>("policies");

  // Policies filters
  const [policyQuery, setPolicyQuery] = useState("");
  const [policyDept, setPolicyDept] = useState<GovernanceDepartment | "All">(
    "All"
  );
  const [policyCategory, setPolicyCategory] = useState<PolicyCategory | "All">(
    "All"
  );
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | "All">("All");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | "All">(
    "All"
  );
  const [frameworkFilter, setFrameworkFilter] = useState("All");
  const [reviewFrom, setReviewFrom] = useState("");
  const [reviewTo, setReviewTo] = useState("");
  const [policySort, setPolicySort] = useState<PolicySort>("lastUpdated");
  const [policyPage, setPolicyPage] = useState(1);

  // KPI filters
  const [kpiQuery, setKpiQuery] = useState("");
  const [kpiDept, setKpiDept] = useState<GovernanceDepartment | "All">("All");
  const [kpiCategory, setKpiCategory] = useState<KpiCategory | "All">("All");
  const [kpiOwner, setKpiOwner] = useState("All");
  const [kpiStatus, setKpiStatus] = useState<KpiStatusLabel | "All">("All");
  const [kpiFrequency, setKpiFrequency] = useState<KpiFrequency | "All">("All");
  const [kpiUnit, setKpiUnit] = useState<KpiUnit | "All">("All");
  const [kpiSource, setKpiSource] = useState<KpiDataSource | "All">("All");
  const [kpiTimeRange, setKpiTimeRange] = useState<DashboardTimeRange>(() =>
    createTimeRangeFromPreset("this-year")
  );
  const [kpiPage, setKpiPage] = useState(1);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [policyFormOpen, setPolicyFormOpen] = useState(false);
  const [kpiFormOpen, setKpiFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<GovernancePolicy | null>(
    null
  );
  const [editingKpi, setEditingKpi] = useState<GovernanceKpi | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [policyImportOpen, setPolicyImportOpen] = useState(false);
  const [policyExportOpen, setPolicyExportOpen] = useState(false);
  const [kpiImportOpen, setKpiImportOpen] = useState(false);
  const [kpiExportOpen, setKpiExportOpen] = useState(false);

  const frameworks = useMemo(() => {
    const set = new Set<string>();
    policyStore.rows.forEach((p) => p.frameworks.forEach((f) => set.add(f)));
    return ["All", ...Array.from(set).sort()];
  }, [policyStore.rows]);

  const kpiOwners = useMemo(() => {
    const set = new Set(kpiStore.rows.map((k) => k.owner));
    return ["All", ...Array.from(set).sort()];
  }, [kpiStore.rows]);

  const filteredPolicies = useMemo(() => {
    const q = policyQuery.trim().toLowerCase();
    let list = policyStore.rows.filter((p) => {
      const matchesQ =
        q.length === 0 ||
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q);
      const matchesDept = policyDept === "All" || p.department === policyDept;
      const matchesCat =
        policyCategory === "All" || p.category === policyCategory;
      const matchesStatus =
        policyStatus === "All" || p.policyStatus === policyStatus;
      const matchesApproval =
        approvalStatus === "All" || p.approvalStatus === approvalStatus;
      const matchesFw =
        frameworkFilter === "All" || p.frameworks.includes(frameworkFilter);
      const review = p.nextReviewDate;
      const matchesReviewFrom = !reviewFrom || review >= reviewFrom;
      const matchesReviewTo = !reviewTo || review <= reviewTo;
      return (
        matchesQ &&
        matchesDept &&
        matchesCat &&
        matchesStatus &&
        matchesApproval &&
        matchesFw &&
        matchesReviewFrom &&
        matchesReviewTo
      );
    });

    list = [...list].sort((a, b) => {
      const av = String(a[policySort] ?? "");
      const bv = String(b[policySort] ?? "");
      return av.localeCompare(bv);
    });
    return list;
  }, [
    policyStore.rows,
    policyQuery,
    policyDept,
    policyCategory,
    policyStatus,
    approvalStatus,
    frameworkFilter,
    reviewFrom,
    reviewTo,
    policySort,
  ]);

  const filteredKpis = useMemo(() => {
    const q = kpiQuery.trim().toLowerCase();
    return kpiStore.rows.filter((k) => {
      const matchesQ =
        q.length === 0 ||
        k.id.toLowerCase().includes(q) ||
        k.name.toLowerCase().includes(q) ||
        k.owner.toLowerCase().includes(q) ||
        k.formula.toLowerCase().includes(q);
      const matchesDept = kpiDept === "All" || k.department === kpiDept;
      const matchesCat = kpiCategory === "All" || k.category === kpiCategory;
      const matchesOwner = kpiOwner === "All" || k.owner === kpiOwner;
      const matchesStatus = kpiStatus === "All" || k.status === kpiStatus;
      const matchesFreq =
        kpiFrequency === "All" || k.frequency === kpiFrequency;
      const matchesUnit = kpiUnit === "All" || k.unit === kpiUnit;
      const matchesSource = kpiSource === "All" || k.dataSource === kpiSource;
      const matchesPeriod =
        inDateRange(k.lastUpdated, kpiTimeRange) ||
        inDateRange(k.periodEnd, kpiTimeRange) ||
        inDateRange(k.periodStart, kpiTimeRange);
      return (
        matchesQ &&
        matchesDept &&
        matchesCat &&
        matchesOwner &&
        matchesStatus &&
        matchesFreq &&
        matchesUnit &&
        matchesSource &&
        matchesPeriod
      );
    });
  }, [
    kpiStore.rows,
    kpiQuery,
    kpiDept,
    kpiCategory,
    kpiOwner,
    kpiStatus,
    kpiFrequency,
    kpiUnit,
    kpiSource,
    kpiTimeRange,
  ]);

  const policyPageCount = Math.max(
    1,
    Math.ceil(filteredPolicies.length / PAGE_SIZE)
  );
  const kpiPageCount = Math.max(1, Math.ceil(filteredKpis.length / PAGE_SIZE));
  const safePolicyPage = Math.min(policyPage, policyPageCount);
  const safeKpiPage = Math.min(kpiPage, kpiPageCount);
  const pagedPolicies = filteredPolicies.slice(
    (safePolicyPage - 1) * PAGE_SIZE,
    safePolicyPage * PAGE_SIZE
  );
  const pagedKpis = filteredKpis.slice(
    (safeKpiPage - 1) * PAGE_SIZE,
    safeKpiPage * PAGE_SIZE
  );

  const selectedPolicy =
    policyStore.rows.find((p) => p.id === selectedPolicyId) ?? null;
  const selectedKpi = kpiStore.rows.find((k) => k.id === selectedKpiId) ?? null;

  function clearPolicyFilters() {
    setPolicyQuery("");
    setPolicyDept("All");
    setPolicyCategory("All");
    setPolicyStatus("All");
    setApprovalStatus("All");
    setFrameworkFilter("All");
    setReviewFrom("");
    setReviewTo("");
    setPolicySort("lastUpdated");
  }

  function clearKpiFilters() {
    setKpiQuery("");
    setKpiDept("All");
    setKpiCategory("All");
    setKpiOwner("All");
    setKpiStatus("All");
    setKpiFrequency("All");
    setKpiUnit("All");
    setKpiSource("All");
    setKpiTimeRange(createTimeRangeFromPreset("this-year"));
  }

  function appendActivity(
    policy: GovernancePolicy,
    action: string,
    detail?: string
  ): GovernancePolicy {
    return {
      ...policy,
      lastUpdated: todayIso(),
      activity: [
        {
          id: `act-${Date.now()}`,
          at: new Date().toISOString().replace("T", " ").slice(0, 16),
          actor: actorName,
          action,
          detail,
        },
        ...policy.activity,
      ],
    };
  }

  function runPolicyWorkflow(
    policy: GovernancePolicy,
    action:
      | "submit"
      | "request-changes"
      | "approve"
      | "reject"
      | "publish"
      | "archive"
  ) {
    if (
      (action === "approve" || action === "reject") &&
      policy.owner === actorName &&
      !user?.is_manager
    ) {
      setNotice("You cannot approve or reject your own policy.");
      return;
    }

    patchModuleRow<GovernancePolicy>(
      "governance-policies",
      "id",
      policy.id,
      (existing) => {
        let next = { ...existing };
        if (action === "submit") {
          next.policyStatus = "Pending Approval";
          next.approvalStatus = "Pending";
          next = appendActivity(next, "Submitted", "Submitted for approval");
        } else if (action === "request-changes") {
          next.policyStatus = "Under Review";
          next.approvalStatus = "Changes Requested";
          next = appendActivity(next, "Changes Requested");
        } else if (action === "approve") {
          next.policyStatus = "Approved";
          next.approvalStatus = "Approved";
          next = appendActivity(next, "Approved");
        } else if (action === "reject") {
          next.policyStatus = "Draft";
          next.approvalStatus = "Rejected";
          next = appendActivity(next, "Rejected");
        } else if (action === "publish") {
          next.policyStatus = "Published";
          next.approvalStatus = "Approved";
          next = appendActivity(next, "Published");
        } else if (action === "archive") {
          next.policyStatus = "Archived";
          next = appendActivity(next, "Archived");
        }
        return next;
      }
    );
    setNotice(`Policy ${policy.id}: ${action.replace("-", " ")} recorded.`);
  }

  function openAddPolicy() {
    setEditingPolicy(null);
    setFormError(null);
    setPolicyFormOpen(true);
  }

  function openEditPolicy(policy: GovernancePolicy) {
    setEditingPolicy(policy);
    setFormError(null);
    setPolicyFormOpen(true);
  }

  function openAddKpi() {
    setEditingKpi(null);
    setFormError(null);
    setKpiFormOpen(true);
  }

  function openEditKpi(kpi: GovernanceKpi) {
    setEditingKpi(kpi);
    setFormError(null);
    setKpiFormOpen(true);
  }

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          title="Governance"
          description="Manage organizational policies, ownership, approvals, governance KPIs, evidence, and performance across all departments."
          primaryAction={
            tab === "policies" ? (
              <Button onClick={openAddPolicy}>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <Plus size={16} aria-hidden />
                  Add Policy
                </span>
              </Button>
            ) : (
              <Button onClick={openAddKpi}>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <Plus size={16} aria-hidden />
                  Add KPI
                </span>
              </Button>
            )
          }
          secondaryActions={
            <>
              {tab === "policies" ? (
                <>
                  <ImportMergeExcelButton
                    onClick={() => setPolicyImportOpen(true)}
                  />
                  <ExportCurrentViewButton
                    onClick={() => setPolicyExportOpen(true)}
                    disabled={filteredPolicies.length === 0}
                  />
                  {policyStore.canUndo ? (
                    <Button variant="ghost" onClick={() => policyStore.undo()}>
                      <Undo2 size={16} aria-hidden /> Undo import
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <ImportMergeExcelButton
                    onClick={() => setKpiImportOpen(true)}
                  >
                    Import Excel
                  </ImportMergeExcelButton>
                  <ExportCurrentViewButton
                    onClick={() => setKpiExportOpen(true)}
                    disabled={filteredKpis.length === 0}
                  />
                  {kpiStore.canUndo ? (
                    <Button variant="ghost" onClick={() => kpiStore.undo()}>
                      <Undo2 size={16} aria-hidden /> Undo import
                    </Button>
                  ) : null}
                </>
              )}
            </>
          }
        />

        {notice ? (
          <div className={styles.metaRow} role="status">
            <span>{notice}</span>
            <button type="button" className={styles.iconBtn} onClick={() => setNotice(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ) : null}

        <div className={styles.tabs} role="tablist" aria-label="Governance views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "policies"}
            className={`${styles.tab} ${tab === "policies" ? styles.tabActive : ""}`}
            onClick={() => setTab("policies")}
          >
            Policies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "kpis"}
            className={`${styles.tab} ${tab === "kpis" ? styles.tabActive : ""}`}
            onClick={() => setTab("kpis")}
          >
            KPIs
          </button>
        </div>

        {tab === "policies" ? (
          <>
            <div className={styles.toolbar}>
              <div className={styles.search}>
                <Search size={16} className={styles.searchIcon} aria-hidden />
                <input
                  className={styles.searchInput}
                  value={policyQuery}
                  maxLength={SEARCH_MAX_LENGTH}
                  onChange={(e) => setPolicyQuery(e.target.value)}
                  placeholder="Search by Policy ID, name, owner, or keyword"
                  aria-label="Search policies"
                />
              </div>
              <div className={styles.filters}>
                <select
                  className={styles.select}
                  value={policyDept}
                  onChange={(e) =>
                    setPolicyDept(e.target.value as GovernanceDepartment | "All")
                  }
                  aria-label="Filter by department"
                >
                  <option value="All">All departments</option>
                  {GOVERNANCE_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={policyCategory}
                  onChange={(e) =>
                    setPolicyCategory(e.target.value as PolicyCategory | "All")
                  }
                  aria-label="Filter by category"
                >
                  <option value="All">All categories</option>
                  {POLICY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={policyStatus}
                  onChange={(e) =>
                    setPolicyStatus(e.target.value as PolicyStatus | "All")
                  }
                  aria-label="Filter by policy status"
                >
                  <option value="All">All policy statuses</option>
                  {POLICY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={approvalStatus}
                  onChange={(e) =>
                    setApprovalStatus(e.target.value as ApprovalStatus | "All")
                  }
                  aria-label="Filter by approval status"
                >
                  <option value="All">All approval statuses</option>
                  {APPROVAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={frameworkFilter}
                  onChange={(e) => setFrameworkFilter(e.target.value)}
                  aria-label="Filter by framework"
                >
                  {frameworks.map((f) => (
                    <option key={f} value={f}>
                      {f === "All" ? "All frameworks" : f}
                    </option>
                  ))}
                </select>
                <input
                  className={styles.select}
                  type="date"
                  value={reviewFrom}
                  onChange={(e) => setReviewFrom(e.target.value)}
                  aria-label="Review date from"
                />
                <input
                  className={styles.select}
                  type="date"
                  value={reviewTo}
                  onChange={(e) => setReviewTo(e.target.value)}
                  aria-label="Review date to"
                />
                <select
                  className={styles.select}
                  value={policySort}
                  onChange={(e) => setPolicySort(e.target.value as PolicySort)}
                  aria-label="Sort policies"
                >
                  <option value="name">Sort: Name</option>
                  <option value="owner">Sort: Owner</option>
                  <option value="lastUpdated">Sort: Last Updated</option>
                  <option value="nextReviewDate">Sort: Review Date</option>
                  <option value="policyStatus">Sort: Status</option>
                </select>
                <Button variant="secondary" onClick={clearPolicyFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span>
                Showing {filteredPolicies.length} of {policyStore.rows.length}{" "}
                policies
              </span>
              <Button
                variant="ghost"
                onClick={() => {
                  /* refresh from store is live */
                  setNotice("Policy list refreshed.");
                }}
              >
                <RefreshCw size={14} aria-hidden /> Refresh
              </Button>
            </div>

            {policyStore.rows.length === 0 ? (
              <div className={styles.empty}>
                <h2 className={styles.emptyTitle}>No policies have been added yet.</h2>
                <p className={styles.emptyText}>
                  Create the organization&apos;s first policy to begin managing
                  governance requirements, ownership, and approvals.
                </p>
                <div className={styles.emptyActions}>
                  <Button onClick={openAddPolicy}>Add Policy</Button>
                </div>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Policy ID</th>
                      <th>Policy Name</th>
                      <th>Policy Category</th>
                      <th>Department</th>
                      <th>Owner</th>
                      <th>Version</th>
                      <th>Effective Date</th>
                      <th>Next Review Date</th>
                      <th>Approval Status</th>
                      <th>Policy Status</th>
                      <th>Related Frameworks</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPolicies.length === 0 ? (
                      <tr>
                        <td colSpan={13}>No policies match the current filters.</td>
                      </tr>
                    ) : (
                      pagedPolicies.map((policy) => (
                        <tr
                          key={policy.id}
                          onClick={() => setSelectedPolicyId(policy.id)}
                        >
                          <td className={styles.idCell}>{policy.id}</td>
                          <td className={styles.nameCell}>{policy.name}</td>
                          <td>{policy.category}</td>
                          <td>{policy.department}</td>
                          <td>{policy.owner}</td>
                          <td>{policy.version}</td>
                          <td>{policy.effectiveDate}</td>
                          <td>{policy.nextReviewDate}</td>
                          <td>
                            <StatusBadge
                              label={policy.approvalStatus}
                              tone={
                                policy.approvalStatus === "Approved"
                                  ? "success"
                                  : policy.approvalStatus === "Rejected"
                                    ? "danger"
                                    : policy.approvalStatus === "Pending"
                                      ? "warning"
                                      : "neutral"
                              }
                            />
                          </td>
                          <td>
                            <StatusBadge
                              label={policy.policyStatus}
                              tone={policyStatusTone(policy.policyStatus)}
                            />
                          </td>
                          <td>{policy.frameworks.join(", ") || "—"}</td>
                          <td>{policy.lastUpdated}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label={`View ${policy.name}`}
                                onClick={() => setSelectedPolicyId(policy.id)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label={`Edit ${policy.name}`}
                                onClick={() => openEditPolicy(policy)}
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {filteredPolicies.length > 0 ? (
              <div className={styles.metaRow}>
                <span>
                  Page {safePolicyPage} of {policyPageCount}
                </span>
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={safePolicyPage <= 1}
                    onClick={() => setPolicyPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={safePolicyPage >= policyPageCount}
                    onClick={() =>
                      setPolicyPage((p) => Math.min(policyPageCount, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className={styles.toolbar}>
              <div className={styles.search}>
                <Search size={16} className={styles.searchIcon} aria-hidden />
                <input
                  className={styles.searchInput}
                  value={kpiQuery}
                  maxLength={SEARCH_MAX_LENGTH}
                  onChange={(e) => setKpiQuery(e.target.value)}
                  placeholder="Search by KPI ID, name, owner, or formula"
                  aria-label="Search KPIs"
                />
              </div>
              <div className={styles.filters}>
                <select
                  className={styles.select}
                  value={kpiDept}
                  onChange={(e) =>
                    setKpiDept(e.target.value as GovernanceDepartment | "All")
                  }
                  aria-label="Filter KPIs by department"
                >
                  <option value="All">All departments</option>
                  {GOVERNANCE_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={kpiCategory}
                  onChange={(e) =>
                    setKpiCategory(e.target.value as KpiCategory | "All")
                  }
                  aria-label="Filter by KPI category"
                >
                  <option value="All">All categories</option>
                  {KPI_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={kpiOwner}
                  onChange={(e) => setKpiOwner(e.target.value)}
                  aria-label="Filter by owner"
                >
                  {kpiOwners.map((o) => (
                    <option key={o} value={o}>
                      {o === "All" ? "All owners" : o}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={kpiStatus}
                  onChange={(e) =>
                    setKpiStatus(e.target.value as KpiStatusLabel | "All")
                  }
                  aria-label="Filter by KPI status"
                >
                  <option value="All">All statuses</option>
                  {KPI_STATUS_LABELS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={kpiFrequency}
                  onChange={(e) =>
                    setKpiFrequency(e.target.value as KpiFrequency | "All")
                  }
                  aria-label="Filter by frequency"
                >
                  <option value="All">All frequencies</option>
                  {KPI_FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={kpiUnit}
                  onChange={(e) => setKpiUnit(e.target.value as KpiUnit | "All")}
                  aria-label="Filter by unit"
                >
                  <option value="All">All units</option>
                  {KPI_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={kpiSource}
                  onChange={(e) =>
                    setKpiSource(e.target.value as KpiDataSource | "All")
                  }
                  aria-label="Filter by data source"
                >
                  <option value="All">All data sources</option>
                  {KPI_DATA_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={clearKpiFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span>Reporting period / last updated filter</span>
              <DashboardTimeRangePicker
                value={kpiTimeRange}
                onChange={setKpiTimeRange}
              />
            </div>

            <div className={styles.metaRow}>
              <span>
                Showing {filteredKpis.length} of {kpiStore.rows.length} KPIs
              </span>
            </div>

            {kpiStore.rows.length === 0 ? (
              <div className={styles.empty}>
                <h2 className={styles.emptyTitle}>No KPIs have been added yet.</h2>
                <p className={styles.emptyText}>
                  Create or import governance KPIs to begin monitoring
                  organizational performance.
                </p>
                <div className={styles.emptyActions}>
                  <Button onClick={openAddKpi}>Add KPI</Button>
                  <Button variant="secondary" onClick={() => setKpiImportOpen(true)}>
                    Import Excel
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>KPI ID</th>
                      <th>KPI Name</th>
                      <th>Category</th>
                      <th>Department</th>
                      <th>Owner</th>
                      <th>Frequency</th>
                      <th>Unit</th>
                      <th>Formula</th>
                      <th>Target</th>
                      <th>Warning</th>
                      <th>Critical</th>
                      <th>Current Value</th>
                      <th>Status</th>
                      <th>Data Source</th>
                      <th>Reporting Period</th>
                      <th>Last Updated</th>
                      <th>Evidence</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedKpis.length === 0 ? (
                      <tr>
                        <td colSpan={19}>No KPIs match the current filters.</td>
                      </tr>
                    ) : (
                      pagedKpis.map((kpi) => (
                        <tr key={kpi.id} onClick={() => setSelectedKpiId(kpi.id)}>
                          <td className={styles.idCell}>{kpi.id}</td>
                          <td className={styles.nameCell}>{kpi.name}</td>
                          <td>{kpi.category}</td>
                          <td>{kpi.department}</td>
                          <td>{kpi.owner}</td>
                          <td>{kpi.frequency}</td>
                          <td>{kpi.unit}</td>
                          <td className={styles.nameCell}>{kpi.formula}</td>
                          <td>{formatUnit(kpi.unit, kpi.target)}</td>
                          <td>{formatUnit(kpi.unit, kpi.warningThreshold)}</td>
                          <td>{formatUnit(kpi.unit, kpi.criticalThreshold)}</td>
                          <td>{formatUnit(kpi.unit, kpi.currentValue)}</td>
                          <td>
                            <StatusBadge
                              label={kpi.status}
                              tone={kpiStatusTone(kpi.status)}
                            />
                          </td>
                          <td>{kpi.dataSource}</td>
                          <td>
                            {kpi.periodStart} → {kpi.periodEnd}
                          </td>
                          <td>{kpi.lastUpdated}</td>
                          <td>{kpi.evidenceNames[0] ?? "—"}</td>
                          <td className={styles.nameCell}>{kpi.notes || "—"}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label={`View ${kpi.name}`}
                                onClick={() => setSelectedKpiId(kpi.id)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label={`Edit ${kpi.name}`}
                                onClick={() => openEditKpi(kpi)}
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {filteredKpis.length > 0 ? (
              <div className={styles.metaRow}>
                <span>
                  Page {safeKpiPage} of {kpiPageCount}
                </span>
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={safeKpiPage <= 1}
                    onClick={() => setKpiPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={safeKpiPage >= kpiPageCount}
                    onClick={() =>
                      setKpiPage((p) => Math.min(kpiPageCount, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {selectedPolicy ? (
        <PolicyDrawer
          policy={selectedPolicy}
          onClose={() => setSelectedPolicyId(null)}
          onEdit={() => openEditPolicy(selectedPolicy)}
          onWorkflow={(action) => runPolicyWorkflow(selectedPolicy, action)}
          onEvidence={(file) => {
            const result = validateSecureUpload(file, "policy-evidence");
            if (!result.ok) {
              setNotice(result.message);
              return;
            }
            patchModuleRow<GovernancePolicy>(
              "governance-policies",
              "id",
              selectedPolicy.id,
              (existing) =>
                appendActivity(
                  {
                    ...existing,
                    evidenceNames: [...existing.evidenceNames, result.safeName],
                  },
                  "Evidence uploaded",
                  result.safeName
                )
            );
            setNotice(`Evidence attached: ${result.safeName}`);
          }}
        />
      ) : null}

      {selectedKpi ? (
        <KpiDrawer
          kpi={selectedKpi}
          onClose={() => setSelectedKpiId(null)}
          onEdit={() => openEditKpi(selectedKpi)}
          onEvidence={(file) => {
            const result = validateSecureUpload(file, "kpi-evidence");
            if (!result.ok) {
              setNotice(result.message);
              return;
            }
            patchModuleRow<GovernanceKpi>(
              "governance-kpis",
              "id",
              selectedKpi.id,
              (existing) => ({
                ...existing,
                evidenceNames: [...existing.evidenceNames, result.safeName],
                lastUpdated: todayIso(),
              })
            );
            setNotice(`KPI evidence attached: ${result.safeName}`);
          }}
          onAddMeasurement={(value, notes) => {
            const status = calculateKpiStatus({
              value,
              target: selectedKpi.target,
              warningThreshold: selectedKpi.warningThreshold,
              criticalThreshold: selectedKpi.criticalThreshold,
              direction: selectedKpi.direction,
              targetMin: selectedKpi.targetMin,
              targetMax: selectedKpi.targetMax,
            });
            const periodStart = selectedKpi.periodStart;
            const periodEnd = selectedKpi.periodEnd;
            patchModuleRow<GovernanceKpi>(
              "governance-kpis",
              "id",
              selectedKpi.id,
              (existing) => ({
                ...existing,
                currentValue: value,
                status,
                notes: notes || existing.notes,
                lastUpdated: todayIso(),
                measurements: [
                  {
                    id: `m-${Date.now()}`,
                    periodStart,
                    periodEnd,
                    value,
                    status,
                    notes,
                    recordedBy: actorName,
                    recordedAt: todayIso(),
                  },
                  ...existing.measurements,
                ],
              })
            );
            setNotice("Historical measurement recorded (previous values retained).");
          }}
        />
      ) : null}

      {policyFormOpen ? (
        <PolicyFormModal
          existing={editingPolicy}
          existingIds={policyStore.rows.map((r) => r.id)}
          actorName={actorName}
          error={formError}
          onClose={() => setPolicyFormOpen(false)}
          onSave={(policy, isNew) => {
            if (isNew && policyStore.rows.some((r) => r.id === policy.id)) {
              setFormError("Duplicate Policy ID.");
              return;
            }
            if (isNew) {
              replaceModuleRows("governance-policies", [
                policy,
                ...policyStore.rows,
              ]);
            } else {
              patchModuleRow("governance-policies", "id", policy.id, () => policy);
            }
            setPolicyFormOpen(false);
            setNotice(isNew ? `Created ${policy.id}` : `Updated ${policy.id}`);
          }}
        />
      ) : null}

      {kpiFormOpen ? (
        <KpiFormModal
          existing={editingKpi}
          existingIds={kpiStore.rows.map((r) => r.id)}
          error={formError}
          onClose={() => setKpiFormOpen(false)}
          onSave={(kpi, isNew) => {
            if (isNew && kpiStore.rows.some((r) => r.id === kpi.id)) {
              setFormError("Duplicate KPI ID.");
              return;
            }
            const thresholdError = validateKpiThresholds({
              direction: kpi.direction,
              target: kpi.target,
              warningThreshold: kpi.warningThreshold,
              criticalThreshold: kpi.criticalThreshold,
              targetMin: kpi.targetMin,
              targetMax: kpi.targetMax,
            });
            if (thresholdError) {
              setFormError(thresholdError);
              return;
            }
            if (isNew) {
              replaceModuleRows("governance-kpis", [kpi, ...kpiStore.rows]);
            } else {
              patchModuleRow("governance-kpis", "id", kpi.id, () => kpi);
            }
            setKpiFormOpen(false);
            setNotice(isNew ? `Created ${kpi.id}` : `Updated ${kpi.id}`);
          }}
        />
      ) : null}

      <ExcelImportWizard
        open={policyImportOpen}
        schema={governancePoliciesSchema}
        existingRecords={policyStore.flatRecords}
        onClose={() => setPolicyImportOpen(false)}
        onApply={(payload) => {
          const result = policyStore.applyImport(payload);
          setNotice(
            `Policy import: ${result.added} added, ${result.updated} updated.`
          );
          return result;
        }}
      />
      <ExcelImportWizard
        open={kpiImportOpen}
        schema={governanceKpisSchema}
        existingRecords={kpiStore.flatRecords}
        onClose={() => setKpiImportOpen(false)}
        onApply={(payload) => {
          const result = kpiStore.applyImport(payload);
          setNotice(
            `KPI import: ${result.added} added, ${result.updated} updated.`
          );
          return result;
        }}
      />
      <ExcelExportDialog
        open={policyExportOpen}
        moduleLabel="Governance Policies"
        filenamePrefix="Governance_Policies"
        sheetName="Policies"
        columns={POLICY_EXPORT_COLUMNS}
        rows={filteredPolicies.map(policyToFlat)}
        filterSummary={[
          { label: "Search", value: policyQuery || "—" },
          { label: "Department", value: policyDept },
          { label: "Status", value: policyStatus },
        ]}
        onClose={() => setPolicyExportOpen(false)}
      />
      <ExcelExportDialog
        open={kpiExportOpen}
        moduleLabel="Governance KPIs"
        filenamePrefix="Governance_KPIs"
        sheetName="KPIs"
        columns={KPI_EXPORT_COLUMNS}
        rows={filteredKpis.map(kpiToFlat)}
        filterSummary={[
          { label: "Department", value: kpiDept },
          { label: "Category", value: kpiCategory },
          { label: "Period", value: kpiTimeRange.label },
        ]}
        onClose={() => setKpiExportOpen(false)}
      />
    </DashboardLayout>
  );
}

function PolicyDrawer({
  policy,
  onClose,
  onEdit,
  onWorkflow,
  onEvidence,
}: {
  policy: GovernancePolicy;
  onClose: () => void;
  onEdit: () => void;
  onWorkflow: (
    action:
      | "submit"
      | "request-changes"
      | "approve"
      | "reject"
      | "publish"
      | "archive"
  ) => void;
  onEvidence: (file: File) => void;
}) {
  return (
    <>
      <button
        type="button"
        className={styles.drawerBackdrop}
        aria-label="Close policy details"
        onClick={onClose}
      />
      <aside className={styles.drawer} role="dialog" aria-label="Policy details">
        <div className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>{policy.name}</h2>
            <p className={styles.drawerSub}>
              {policy.id} · v{policy.version}
            </p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.drawerBody}>
          <section>
            <h3 className={styles.sectionTitle}>Policy Overview</h3>
            <p className={styles.fieldValue}>{policy.description}</p>
          </section>
          <section>
            <div className={styles.grid2}>
              <div>
                <span className={styles.fieldLabel}>Owner</span>
                <div className={styles.fieldValue}>{policy.owner}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Department</span>
                <div className={styles.fieldValue}>{policy.department}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Approver</span>
                <div className={styles.fieldValue}>{policy.approver || "—"}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Review Frequency</span>
                <div className={styles.fieldValue}>{policy.reviewFrequency}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Effective Date</span>
                <div className={styles.fieldValue}>{policy.effectiveDate}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Next Review Date</span>
                <div className={styles.fieldValue}>{policy.nextReviewDate}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Policy Status</span>
                <StatusBadge
                  label={policy.policyStatus}
                  tone={policyStatusTone(policy.policyStatus)}
                />
              </div>
              <div>
                <span className={styles.fieldLabel}>Approval Status</span>
                <div className={styles.fieldValue}>{policy.approvalStatus}</div>
              </div>
            </div>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Related Frameworks</h3>
            <p className={styles.fieldValue}>
              {policy.frameworks.join(", ") || "—"}
            </p>
            <h3 className={styles.sectionTitle}>Mapped Controls</h3>
            <p className={styles.fieldValue}>
              {policy.controls.join(", ") || "—"}
            </p>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Attached Document</h3>
            <p className={styles.fieldValue}>{policy.documentName ?? "—"}</p>
            <h3 className={styles.sectionTitle}>Supporting Evidence</h3>
            <p className={styles.fieldValue}>
              {policy.evidenceNames.join(", ") || "—"}
            </p>
            <label className={styles.fieldLabel}>
              Upload evidence
              <input
                type="file"
                accept=".pdf,.docx,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onEvidence(file);
                  e.target.value = "";
                }}
              />
            </label>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Notes</h3>
            <p className={styles.fieldValue}>{policy.notes || "—"}</p>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Version History</h3>
            <ul className={styles.timeline}>
              {policy.versions.map((v) => (
                <li key={v.version + v.changeDate}>
                  <strong>
                    v{v.version}
                    {v.isCurrent ? " (current)" : ""}
                  </strong>
                  <div className={styles.fieldValue}>
                    {v.changeSummary} — {v.changedBy} · {v.changeDate}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Activity Timeline</h3>
            <ul className={styles.timeline}>
              {policy.activity.map((a) => (
                <li key={a.id}>
                  <strong>{a.action}</strong>
                  <div className={styles.fieldValue}>
                    {a.actor} · {a.at}
                    {a.detail ? ` — ${a.detail}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <div className={styles.formActions} style={{ flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="secondary" onClick={() => onWorkflow("submit")}>
              Submit
            </Button>
            <Button
              variant="secondary"
              onClick={() => onWorkflow("request-changes")}
            >
              Request Changes
            </Button>
            <Button variant="secondary" onClick={() => onWorkflow("approve")}>
              Approve
            </Button>
            <Button variant="danger" onClick={() => onWorkflow("reject")}>
              Reject
            </Button>
            <Button onClick={() => onWorkflow("publish")}>Publish</Button>
            <Button variant="ghost" onClick={() => onWorkflow("archive")}>
              Archive
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function KpiDrawer({
  kpi,
  onClose,
  onEdit,
  onEvidence,
  onAddMeasurement,
}: {
  kpi: GovernanceKpi;
  onClose: () => void;
  onEdit: () => void;
  onEvidence: (file: File) => void;
  onAddMeasurement: (value: number, notes: string) => void;
}) {
  const [measureValue, setMeasureValue] = useState(
    kpi.currentValue == null ? "" : String(kpi.currentValue)
  );
  const [measureNotes, setMeasureNotes] = useState("");
  const maxVal = Math.max(
    ...kpi.measurements.map((m) => m.value ?? 0),
    kpi.currentValue ?? 0,
    kpi.target,
    1
  );

  return (
    <>
      <button
        type="button"
        className={styles.drawerBackdrop}
        aria-label="Close KPI details"
        onClick={onClose}
      />
      <aside className={styles.drawer} role="dialog" aria-label="KPI details">
        <div className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>{kpi.name}</h2>
            <p className={styles.drawerSub}>{kpi.id}</p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.drawerBody}>
          <section>
            <h3 className={styles.sectionTitle}>KPI Definition</h3>
            <p className={styles.fieldValue}>{kpi.description}</p>
            <div className={styles.grid2}>
              <div>
                <span className={styles.fieldLabel}>Department</span>
                <div className={styles.fieldValue}>{kpi.department}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Owner</span>
                <div className={styles.fieldValue}>{kpi.owner}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Formula</span>
                <div className={styles.fieldValue}>{kpi.formula}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Direction</span>
                <div className={styles.fieldValue}>{kpi.direction}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Current Value</span>
                <div className={styles.fieldValue}>
                  {formatUnit(kpi.unit, kpi.currentValue)}
                </div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Target</span>
                <div className={styles.fieldValue}>
                  {formatUnit(kpi.unit, kpi.target)}
                </div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Warning / Critical</span>
                <div className={styles.fieldValue}>
                  {formatUnit(kpi.unit, kpi.warningThreshold)} /{" "}
                  {formatUnit(kpi.unit, kpi.criticalThreshold)}
                </div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Status</span>
                <StatusBadge label={kpi.status} tone={kpiStatusTone(kpi.status)} />
              </div>
            </div>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Historical Trend</h3>
            <div className={styles.spark} aria-hidden>
              {(kpi.measurements.length
                ? [...kpi.measurements].reverse()
                : [{ value: kpi.currentValue }]
              ).map((m, i) => (
                <div
                  key={i}
                  className={styles.sparkBar}
                  style={{
                    height: `${Math.max(8, ((m.value ?? 0) / maxVal) * 100)}%`,
                  }}
                  title={String(m.value ?? "—")}
                />
              ))}
            </div>
            <ul className={styles.timeline}>
              {kpi.measurements.map((m) => (
                <li key={m.id}>
                  <strong>
                    {m.periodStart} → {m.periodEnd}:{" "}
                    {formatUnit(kpi.unit, m.value)}
                  </strong>
                  <div className={styles.fieldValue}>
                    {m.status} · {m.recordedBy} · {m.recordedAt}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Add Measurement</h3>
            <div className={styles.grid2}>
              <label>
                <span className={styles.fieldLabel}>Value</span>
                <input
                  className={styles.select}
                  value={measureValue}
                  onChange={(e) => setMeasureValue(e.target.value)}
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>Notes</span>
                <input
                  className={styles.select}
                  value={measureNotes}
                  onChange={(e) => setMeasureNotes(e.target.value)}
                />
              </label>
            </div>
            <div className={styles.formActions}>
              <Button
                onClick={() => {
                  const n = Number(measureValue);
                  if (!Number.isFinite(n)) return;
                  onAddMeasurement(n, measureNotes);
                  setMeasureNotes("");
                }}
              >
                Record Value
              </Button>
            </div>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Evidence</h3>
            <p className={styles.fieldValue}>
              {kpi.evidenceNames.join(", ") || "—"}
            </p>
            <label className={styles.fieldLabel}>
              Upload evidence
              <input
                type="file"
                accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onEvidence(file);
                  e.target.value = "";
                }}
              />
            </label>
          </section>
          <section>
            <h3 className={styles.sectionTitle}>Notes</h3>
            <p className={styles.fieldValue}>{kpi.notes || "—"}</p>
          </section>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={onEdit}>
              Edit KPI
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function PolicyFormModal({
  existing,
  existingIds,
  actorName,
  error,
  onClose,
  onSave,
}: {
  existing: GovernancePolicy | null;
  existingIds: string[];
  actorName: string;
  error: string | null;
  onClose: () => void;
  onSave: (policy: GovernancePolicy, isNew: boolean) => void;
}) {
  const isNew = !existing;
  const [id, setId] = useState(existing?.id ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState<PolicyCategory>(
    existing?.category ?? "Information Security"
  );
  const [department, setDepartment] = useState<GovernanceDepartment>(
    existing?.department ?? "Cybersecurity GRC"
  );
  const [owner, setOwner] = useState(existing?.owner ?? actorName);
  const [approver, setApprover] = useState(existing?.approver ?? "");
  const [version, setVersion] = useState(existing?.version ?? "1.0");
  const [effectiveDate, setEffectiveDate] = useState(
    existing?.effectiveDate ?? todayIso()
  );
  const [nextReviewDate, setNextReviewDate] = useState(
    existing?.nextReviewDate ?? todayIso()
  );
  const [reviewFrequency, setReviewFrequency] = useState<ReviewFrequency>(
    existing?.reviewFrequency ?? "Annual"
  );
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(
    existing?.approvalStatus ?? "Not Submitted"
  );
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus>(
    existing?.policyStatus ?? "Draft"
  );
  const [frameworks, setFrameworks] = useState(
    existing?.frameworks.join(", ") ?? ""
  );
  const [controls, setControls] = useState(existing?.controls.join(", ") ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [documentName, setDocumentName] = useState(existing?.documentName ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!id.trim() || !name.trim()) {
      setLocalError("Policy ID and name are required.");
      return;
    }
    if (isNew && existingIds.includes(id.trim())) {
      setLocalError("Duplicate Policy ID.");
      return;
    }
    if (nextReviewDate && effectiveDate && nextReviewDate < effectiveDate) {
      setLocalError("Next review date must be on or after the effective date.");
      return;
    }
    const now = todayIso();
    const policy: GovernancePolicy = {
      id: id.trim(),
      name: name.trim(),
      description: description.trim(),
      category,
      department,
      owner: owner.trim(),
      approver: approver.trim(),
      version: version.trim() || "1.0",
      effectiveDate,
      nextReviewDate,
      reviewFrequency,
      approvalStatus,
      policyStatus,
      frameworks: frameworks
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
      controls: controls
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
      documentName: documentName || undefined,
      evidenceNames: existing?.evidenceNames ?? [],
      notes,
      lastUpdated: now,
      versions: existing?.versions ?? [
        {
          version: version.trim() || "1.0",
          changeSummary: "Initial version",
          changedBy: actorName,
          changeDate: now,
          approvalStatus,
          isCurrent: true,
        },
      ],
      activity: existing?.activity ?? [
        {
          id: `new-${id}`,
          at: `${now} 00:00`,
          actor: actorName,
          action: "Created",
        },
      ],
    };
    onSave(policy, isNew);
  }

  return (
    <div className={styles.modalBackdrop}>
      <form className={styles.modal} onSubmit={submit}>
        <h2 className={styles.modalTitle}>
          {isNew ? "Add Policy" : `Edit ${existing?.id}`}
        </h2>
        {(localError || error) && (
          <p className={styles.fieldValue} style={{ color: "var(--color-danger)" }}>
            {localError || error}
          </p>
        )}
        <div className={styles.formGrid}>
          <label>
            <span className={styles.fieldLabel}>Policy ID</span>
            <input
              className={styles.select}
              value={id}
              disabled={!isNew}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Policy Name</span>
            <input
              className={styles.select}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Policy Description</span>
            <textarea
              className={styles.select}
              style={{ height: 80, padding: 10 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Category</span>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as PolicyCategory)}
            >
              {POLICY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Department</span>
            <select
              className={styles.select}
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value as GovernanceDepartment)
              }
            >
              {GOVERNANCE_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Owner</span>
            <input
              className={styles.select}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              required
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Approver</span>
            <input
              className={styles.select}
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Version</span>
            <input
              className={styles.select}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Review Frequency</span>
            <select
              className={styles.select}
              value={reviewFrequency}
              onChange={(e) =>
                setReviewFrequency(e.target.value as ReviewFrequency)
              }
            >
              {REVIEW_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Effective Date</span>
            <input
              className={styles.select}
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Next Review Date</span>
            <input
              className={styles.select}
              type="date"
              value={nextReviewDate}
              onChange={(e) => setNextReviewDate(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Approval Status</span>
            <select
              className={styles.select}
              value={approvalStatus}
              onChange={(e) =>
                setApprovalStatus(e.target.value as ApprovalStatus)
              }
            >
              {APPROVAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Policy Status</span>
            <select
              className={styles.select}
              value={policyStatus}
              onChange={(e) => setPolicyStatus(e.target.value as PolicyStatus)}
            >
              {POLICY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Related Frameworks</span>
            <input
              className={styles.select}
              value={frameworks}
              onChange={(e) => setFrameworks(e.target.value)}
              placeholder="ISO 27001, NCA ECC"
            />
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Related Controls</span>
            <input
              className={styles.select}
              value={controls}
              onChange={(e) => setControls(e.target.value)}
            />
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Policy Document</span>
            <input
              className={styles.select}
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const result = validateSecureUpload(file, "policy-document");
                if (!result.ok) {
                  setLocalError(result.message);
                  e.target.value = "";
                  return;
                }
                setDocumentName(result.safeName);
              }}
            />
            {documentName ? (
              <span className={styles.fieldValue}>{documentName}</span>
            ) : null}
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Notes</span>
            <textarea
              className={styles.select}
              style={{ height: 70, padding: 10 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isNew ? "Create Policy" : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}

function KpiFormModal({
  existing,
  existingIds,
  error,
  onClose,
  onSave,
}: {
  existing: GovernanceKpi | null;
  existingIds: string[];
  error: string | null;
  onClose: () => void;
  onSave: (kpi: GovernanceKpi, isNew: boolean) => void;
}) {
  const isNew = !existing;
  const [id, setId] = useState(existing?.id ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState<KpiCategory>(
    existing?.category ?? "Governance"
  );
  const [department, setDepartment] = useState<GovernanceDepartment>(
    existing?.department ?? "Cybersecurity GRC"
  );
  const [owner, setOwner] = useState(existing?.owner ?? "");
  const [frequency, setFrequency] = useState<KpiFrequency>(
    existing?.frequency ?? "Monthly"
  );
  const [unit, setUnit] = useState<KpiUnit>(existing?.unit ?? "Percentage");
  const [formula, setFormula] = useState(existing?.formula ?? "");
  const [direction, setDirection] = useState<PerformanceDirection>(
    existing?.direction ?? "Higher Is Better"
  );
  const [target, setTarget] = useState(String(existing?.target ?? 95));
  const [warning, setWarning] = useState(String(existing?.warningThreshold ?? 90));
  const [critical, setCritical] = useState(
    String(existing?.criticalThreshold ?? 80)
  );
  const [currentValue, setCurrentValue] = useState(
    existing?.currentValue == null ? "" : String(existing.currentValue)
  );
  const [dataSource, setDataSource] = useState<KpiDataSource>(
    existing?.dataSource ?? "Manual Entry"
  );
  const [periodStart, setPeriodStart] = useState(
    existing?.periodStart ?? todayIso()
  );
  const [periodEnd, setPeriodEnd] = useState(existing?.periodEnd ?? todayIso());
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!id.trim() || !name.trim()) {
      setLocalError("KPI ID and name are required.");
      return;
    }
    if (isNew && existingIds.includes(id.trim())) {
      setLocalError("Duplicate KPI ID.");
      return;
    }
    if (periodEnd < periodStart) {
      setLocalError("Invalid reporting period date range.");
      return;
    }
    const targetN = Number(target);
    const warningN = Number(warning);
    const criticalN = Number(critical);
    const currentN =
      currentValue.trim() === "" ? null : Number(currentValue);
    if ([targetN, warningN, criticalN].some((n) => Number.isNaN(n))) {
      setLocalError("Target and thresholds must be valid numbers.");
      return;
    }
    if (currentN != null && Number.isNaN(currentN)) {
      setLocalError("Current value must be numeric.");
      return;
    }
    const thresholdError = validateKpiThresholds({
      direction,
      target: targetN,
      warningThreshold: warningN,
      criticalThreshold: criticalN,
    });
    if (thresholdError) {
      setLocalError(thresholdError);
      return;
    }
    const status = calculateKpiStatus({
      value: currentN,
      target: targetN,
      warningThreshold: warningN,
      criticalThreshold: criticalN,
      direction,
    });
    const kpi: GovernanceKpi = {
      id: id.trim(),
      name: name.trim(),
      description: description.trim(),
      category,
      department,
      owner: owner.trim() || "Unassigned",
      frequency,
      unit,
      formula: formula.trim(),
      direction,
      target: targetN,
      warningThreshold: warningN,
      criticalThreshold: criticalN,
      currentValue: currentN,
      status,
      dataSource,
      periodStart,
      periodEnd,
      lastUpdated: todayIso(),
      evidenceNames: existing?.evidenceNames ?? [],
      notes,
      measurements: existing?.measurements ?? [],
    };
    onSave(kpi, isNew);
  }

  return (
    <div className={styles.modalBackdrop}>
      <form className={styles.modal} onSubmit={submit}>
        <h2 className={styles.modalTitle}>
          {isNew ? "Add KPI" : `Edit ${existing?.id}`}
        </h2>
        {(localError || error) && (
          <p className={styles.fieldValue} style={{ color: "var(--color-danger)" }}>
            {localError || error}
          </p>
        )}
        <div className={styles.formGrid}>
          <label>
            <span className={styles.fieldLabel}>KPI ID</span>
            <input
              className={styles.select}
              value={id}
              disabled={!isNew}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>KPI Name</span>
            <input
              className={styles.select}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Description</span>
            <textarea
              className={styles.select}
              style={{ height: 70, padding: 10 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Category</span>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as KpiCategory)}
            >
              {KPI_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Department</span>
            <select
              className={styles.select}
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value as GovernanceDepartment)
              }
            >
              {GOVERNANCE_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Owner</span>
            <input
              className={styles.select}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Frequency</span>
            <select
              className={styles.select}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as KpiFrequency)}
            >
              {KPI_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Unit</span>
            <select
              className={styles.select}
              value={unit}
              onChange={(e) => setUnit(e.target.value as KpiUnit)}
            >
              {KPI_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Performance Direction</span>
            <select
              className={styles.select}
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as PerformanceDirection)
              }
            >
              {PERFORMANCE_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Formula</span>
            <input
              className={styles.select}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Target</span>
            <input
              className={styles.select}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Warning Threshold</span>
            <input
              className={styles.select}
              value={warning}
              onChange={(e) => setWarning(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Critical Threshold</span>
            <input
              className={styles.select}
              value={critical}
              onChange={(e) => setCritical(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Current Value</span>
            <input
              className={styles.select}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Data Source</span>
            <select
              className={styles.select}
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value as KpiDataSource)}
            >
              {KPI_DATA_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.fieldLabel}>Period Start</span>
            <input
              className={styles.select}
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>Period End</span>
            <input
              className={styles.select}
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </label>
          <label className={styles.formFull}>
            <span className={styles.fieldLabel}>Notes</span>
            <textarea
              className={styles.select}
              style={{ height: 70, padding: 10 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isNew ? "Create KPI" : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}

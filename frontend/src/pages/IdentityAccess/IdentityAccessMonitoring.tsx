import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Undo2 } from "lucide-react";
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
import SeverityBadge from "../../components/ui/SeverityBadge";
import IdentityDrawer from "../../components/identity/IdentityDrawer";
import IdentityRowMenu from "../../components/identity/IdentityRowMenu";
import { identityMonitoringData } from "../../mocks/data/identityData";
import type {
  BehaviorStatus,
  IdentityMonitoringRow,
  PolicyStatus,
  RiskLevel,
} from "../../mocks/types/identity";
import { identitySchema } from "../../services/excel/moduleSchemas";
import { useOperationalModuleData } from "../../services/excel/useOperationalModuleData";
import {
  fetchIdentityMonitoring,
  replaceIdentities,
} from "../../services/api/identityApi";
import {
  getModuleRows,
  resetModuleStore,
} from "../../mocks/services/operationalDataStore";
import { SEARCH_MAX_LENGTH } from "../../utils/security";
import styles from "./IdentityAccessMonitoring.module.css";

const RISK_OPTIONS: Array<RiskLevel | "All"> = [
  "All",
  "Low",
  "Medium",
  "High",
  "Critical",
];

const POLICY_OPTIONS: Array<PolicyStatus | "All"> = [
  "All",
  "Compliant",
  "Policy Warning",
  "Policy Violation",
  "Unauthorized Activity",
];

const EXPORT_COLUMNS = [
  { key: "id", header: "Identity ID" },
  { key: "employee", header: "Employee Name" },
  { key: "email", header: "Email" },
  { key: "department", header: "Department" },
  { key: "role", header: "Role" },
  { key: "lastLogin", header: "Last Login" },
  { key: "currentActivity", header: "Current Activity" },
  { key: "behaviorStatus", header: "Behavior Status" },
  { key: "riskLevel", header: "Risk Level" },
  { key: "policyStatus", header: "Policy Status" },
  { key: "recommendedAction", header: "Recommended Action" },
];

function behaviorTone(
  status: BehaviorStatus
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Normal" || status === "Baseline Matched") return "success";
  if (status === "Minor Deviation") return "warning";
  return "danger";
}

function policyTone(
  status: PolicyStatus
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Compliant") return "success";
  if (status === "Policy Warning") return "warning";
  return "danger";
}

function toFlat(row: IdentityMonitoringRow): Record<string, string> {
  return {
    id: row.id,
    employee: row.employee,
    email: row.email,
    department: row.department,
    role: row.role,
    lastLogin: row.lastLogin,
    currentActivity: row.currentActivity,
    behaviorStatus: row.behaviorStatus,
    riskLevel: row.riskLevel,
    policyStatus: row.policyStatus,
    recommendedAction: row.recommendedAction,
  };
}

function buildNew(values: Record<string, string>): IdentityMonitoringRow {
  return {
    id: values.id,
    employee: values.employee || "Unknown",
    email: values.email || "",
    department: values.department || "",
    role: values.role || "",
    lastLogin: values.lastLogin || "",
    currentActivity: values.currentActivity || "",
    behaviorStatus: (values.behaviorStatus as BehaviorStatus) || "Normal",
    riskLevel: (values.riskLevel as RiskLevel) || "Low",
    policyStatus: (values.policyStatus as PolicyStatus) || "Compliant",
    recommendedAction:
      (values.recommendedAction as IdentityMonitoringRow["recommendedAction"]) ||
      "No Action",
    baseline: [],
    recentActivities: [],
    deviations: [],
    policyViolations: [],
    accessHistory: [],
    relatedIncidents: [],
    aiRecommendation: "Imported via Excel merge (session prototype).",
  };
}

function mergeExisting(
  existing: IdentityMonitoringRow,
  values: Record<string, string>
): IdentityMonitoringRow {
  return {
    ...existing,
    employee: values.employee || existing.employee,
    email: values.email || existing.email,
    department: values.department || existing.department,
    role: values.role || existing.role,
    lastLogin: values.lastLogin || existing.lastLogin,
    currentActivity: values.currentActivity || existing.currentActivity,
    behaviorStatus:
      (values.behaviorStatus as BehaviorStatus) || existing.behaviorStatus,
    riskLevel: (values.riskLevel as RiskLevel) || existing.riskLevel,
    policyStatus:
      (values.policyStatus as PolicyStatus) || existing.policyStatus,
    recommendedAction:
      (values.recommendedAction as IdentityMonitoringRow["recommendedAction"]) ||
      existing.recommendedAction,
  };
}

export default function IdentityAccessMonitoring() {
  const [seedIdentities, setSeedIdentities] = useState(
    identityMonitoringData.identities
  );
  const { rows, flatRecords, affectedIds, canUndo, applyImport, undo } =
    useOperationalModuleData(
      "identity",
      seedIdentities,
      identitySchema,
      { toFlat, buildNew, mergeExisting }
    );

  useEffect(() => {
    let cancelled = false;
    void fetchIdentityMonitoring().then((bundle) => {
      if (cancelled) return;
      setSeedIdentities(bundle.identities);
      resetModuleStore(
        "identity",
        bundle.identities
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyImport = useCallback(
    (payload: Parameters<typeof applyImport>[0]) => {
      const result = applyImport(payload);
      void replaceIdentities(
        getModuleRows<IdentityMonitoringRow>("identity")
      ).catch(() => undefined);
      return result;
    },
    [applyImport]
  );

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [risk, setRisk] = useState<RiskLevel | "All">("All");
  const [policy, setPolicy] = useState<PolicyStatus | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightOnly, setHighlightOnly] = useState(false);

  const departments = useMemo(() => {
    const set = new Set(rows.map((r) => r.department));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (highlightOnly && !affectedIds.includes(row.id)) return false;
      const matchesQuery =
        q.length === 0 ||
        row.employee.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q);
      const matchesDept = department === "All" || row.department === department;
      const matchesRisk = risk === "All" || row.riskLevel === risk;
      const matchesPolicy = policy === "All" || row.policyStatus === policy;
      return matchesQuery && matchesDept && matchesRisk && matchesPolicy;
    });
  }, [rows, query, department, risk, policy, highlightOnly, affectedIds]);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [selectedId, rows]
  );

  const filterSummary = [
    ...(query ? [{ label: "Search", value: query }] : []),
    ...(department !== "All"
      ? [{ label: "Department", value: department }]
      : []),
    ...(risk !== "All" ? [{ label: "Risk level", value: risk }] : []),
    ...(policy !== "All" ? [{ label: "Policy status", value: policy }] : []),
    ...(highlightOnly
      ? [{ label: "View", value: "Imported / updated only" }]
      : []),
  ];

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          title="Identity & Access Monitoring"
          description="Monitor user identities and compare current activities against established behavioral baselines to detect anomalies and policy violations."
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

        <p className={styles.prototypeNote} role="note">
          Session prototype: imported Identity records live in memory only and
          reset on refresh. Permanent storage requires backend integration.
        </p>

        <div className={styles.toolbar} role="search">
          <div className={styles.search}>
            <Search size={18} aria-hidden />
            <label className={styles.srOnly} htmlFor="identity-search">
              Search employee
            </label>
            <input
              id="identity-search"
              type="search"
              placeholder="Search employee"
              value={query}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(event) =>
                setQuery(event.target.value.slice(0, SEARCH_MAX_LENGTH))
              }
              autoComplete="off"
            />
          </div>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Department filter</span>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              aria-label="Department filter"
            >
              <option value="All">All departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Risk filter</span>
            <select
              value={risk}
              onChange={(event) =>
                setRisk(event.target.value as RiskLevel | "All")
              }
              aria-label="Risk filter"
            >
              {RISK_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All risk levels" : item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Status filter</span>
            <select
              value={policy}
              onChange={(event) =>
                setPolicy(event.target.value as PolicyStatus | "All")
              }
              aria-label="Status filter"
            >
              {POLICY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All statuses" : item}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.toolbarActions}>
            <ImportMergeExcelButton onClick={() => setImportOpen(true)} />
            <ExportCurrentViewButton onClick={() => setExportOpen(true)} />
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
                Undo Last Import
              </Button>
            ) : null}
            {highlightOnly ? (
              <Button variant="ghost" onClick={() => setHighlightOnly(false)}>
                Clear import filter
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => setNotice("Table refreshed from session store.")}
            >
              <RefreshCw size={16} aria-hidden />
              Refresh
            </Button>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Employee</th>
                  <th scope="col">Department</th>
                  <th scope="col">Role</th>
                  <th scope="col">Last Login</th>
                  <th scope="col">Current Activity</th>
                  <th scope="col">Behavior Status</th>
                  <th scope="col">Risk Level</th>
                  <th scope="col">Policy Status</th>
                  <th scope="col">Recommended Action</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={styles.emptyCell}>
                      No identities match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className={`${styles.clickRow} ${affectedIds.includes(row.id) ? styles.importedRow : ""}`}
                      onClick={() => setSelectedId(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(row.id);
                        }
                      }}
                    >
                      <td>
                        <div className={styles.employeeCell}>
                          <strong>{row.employee}</strong>
                          <span>
                            {row.email} آ· {row.id}
                          </span>
                        </div>
                      </td>
                      <td>{row.department}</td>
                      <td>{row.role}</td>
                      <td>{row.lastLogin}</td>
                      <td>
                        <span className={styles.activity}>
                          {row.currentActivity}
                        </span>
                      </td>
                      <td>
                        <StatusBadge
                          label={row.behaviorStatus}
                          tone={behaviorTone(row.behaviorStatus)}
                        />
                      </td>
                      <td>
                        <SeverityBadge severity={row.riskLevel} />
                      </td>
                      <td>
                        <StatusBadge
                          label={row.policyStatus}
                          tone={policyTone(row.policyStatus)}
                        />
                      </td>
                      <td>{row.recommendedAction}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <IdentityRowMenu
                          employeeName={row.employee}
                          onAction={(action) => {
                            if (
                              action === "View Details" ||
                              action === "Compare with Baseline" ||
                              action === "View Timeline" ||
                              action === "Generate AI Explanation"
                            ) {
                              setSelectedId(row.id);
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <IdentityDrawer
        open={Boolean(selected)}
        identity={selected}
        onClose={() => setSelectedId(null)}
      />

      <ExcelImportWizard
        open={importOpen}
        schema={identitySchema}
        existingRecords={flatRecords}
        onClose={() => setImportOpen(false)}
        onApply={handleApplyImport}
        onViewImported={() => {
          setHighlightOnly(true);
          setNotice("Showing imported or updated identity rows.");
        }}
      />

      <ExcelExportDialog
        open={exportOpen}
        moduleLabel={identitySchema.moduleLabel}
        filenamePrefix={identitySchema.filenamePrefix}
        sheetName={identitySchema.sheetName}
        columns={EXPORT_COLUMNS}
        rows={filtered.map((row) => toFlat(row))}
        filterSummary={filterSummary}
        onClose={() => setExportOpen(false)}
      />
    </DashboardLayout>
  );
}


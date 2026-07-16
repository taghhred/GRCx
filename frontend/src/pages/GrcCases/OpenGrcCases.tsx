import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import SeverityBadge from "../../components/ui/SeverityBadge";
import GrcCaseDrawer from "../../components/grcCases/GrcCaseDrawer";
import { assignedGrcCasesSeed } from "../../mocks/data/grcCasesData";
import type {
  CaseQueueView,
  SoarGrcCase,
  SoarGrcCaseStatus,
  SoarGrcSeverity,
} from "../../mocks/types/grcCases";
import {
  CLOSED_CASE_STATUSES,
  OPEN_CASE_STATUSES,
} from "../../mocks/types/grcCases";
import { CURRENT_USER } from "../../mocks/services/collaborationService";
import { clearAiSelection, setAiSelection } from "../../components/ai/aiSelectionBridge";
import { SEARCH_MAX_LENGTH } from "../../utils/security";
import styles from "./OpenGrcCases.module.css";

const QUEUE_VIEWS: Array<{ id: CaseQueueView; label: string }> = [
  { id: "mine", label: "Assigned To Me" },
  { id: "all", label: "All Cases" },
  { id: "team", label: "Team Cases" },
  { id: "closed", label: "Closed Cases" },
  { id: "archived", label: "Archived Cases" },
];

function statusTone(
  status: SoarGrcCaseStatus
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Closed" || status === "Resolved" || status === "Archived") {
    return "success";
  }
  if (status === "Rejected") return "danger";
  if (status === "Pending Evidence" || status === "Pending Approval") {
    return "warning";
  }
  if (status === "In Progress" || status === "Assigned") return "info";
  return "neutral";
}

function slaClass(state: SoarGrcCase["slaState"]): string {
  if (state === "Breached") return styles.slaBreach;
  if (state === "At Risk") return styles.slaRisk;
  return styles.slaOn;
}

function parseCaseDay(value: string): string {
  return value.slice(0, 10);
}

export default function OpenGrcCases() {
  const [cases, setCases] = useState<SoarGrcCase[]>(assignedGrcCasesSeed);
  const [view, setView] = useState<CaseQueueView>("mine");
  const [query, setQuery] = useState("");
  const [quickUnassigned, setQuickUnassigned] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickClosed, setQuickClosed] = useState(false);
  const [quickHigh, setQuickHigh] = useState(false);
  const [quickCritical, setQuickCritical] = useState(false);
  const [department, setDepartment] = useState("All");
  const [framework, setFramework] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const departments = useMemo(
    () => [...new Set(cases.map((c) => c.department))].sort(),
    [cases]
  );
  const frameworks = useMemo(
    () => [...new Set(cases.map((c) => c.framework))].sort(),
    [cases]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((item) => {
      if (view === "mine") {
        if (item.archived) return false;
        if (item.assignedTo !== CURRENT_USER.name) return false;
        if (CLOSED_CASE_STATUSES.includes(item.status)) return false;
      } else if (view === "all") {
        if (item.archived) return false;
      } else if (view === "team") {
        if (item.archived) return false;
        if (item.assignedTo === CURRENT_USER.name) return false;
        if (item.assignedTo === "Unassigned") return false;
        if (CLOSED_CASE_STATUSES.includes(item.status)) return false;
      } else if (view === "closed") {
        if (item.archived) return false;
        if (!CLOSED_CASE_STATUSES.includes(item.status)) return false;
      } else if (view === "archived") {
        if (!item.archived && item.status !== "Archived") return false;
      }

      if (quickUnassigned && item.assignedTo !== "Unassigned") return false;
      if (quickOpen && !OPEN_CASE_STATUSES.includes(item.status)) return false;
      if (quickClosed && !CLOSED_CASE_STATUSES.includes(item.status)) return false;
      if (quickHigh && item.severity !== "High") return false;
      if (quickCritical && item.severity !== "Critical") return false;
      if (department !== "All" && item.department !== department) return false;
      if (framework !== "All" && item.framework !== framework) return false;

      if (dateFrom && parseCaseDay(item.createdAt) < dateFrom) return false;
      if (dateTo && parseCaseDay(item.createdAt) > dateTo) return false;

      if (q.length === 0) return true;
      const haystack = [
        item.caseId,
        item.title,
        item.assignedTo,
        item.owner,
        item.department,
        item.framework,
        item.control,
        item.affectedAsset,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    cases,
    view,
    query,
    quickUnassigned,
    quickOpen,
    quickClosed,
    quickHigh,
    quickCritical,
    department,
    framework,
    dateFrom,
    dateTo,
  ]);

  const mineOpenCount = useMemo(
    () =>
      cases.filter(
        (c) =>
          !c.archived &&
          c.assignedTo === CURRENT_USER.name &&
          OPEN_CASE_STATUSES.includes(c.status)
      ).length,
    [cases]
  );

  const selected = cases.find((c) => c.caseId === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      clearAiSelection();
      return;
    }
    setAiSelection({
      selectedCaseId: selected.caseId,
      entityTitle: selected.title,
      assignedAuditor:
        selected.assignedTo !== "Unassigned" ? selected.assignedTo : selected.owner,
      selectedFramework: selected.framework,
      selectedAssetId: selected.affectedAsset,
    });
    return () => clearAiSelection();
  }, [selected]);

  const summaryLabel = (() => {
    if (view === "mine") {
      return (
        <>
          Showing: <strong>{mineOpenCount} Open Cases Assigned to You</strong>
        </>
      );
    }
    if (view === "all") {
      return (
        <>
          Showing: <strong>{filtered.length} Cases</strong> (all non-archived)
        </>
      );
    }
    if (view === "team") {
      return (
        <>
          Showing: <strong>{filtered.length} Team Cases</strong>
        </>
      );
    }
    if (view === "closed") {
      return (
        <>
          Showing: <strong>{filtered.length} Closed Cases</strong>
        </>
      );
    }
    return (
      <>
        Showing: <strong>{filtered.length} Archived Cases</strong>
      </>
    );
  })();

  const updateCase = (next: SoarGrcCase) => {
    setCases((prev) => prev.map((c) => (c.caseId === next.caseId ? next : c)));
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          title="SOAR Queue"
          description="Central queue of governance cases received from SOAR after detection, correlation, enrichment, and automation. GRC specialists review incoming cases here."
        />

        <p className={styles.prototypeNote}>
          Workflow: SOAR detects → creates case → closes its alert → pushes to GRCx as
          New → auto-assigned to an active GRC specialist by load, department, and
          specialization.
        </p>

        <div className={styles.queueBar} role="tablist" aria-label="Case queue">
          {QUEUE_VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              className={`${styles.queueChip} ${
                view === item.id ? styles.queueChipActive : ""
              }`}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className={styles.summary} aria-live="polite">
          {summaryLabel}
        </p>

        <div className={styles.toolbar} aria-label="Filters">
          <label className={styles.search}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Search cases, assets, controls…"
              value={query}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search"
            />
          </label>

          <button
            type="button"
            className={`${styles.filterChip} ${quickUnassigned ? styles.filterChipOn : ""}`}
            onClick={() => setQuickUnassigned((v) => !v)}
          >
            Unassigned
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${quickOpen ? styles.filterChipOn : ""}`}
            onClick={() => setQuickOpen((v) => !v)}
          >
            Open
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${quickClosed ? styles.filterChipOn : ""}`}
            onClick={() => setQuickClosed((v) => !v)}
          >
            Closed
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${quickHigh ? styles.filterChipOn : ""}`}
            onClick={() => setQuickHigh((v) => !v)}
          >
            High
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${quickCritical ? styles.filterChipOn : ""}`}
            onClick={() => setQuickCritical((v) => !v)}
          >
            Critical
          </button>

          <select
            aria-label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="All">Department</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            aria-label="Framework"
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
          >
            <option value="All">Framework</option>
            {frameworks.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className={styles.tableCard}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No cases match the current filters.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Case ID</th>
                    <th scope="col">Source</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Status</th>
                    <th scope="col">Control</th>
                    <th scope="col">Framework</th>
                    <th scope="col">Affected Asset</th>
                    <th scope="col">Department</th>
                    <th scope="col">Assigned To</th>
                    <th scope="col">Created Time</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col">SLA</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.caseId}
                      tabIndex={0}
                      onClick={() => setSelectedId(row.caseId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(row.caseId);
                        }
                      }}
                    >
                      <td className={styles.caseId}>{row.caseId}</td>
                      <td>{row.source}</td>
                      <td>
                        <SeverityBadge severity={row.severity as SoarGrcSeverity} />
                      </td>
                      <td>
                        <StatusBadge
                          label={row.status}
                          tone={statusTone(row.status)}
                        />
                      </td>
                      <td>{row.control}</td>
                      <td>{row.framework}</td>
                      <td>{row.affectedAsset}</td>
                      <td>{row.department}</td>
                      <td>{row.assignedTo}</td>
                      <td className={styles.muted}>{row.createdAt}</td>
                      <td className={styles.muted}>{row.updatedAt}</td>
                      <td className={slaClass(row.slaState)}>{row.slaState}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(row.caseId);
                            }}
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <GrcCaseDrawer
          key={selected?.caseId ?? "closed"}
          caseItem={selected}
          open={Boolean(selected)}
          onClose={() => setSelectedId(null)}
          onUpdate={updateCase}
        />
      </div>
    </DashboardLayout>
  );
}

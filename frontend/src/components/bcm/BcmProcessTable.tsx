import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Columns3,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import type { CriticalBusinessProcess } from "../../mocks/types/bcm";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import styles from "./BcmProcessTable.module.css";

export type BcmSortKey =
  | "id"
  | "name"
  | "businessUnit"
  | "department"
  | "owner"
  | "criticality"
  | "businessImpact"
  | "rto"
  | "rpo"
  | "mao"
  | "recoveryStrategy"
  | "recoveryTeam"
  | "status"
  | "lastTest"
  | "nextTest"
  | "nextReview"
  | "version";

export interface BcmColumnDef {
  key: BcmSortKey | "dependencies" | "actions";
  label: string;
  width: number;
  sortable?: boolean;
  defaultHidden?: boolean;
}

export const BCM_COLUMNS: BcmColumnDef[] = [
  { key: "id", label: "Process ID", width: 130, sortable: true },
  { key: "name", label: "Business Process", width: 190, sortable: true },
  { key: "businessUnit", label: "Business Unit", width: 140, sortable: true },
  { key: "department", label: "Department", width: 140, sortable: true },
  { key: "owner", label: "Owner", width: 110, sortable: true },
  { key: "criticality", label: "Criticality", width: 110, sortable: true },
  { key: "businessImpact", label: "Business Impact", width: 130, sortable: true },
  { key: "rto", label: "RTO", width: 90, sortable: true },
  { key: "rpo", label: "RPO", width: 90, sortable: true },
  { key: "mao", label: "MAO", width: 90, sortable: true },
  { key: "recoveryStrategy", label: "Recovery Strategy", width: 150, sortable: true },
  { key: "dependencies", label: "Dependencies", width: 180 },
  { key: "recoveryTeam", label: "Recovery Team", width: 140, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
  { key: "lastTest", label: "Last Test", width: 110, sortable: true },
  { key: "nextTest", label: "Next Test", width: 110, sortable: true },
  { key: "nextReview", label: "Next Review", width: 120, sortable: true },
  { key: "version", label: "Version", width: 90, sortable: true },
  { key: "actions", label: "Actions", width: 88 },
];

const ROW_HEIGHT = 48;
const OVERSCAN = 8;
const PAGE_SIZES = [25, 50, 100, 250];

const CRITICALITY_RANK: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function processStatusTone(
  status: CriticalBusinessProcess["status"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Ready") return "success";
  if (status === "Testing") return "info";
  if (status === "At Risk") return "danger";
  if (status === "Review") return "warning";
  return "neutral";
}

function compareValues(
  a: CriticalBusinessProcess,
  b: CriticalBusinessProcess,
  key: BcmSortKey
): number {
  if (key === "criticality" || key === "businessImpact") {
    const aRank = CRITICALITY_RANK[String(a[key])] ?? 0;
    const bRank = CRITICALITY_RANK[String(b[key])] ?? 0;
    return aRank - bRank;
  }
  return String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

interface BcmProcessTableProps {
  rows: CriticalBusinessProcess[];
  affectedIds: string[];
  onRowOpen: (process: CriticalBusinessProcess) => void;
}

export default function BcmProcessTable({
  rows,
  affectedIds,
  onRowOpen,
}: BcmProcessTableProps) {
  const [sortKey, setSortKey] = useState<BcmSortKey>("criticality");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(BCM_COLUMNS.map((c) => [c.key, c.width]))
  );
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(BCM_COLUMNS.filter((c) => c.defaultHidden).map((c) => c.key))
  );
  const [colsOpen, setColsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const resizeState = useRef<{ key: string; startX: number; startW: number } | null>(
    null
  );

  const visibleColumns = useMemo(
    () => BCM_COLUMNS.filter((c) => !hidden.has(c.key)),
    [hidden]
  );

  const sorted = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      const cmp = compareValues(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return next;
  }, [rows, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => {
    const start = safePage * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  useEffect(() => {
    setPage(0);
    scrollRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [rows, pageSize, sortKey, sortDir]);

  const totalWidth = visibleColumns.reduce(
    (sum, col) => sum + (widths[col.key] ?? col.width),
    0
  );

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount =
    Math.ceil((scrollRef.current?.clientHeight ?? 420) / ROW_HEIGHT) +
    OVERSCAN * 2;
  const endIndex = Math.min(pageRows.length, startIndex + visibleCount);
  const virtualRows = pageRows.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(0, (pageRows.length - endIndex) * ROW_HEIGHT);

  const onSort = (key: BcmSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "criticality" ? "desc" : "asc");
    }
  };

  const onResizeStart = useCallback(
    (key: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      resizeState.current = {
        key,
        startX: event.clientX,
        startW: widths[key] ?? 120,
      };
      const onMove = (ev: MouseEvent) => {
        if (!resizeState.current) return;
        const delta = ev.clientX - resizeState.current.startX;
        const next = Math.max(72, resizeState.current.startW + delta);
        setWidths((prev) => ({ ...prev, [resizeState.current!.key]: next }));
      };
      const onUp = () => {
        resizeState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [widths]
  );

  const toggleColumn = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (key !== "name" && key !== "actions") next.add(key);
      return next;
    });
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableToolbar}>
        <p className={styles.meta} role="status">
          Showing{" "}
          <strong>
            {sorted.length === 0
              ? 0
              : `${safePage * pageSize + 1}–${Math.min(
                  (safePage + 1) * pageSize,
                  sorted.length
                )}`}
          </strong>{" "}
          of <strong>{sorted.length}</strong> processes
        </p>
        <div className={styles.toolbarRight}>
          <div className={styles.colsWrap}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-expanded={colsOpen}
              aria-haspopup="true"
              aria-label="Toggle column visibility"
              onClick={() => setColsOpen((o) => !o)}
            >
              <Columns3 size={16} aria-hidden />
              Columns
            </button>
            {colsOpen ? (
              <div className={styles.colsMenu} role="menu">
                {BCM_COLUMNS.filter((c) => c.key !== "actions").map((col) => (
                  <label key={col.key} className={styles.colsItem} role="menuitemcheckbox">
                    <input
                      type="checkbox"
                      checked={!hidden.has(col.key)}
                      disabled={col.key === "name"}
                      onChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <label className={styles.pageSize}>
            <span className={styles.srOnly}>Rows per page</span>
            <select
              value={pageSize}
              aria-label="Rows per page"
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={styles.tableWrap}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        role="region"
        aria-label="Critical business processes table"
      >
        <table className={styles.table} style={{ width: totalWidth, minWidth: "100%" }}>
          <thead>
            <tr>
              {visibleColumns.map((col) => {
                const sortable = Boolean(col.sortable);
                const active = sortable && sortKey === col.key;
                const style: CSSProperties = {
                  width: widths[col.key],
                  minWidth: widths[col.key],
                  maxWidth: widths[col.key],
                };
                return (
                  <th key={col.key} scope="col" style={style}>
                    {sortable ? (
                      <button
                        type="button"
                        className={styles.sortBtn}
                        onClick={() => onSort(col.key as BcmSortKey)}
                        aria-label={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        {active ? (
                          sortDir === "asc" ? (
                            <ChevronUp size={14} aria-hidden />
                          ) : (
                            <ChevronDown size={14} aria-hidden />
                          )
                        ) : (
                          <span className={styles.sortGhost} aria-hidden />
                        )}
                      </button>
                    ) : (
                      <span className={styles.headLabel}>{col.label}</span>
                    )}
                    {col.key !== "actions" ? (
                      <span
                        className={styles.resizer}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${col.label} column`}
                        onMouseDown={(e) => onResizeStart(col.key, e)}
                      />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className={styles.emptyCell}>
                  No processes match the current filters.
                </td>
              </tr>
            ) : (
              <>
                {topPad > 0 ? (
                  <tr aria-hidden className={styles.padRow}>
                    <td
                      colSpan={visibleColumns.length}
                      style={{ height: topPad, padding: 0, border: "none" }}
                    />
                  </tr>
                ) : null}
                {virtualRows.map((process) => (
                  <tr
                    key={process.id}
                    tabIndex={0}
                    className={`${styles.clickRow} ${
                      affectedIds.includes(process.id) ? styles.importedRow : ""
                    }`}
                    onClick={() => onRowOpen(process)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowOpen(process);
                      }
                    }}
                  >
                    {visibleColumns.map((col) => {
                      const style: CSSProperties = {
                        width: widths[col.key],
                        minWidth: widths[col.key],
                        maxWidth: widths[col.key],
                      };
                      if (col.key === "dependencies") {
                        return (
                          <td key={col.key} style={style} title={process.dependencies.join(", ")}>
                            {process.dependencies.slice(0, 2).join(", ")}
                            {process.dependencies.length > 2
                              ? ` +${process.dependencies.length - 2}`
                              : ""}
                          </td>
                        );
                      }
                      if (col.key === "criticality") {
                        return (
                          <td key={col.key} style={style}>
                            <SeverityBadge severity={process.criticality} />
                          </td>
                        );
                      }
                      if (col.key === "businessImpact") {
                        return (
                          <td key={col.key} style={style}>
                            <SeverityBadge
                              severity={
                                process.businessImpact === "Severe"
                                  ? "Critical"
                                  : process.businessImpact === "Major"
                                    ? "High"
                                    : process.businessImpact === "Moderate"
                                      ? "Medium"
                                      : "Low"
                              }
                            />
                          </td>
                        );
                      }
                      if (col.key === "status") {
                        return (
                          <td key={col.key} style={style}>
                            <StatusBadge
                              label={process.status}
                              tone={processStatusTone(process.status)}
                            />
                          </td>
                        );
                      }
                      if (col.key === "name") {
                        return (
                          <td key={col.key} style={style}>
                            <strong>{process.name}</strong>
                          </td>
                        );
                      }
                      if (col.key === "actions") {
                        return (
                          <td key={col.key} style={style} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={styles.rowAction}
                              aria-label={`Open details for ${process.name}`}
                              title="Open details"
                              onClick={() => onRowOpen(process)}
                            >
                              <Eye size={15} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className={styles.rowAction}
                              aria-label={`More actions for ${process.name}`}
                              title="More actions"
                              onClick={() => onRowOpen(process)}
                            >
                              <MoreHorizontal size={15} aria-hidden />
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} style={style}>
                          {String(process[col.key as BcmSortKey] ?? "—")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {bottomPad > 0 ? (
                  <tr aria-hidden className={styles.padRow}>
                    <td
                      colSpan={visibleColumns.length}
                      style={{ height: bottomPad, padding: 0, border: "none" }}
                    />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pager}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={safePage <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </button>
        <span className={styles.pageLabel}>
          Page {safePage + 1} of {pageCount}
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={safePage >= pageCount - 1}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

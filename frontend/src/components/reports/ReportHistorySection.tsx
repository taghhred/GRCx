import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  Search,
  Trash2,
} from "lucide-react";
import type {
  EnterpriseReportType,
  Report,
  ReportClassification,
  ReportStatus,
} from "../../mocks/types/reports";
import {
  ENTERPRISE_REPORT_TYPES,
  REPORT_CLASSIFICATIONS,
} from "../../mocks/types/reports";
import { displayFirstName } from "../../utils/reportDisplay";
import ReportStatusBadge from "./ReportStatusBadge";
import styles from "./ReportHistorySection.module.css";

export type HistoryAction = "Preview" | "Download" | "Delete";

type DatePreset =
  | "All"
  | "Today"
  | "Last 7 Days"
  | "Last 30 Days"
  | "This Month"
  | "Custom Range";

interface ReportHistorySectionProps {
  reports: Report[];
  onAction: (report: Report, action: HistoryAction) => void;
}

function useDebounced<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function matchesDatePreset(
  issueDate: string,
  preset: DatePreset,
  dateFrom: string,
  dateTo: string
): boolean {
  if (preset === "All") return true;
  if (!issueDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === "Today") return issueDate === toIsoDate(today);

  if (preset === "Last 7 Days") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return issueDate >= toIsoDate(from) && issueDate <= toIsoDate(today);
  }

  if (preset === "Last 30 Days") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return issueDate >= toIsoDate(from) && issueDate <= toIsoDate(today);
  }

  if (preset === "This Month") {
    const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    return issueDate.startsWith(prefix);
  }

  if (preset === "Custom Range") {
    if (dateFrom && issueDate < dateFrom) return false;
    if (dateTo && issueDate > dateTo) return false;
    return true;
  }

  return true;
}

const PAGE_SIZE = 10;

export default function ReportHistorySection({
  reports,
  onAction,
}: ReportHistorySectionProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query);
  const [datePreset, setDatePreset] = useState<DatePreset>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportType, setReportType] = useState<"All" | EnterpriseReportType>(
    "All"
  );
  const [department, setDepartment] = useState("All");
  const [creator, setCreator] = useState("All");
  const [classification, setClassification] = useState<
    "All" | ReportClassification
  >("All");
  const [status, setStatus] = useState<"All" | ReportStatus>("All");
  const [page, setPage] = useState(0);

  const departments = useMemo(
    () => [...new Set(reports.map((r) => r.department).filter(Boolean))].sort(),
    [reports]
  );

  const creators = useMemo(
    () =>
      [
        ...new Set(
          reports.map((r) => displayFirstName(r.generatedBy)).filter(Boolean)
        ),
      ].sort(),
    [reports]
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (reportType !== "All" && r.reportType !== reportType) return false;
      if (department !== "All" && r.department !== department) return false;
      if (
        creator !== "All" &&
        displayFirstName(r.generatedBy) !== creator
      ) {
        return false;
      }
      if (classification !== "All" && r.classification !== classification) {
        return false;
      }
      if (status !== "All" && r.status !== status) return false;
      if (
        !matchesDatePreset(r.issueDate, datePreset, dateFrom, dateTo)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.reportType.toLowerCase().includes(q) ||
        displayFirstName(r.generatedBy).toLowerCase().includes(q)
      );
    });
  }, [
    reports,
    debouncedQuery,
    reportType,
    department,
    creator,
    classification,
    status,
    datePreset,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => setPage(0), [filtered.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <section className={styles.section} aria-labelledby="history-title">
      <div className={styles.head}>
        <div>
          <h2 id="history-title">Previous Reports</h2>
          <p>Browse, preview, and download prior PDF packages.</p>
        </div>
      </div>

      <div className={styles.toolbar} role="search">
        <div className={styles.search}>
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Search by report name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search by report name"
          />
        </div>

        <div className={styles.datePresets} role="group" aria-label="Date range">
          {(
            [
              "All",
              "Today",
              "Last 7 Days",
              "Last 30 Days",
              "This Month",
              "Custom Range",
            ] as DatePreset[]
          ).map((preset) => (
            <button
              key={preset}
              type="button"
              className={`${styles.presetChip} ${
                datePreset === preset ? styles.presetChipActive : ""
              }`}
              onClick={() => setDatePreset(preset)}
            >
              {preset === "All" ? "All dates" : preset}
            </button>
          ))}
        </div>

        {datePreset === "Custom Range" ? (
          <div className={styles.customRange}>
            <input
              type="date"
              value={dateFrom}
              aria-label="From date"
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              aria-label="To date"
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        ) : null}

        <select
          value={reportType}
          aria-label="Report type filter"
          onChange={(e) =>
            setReportType(e.target.value as "All" | EnterpriseReportType)
          }
        >
          <option value="All">All types</option>
          {ENTERPRISE_REPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={department}
          aria-label="Department filter"
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="All">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={classification}
          aria-label="Classification filter"
          onChange={(e) =>
            setClassification(e.target.value as "All" | ReportClassification)
          }
        >
          <option value="All">All classifications</option>
          {REPORT_CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={creator}
          aria-label="Generated by filter"
          onChange={(e) => setCreator(e.target.value)}
        >
          <option value="All">All creators</option>
          {creators.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={status}
          aria-label="Status filter"
          onChange={(e) => setStatus(e.target.value as "All" | ReportStatus)}
        >
          <option value="All">All statuses</option>
          {(
            [
              "Draft",
              "Generating",
              "Ready",
              "Approved",
              "Archived",
              "Failed",
            ] as ReportStatus[]
          ).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <p className={styles.meta}>
        Showing <strong>{filtered.length}</strong> reports
      </p>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Type</th>
                <th>Generated By</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Classification</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.empty}>
                    No reports match the current filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((report) => (
                  <tr key={report.id}>
                    <td title={report.name}>
                      <strong>{report.name}</strong>
                    </td>
                    <td>{report.reportType}</td>
                    <td>{displayFirstName(report.generatedBy)}</td>
                    <td>{report.issueDate}</td>
                    <td>{report.generatedTime}</td>
                    <td>
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td>
                      <span className={styles.classTag}>
                        {report.classification}
                      </span>
                    </td>
                    <td>{report.version}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          title="Preview"
                          aria-label={`Preview ${report.name}`}
                          onClick={() => onAction(report, "Preview")}
                        >
                          <Eye size={14} aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Download PDF"
                          aria-label={`Download ${report.name}`}
                          onClick={() => onAction(report, "Download")}
                        >
                          <Download size={14} aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label={`Delete ${report.name}`}
                          className={styles.dangerAction}
                          onClick={() => onAction(report, "Delete")}
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
        <div className={styles.pager}>
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

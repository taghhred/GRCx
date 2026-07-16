import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Report } from "../../mocks/types/reports";
import { displayFirstName } from "../../utils/reportDisplay";
import ReportStatusBadge from "./ReportStatusBadge";
import styles from "./ReportsHistoryTable.module.css";
import menuStyles from "../identity/IdentityRowMenu.module.css";

export type ReportHistoryAction =
  | "Preview"
  | "Download PDF"
  | "Duplicate"
  | "Rename"
  | "Archive"
  | "Delete Draft"
  | "Open Details";

export type ReportSortKey =
  | "reportId"
  | "name"
  | "reportType"
  | "reportingPeriod"
  | "issueDate"
  | "generatedTime"
  | "auditor"
  | "status"
  | "version"
  | "classification"
  | "generatedBy";

interface ReportsHistoryTableProps {
  reports: Report[];
  emptyMessage: string;
  sortKey: ReportSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: ReportSortKey) => void;
  onRowClick: (report: Report) => void;
  onAction: (report: Report, action: ReportHistoryAction) => void;
}

const ACTIONS: ReportHistoryAction[] = [
  "Preview",
  "Download PDF",
  "Duplicate",
  "Rename",
  "Archive",
  "Delete Draft",
];

function RowMenu({
  report,
  onAction,
}: {
  report: Report;
  onAction: (action: ReportHistoryAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={menuStyles.root} ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={menuStyles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Actions for ${report.reportId}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className={menuStyles.menu}
          role="menu"
          aria-labelledby={triggerId}
          onClick={(event) => event.stopPropagation()}
        >
          {ACTIONS.map((action) => {
            if (action === "Delete Draft" && report.status !== "Draft") {
              return null;
            }
            return (
              <button
                key={action}
                type="button"
                role="menuitem"
                className={menuStyles.item}
                onClick={() => {
                  setOpen(false);
                  onAction(action);
                }}
              >
                {action}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: ReportSortKey;
  sortKey: ReportSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: ReportSortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <th scope="col">
      <button
        type="button"
        className={`${styles.sortBtn} ${active ? styles.sortActive : ""}`}
        onClick={() => onSort(column)}
        aria-sort={
          active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        {label}
        <span aria-hidden>{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</span>
      </button>
    </th>
  );
}

export default function ReportsHistoryTable({
  reports,
  emptyMessage,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  onAction,
}: ReportsHistoryTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <SortHeader
                label="Report ID"
                column="reportId"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Report Name"
                column="name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Report Type"
                column="reportType"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Reporting Period"
                column="reportingPeriod"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Issue Date"
                column="issueDate"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Issue Time"
                column="generatedTime"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Created By"
                column="generatedBy"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Auditor"
                column="auditor"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <th scope="col">Frameworks</th>
              <SortHeader
                label="Status"
                column="status"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Version"
                column="version"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Classification"
                column="classification"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={13} className={styles.empty}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report.id}
                  className={styles.row}
                  tabIndex={0}
                  onClick={() => onRowClick(report)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(report);
                    }
                  }}
                >
                  <td>
                    <strong>{report.reportId}</strong>
                  </td>
                  <td>{report.name}</td>
                  <td>
                    <span
                      className={`${styles.typeBadge} ${
                        report.category === "Executive"
                          ? styles.typeExecutive
                          : styles.typeDetailed
                      }`}
                    >
                      {report.reportType}
                    </span>
                  </td>
                  <td>{report.reportingPeriod}</td>
                  <td>{report.issueDate}</td>
                  <td>{report.generatedTime}</td>
                  <td>{displayFirstName(report.generatedBy)}</td>
                  <td>{report.auditor}</td>
                  <td title={report.frameworks.join(", ")}>
                    {report.frameworks.join(", ")}
                  </td>
                  <td>
                    <ReportStatusBadge status={report.status} />
                  </td>
                  <td>{report.version}</td>
                  <td>
                    <span className={styles.classTag}>{report.classification}</span>
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <div className={styles.quickActions}>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => onAction(report, "Preview")}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => onAction(report, "Download PDF")}
                      >
                        Download PDF
                      </button>
                      <RowMenu
                        report={report}
                        onAction={(action) => onAction(report, action)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

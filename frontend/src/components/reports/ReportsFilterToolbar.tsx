import type { ReportCategory, ReportStatus } from "../../mocks/types/reports";
import { RefreshCw, Search, X } from "lucide-react";
import Button from "../common/Button";
import { SEARCH_MAX_LENGTH } from "../../utils/security";
import styles from "./ReportsFilterToolbar.module.css";

export interface ReportsFilters {
  query: string;
  reportType: ReportCategory | "All";
  period: string;
  status: ReportStatus | "All";
  auditor: string;
  framework: string;
  createdBy: string;
}

interface ReportsFilterToolbarProps {
  filters: ReportsFilters;
  auditors: string[];
  frameworks: string[];
  createdByOptions: string[];
  onChange: (next: ReportsFilters) => void;
  onClear: () => void;
  onRefresh: () => void;
}

export default function ReportsFilterToolbar({
  filters,
  auditors,
  frameworks,
  createdByOptions,
  onChange,
  onClear,
  onRefresh,
}: ReportsFilterToolbarProps) {
  const patch = (partial: Partial<ReportsFilters>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <Search size={18} aria-hidden />
        <label className={styles.srOnly} htmlFor="reports-search">
          Search reports
        </label>
        <input
          id="reports-search"
          type="search"
          placeholder="Search reports"
          value={filters.query}
          maxLength={SEARCH_MAX_LENGTH}
          onChange={(event) =>
            patch({ query: event.target.value.slice(0, SEARCH_MAX_LENGTH) })
          }
          autoComplete="off"
        />
      </div>

      <label className={styles.filter}>
        <span className={styles.srOnly}>Report type filter</span>
        <select
          aria-label="Report type filter"
          value={filters.reportType}
          onChange={(event) =>
            patch({
              reportType: event.target.value as ReportCategory | "All",
            })
          }
        >
          <option value="All">All Reports</option>
          <option value="Executive">Executive</option>
          <option value="Detailed">Detailed</option>
        </select>
      </label>

      <label className={styles.filter}>
        <span className={styles.srOnly}>Reporting period filter</span>
        <select
          aria-label="Reporting period filter"
          value={filters.period}
          onChange={(event) => patch({ period: event.target.value })}
        >
          <option value="All">All periods</option>
          <option value="2026-05">May 2026</option>
          <option value="2026-06">June 2026</option>
          <option value="2026-07">July 2026</option>
          <option value="2026">Year 2026</option>
          <option value="Q2">Quarter packs</option>
        </select>
      </label>

      <label className={styles.filter}>
        <span className={styles.srOnly}>Status filter</span>
        <select
          aria-label="Status filter"
          value={filters.status}
          onChange={(event) =>
            patch({ status: event.target.value as ReportStatus | "All" })
          }
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
            ] as const
          ).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filter}>
        <span className={styles.srOnly}>Auditor filter</span>
        <select
          aria-label="Auditor filter"
          value={filters.auditor}
          onChange={(event) => patch({ auditor: event.target.value })}
        >
          <option value="All">All auditors</option>
          {auditors.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filter}>
        <span className={styles.srOnly}>Framework filter</span>
        <select
          aria-label="Framework filter"
          value={filters.framework}
          onChange={(event) => patch({ framework: event.target.value })}
        >
          <option value="All">All frameworks</option>
          {frameworks.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filter}>
        <span className={styles.srOnly}>Created by filter</span>
        <select
          aria-label="Created by filter"
          value={filters.createdBy}
          onChange={(event) => patch({ createdBy: event.target.value })}
        >
          <option value="All">All authors</option>
          {createdByOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClear}>
          <X size={16} aria-hidden />
          Clear Filters
        </Button>
        <Button variant="ghost" onClick={onRefresh}>
          <RefreshCw size={16} aria-hidden />
          Refresh
        </Button>
      </div>
    </div>
  );
}

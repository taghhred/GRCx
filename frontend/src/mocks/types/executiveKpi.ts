/**
 * Dashboard-only Splunk-style time range model.
 */

export type DashboardRefreshInterval = "off" | "30s" | "1m" | "5m";

export type DashboardTimePresetId =
  | "today"
  | "yesterday"
  | "last-24h"
  | "last-7d"
  | "last-30d"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "last-quarter"
  | "this-year"
  | "last-year"
  | "last-5m"
  | "last-15m"
  | "last-30m"
  | "last-1h"
  | "last-4h"
  | "last-6h"
  | "last-12h"
  | "last-3d"
  | "last-1w"
  | "last-2w"
  | "last-3m"
  | "rt-5m"
  | "rt-15m"
  | "rt-30m"
  | "custom";

/** @deprecated Alias for URL / KPI card compatibility */
export type DashboardDateRangeId = DashboardTimePresetId;

export interface DashboardTimeRange {
  preset: DashboardTimePresetId;
  startIso: string;
  endIso: string;
  label: string;
  /** Real-time window auto-refresh (Dashboard only). */
  refreshInterval?: DashboardRefreshInterval;
  realtime?: boolean;
}

export interface TimeRangePresetOption {
  id: DashboardTimePresetId;
  label: string;
  group: "quick" | "relative" | "realtime" | "custom";
}

export const DASHBOARD_TIMEZONE = {
  offsetLabel: "UTC+03",
  city: "Riyadh",
  offsetHours: 3,
} as const;

export const QUICK_TIME_PRESETS: TimeRangePresetOption[] = [
  { id: "today", label: "Today", group: "quick" },
  { id: "yesterday", label: "Yesterday", group: "quick" },
  { id: "last-24h", label: "Last 24 Hours", group: "quick" },
  { id: "last-7d", label: "Last 7 Days", group: "quick" },
  { id: "last-30d", label: "Last 30 Days", group: "quick" },
  { id: "this-month", label: "This Month", group: "quick" },
  { id: "last-month", label: "Last Month", group: "quick" },
  { id: "this-quarter", label: "This Quarter", group: "quick" },
  { id: "last-quarter", label: "Last Quarter", group: "quick" },
  { id: "this-year", label: "This Year", group: "quick" },
  { id: "last-year", label: "Last Year", group: "quick" },
];

export const RELATIVE_TIME_PRESETS: TimeRangePresetOption[] = [
  { id: "last-5m", label: "Last 5 Minutes", group: "relative" },
  { id: "last-15m", label: "Last 15 Minutes", group: "relative" },
  { id: "last-30m", label: "Last 30 Minutes", group: "relative" },
  { id: "last-1h", label: "Last 1 Hour", group: "relative" },
  { id: "last-4h", label: "Last 4 Hours", group: "relative" },
  { id: "last-6h", label: "Last 6 Hours", group: "relative" },
  { id: "last-12h", label: "Last 12 Hours", group: "relative" },
  { id: "last-24h", label: "Last 24 Hours", group: "relative" },
  { id: "last-3d", label: "Last 3 Days", group: "relative" },
  { id: "last-7d", label: "Last 7 Days", group: "relative" },
  { id: "last-1w", label: "Last 1 Week", group: "relative" },
  { id: "last-2w", label: "Last 2 Weeks", group: "relative" },
  { id: "last-30d", label: "Last 30 Days", group: "relative" },
  { id: "last-3m", label: "Last 3 Months", group: "relative" },
];

export const REALTIME_PRESETS: TimeRangePresetOption[] = [
  { id: "rt-5m", label: "Real-time (Last 5 min)", group: "realtime" },
  { id: "rt-15m", label: "Real-time (Last 15 min)", group: "realtime" },
  { id: "rt-30m", label: "Real-time (Last 30 min)", group: "realtime" },
];

export type ExecutiveKpiStatus =
  | "Healthy"
  | "Warning"
  | "Critical"
  | "Information";

export type ExecutiveKpiTrendDirection = "up" | "down" | "flat";

export interface ExecutiveKpi {
  id: string;
  title: string;
  value: string;
  trendDirection: ExecutiveKpiTrendDirection;
  trendLabel: string;
  comparisonLabel: string;
  status: ExecutiveKpiStatus;
  href: string;
}

export interface DashboardDateRangeOption {
  id: DashboardDateRangeId;
  label: string;
  viewingLabel: string;
}

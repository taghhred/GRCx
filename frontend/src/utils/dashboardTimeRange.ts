import type {
  DashboardRefreshInterval,
  DashboardTimePresetId,
  DashboardTimeRange,
} from "../mocks/types/executiveKpi";
import { DASHBOARD_TIMEZONE } from "../mocks/types/executiveKpi";

const MS_MINUTE = 60_000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const MS_WEEK = 7 * MS_DAY;

export function dashboardNow(): Date {
  return new Date();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return startOfDay(new Date(d.getFullYear(), q, 1));
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return endOfDay(new Date(d.getFullYear(), q + 3, 0));
}

function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

export function resolvePresetBounds(
  preset: DashboardTimePresetId,
  now = dashboardNow()
): { start: Date; end: Date } {
  const end = now;
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = addDays(now, -1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "last-24h":
      return { start: new Date(now.getTime() - MS_DAY), end };
    case "last-7d":
      return { start: new Date(now.getTime() - 7 * MS_DAY), end };
    case "last-30d":
      return { start: new Date(now.getTime() - 30 * MS_DAY), end };
    case "this-month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "last-month": {
      const firstThis = startOfMonth(now);
      const lastPrev = addDays(firstThis, -1);
      return { start: startOfMonth(lastPrev), end: endOfMonth(lastPrev) };
    }
    case "this-quarter":
      return { start: startOfQuarter(now), end: endOfDay(now) };
    case "last-quarter": {
      const thisQ = startOfQuarter(now);
      const lastQEnd = addDays(thisQ, -1);
      return { start: startOfQuarter(lastQEnd), end: endOfQuarter(lastQEnd) };
    }
    case "this-year":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "last-year": {
      const y = now.getFullYear() - 1;
      return {
        start: startOfDay(new Date(y, 0, 1)),
        end: endOfDay(new Date(y, 11, 31)),
      };
    }
    case "last-5m":
    case "rt-5m":
      return { start: new Date(now.getTime() - 5 * MS_MINUTE), end };
    case "last-15m":
    case "rt-15m":
      return { start: new Date(now.getTime() - 15 * MS_MINUTE), end };
    case "last-30m":
    case "rt-30m":
      return { start: new Date(now.getTime() - 30 * MS_MINUTE), end };
    case "last-1h":
      return { start: new Date(now.getTime() - MS_HOUR), end };
    case "last-4h":
      return { start: new Date(now.getTime() - 4 * MS_HOUR), end };
    case "last-6h":
      return { start: new Date(now.getTime() - 6 * MS_HOUR), end };
    case "last-12h":
      return { start: new Date(now.getTime() - 12 * MS_HOUR), end };
    case "last-3d":
      return { start: new Date(now.getTime() - 3 * MS_DAY), end };
    case "last-1w":
      return { start: new Date(now.getTime() - MS_WEEK), end };
    case "last-2w":
      return { start: new Date(now.getTime() - 2 * MS_WEEK), end };
    case "last-3m":
      return { start: new Date(now.getTime() - 90 * MS_DAY), end };
    case "custom":
      return { start: startOfDay(now), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDashboardDate(d: Date): string {
  return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDashboardTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${pad2(h)}:${pad2(m)} ${ampm}`;
}

export function formatDashboardDateTime(d: Date): string {
  return `${formatDashboardDate(d)} ${formatDashboardTime(d)}`;
}

const PRESET_LABELS: Record<DashboardTimePresetId, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "last-24h": "Last 24 Hours",
  "last-7d": "Last 7 Days",
  "last-30d": "Last 30 Days",
  "this-month": "This Month",
  "last-month": "Last Month",
  "this-quarter": "This Quarter",
  "last-quarter": "Last Quarter",
  "this-year": "This Year",
  "last-year": "Last Year",
  "last-5m": "Last 5 Minutes",
  "last-15m": "Last 15 Minutes",
  "last-30m": "Last 30 Minutes",
  "last-1h": "Last 1 Hour",
  "last-4h": "Last 4 Hours",
  "last-6h": "Last 6 Hours",
  "last-12h": "Last 12 Hours",
  "last-3d": "Last 3 Days",
  "last-1w": "Last 1 Week",
  "last-2w": "Last 2 Weeks",
  "last-3m": "Last 3 Months",
  "rt-5m": "Real-time (Last 5 min)",
  "rt-15m": "Real-time (Last 15 min)",
  "rt-30m": "Real-time (Last 30 min)",
  custom: "Custom Range",
};

export function presetLabel(preset: DashboardTimePresetId): string {
  return PRESET_LABELS[preset];
}

export function isRealtimePreset(preset: DashboardTimePresetId): boolean {
  return preset === "rt-5m" || preset === "rt-15m" || preset === "rt-30m";
}

export function buildTimeRangeLabel(
  preset: DashboardTimePresetId,
  start: Date,
  end: Date
): string {
  if (preset !== "custom") {
    return presetLabel(preset);
  }
  return `${formatDashboardDateTime(start)}\n↓\n${formatDashboardDateTime(end)}`;
}

export function createTimeRangeFromPreset(
  preset: DashboardTimePresetId,
  options?: {
    now?: Date;
    refreshInterval?: DashboardRefreshInterval;
  }
): DashboardTimeRange {
  const now = options?.now ?? dashboardNow();
  const { start, end } = resolvePresetBounds(preset, now);
  const realtime = isRealtimePreset(preset);
  return {
    preset,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: buildTimeRangeLabel(preset, start, end),
    realtime,
    refreshInterval: realtime
      ? (options?.refreshInterval ?? "30s")
      : (options?.refreshInterval ?? "off"),
  };
}

export function createCustomTimeRange(
  start: Date,
  end: Date,
  refreshInterval: DashboardRefreshInterval = "off"
): DashboardTimeRange {
  const s = start.getTime() <= end.getTime() ? start : end;
  const e = start.getTime() <= end.getTime() ? end : start;
  return {
    preset: "custom",
    startIso: s.toISOString(),
    endIso: e.toISOString(),
    label: buildTimeRangeLabel("custom", s, e),
    realtime: false,
    refreshInterval,
  };
}

export function timezoneCaption(): string {
  return `${DASHBOARD_TIMEZONE.offsetLabel} ${DASHBOARD_TIMEZONE.city}`;
}

export function timeRangeScaleFactor(range: DashboardTimeRange): number {
  const hours =
    (new Date(range.endIso).getTime() - new Date(range.startIso).getTime()) /
    MS_HOUR;
  if (hours <= 1) return 0.55;
  if (hours <= 6) return 0.65;
  if (hours <= 24) return 0.82;
  if (hours <= 24 * 3) return 0.88;
  if (hours <= 24 * 7) return 0.92;
  if (hours <= 24 * 31) return 1;
  if (hours <= 24 * 100) return 1.06;
  if (hours <= 24 * 200) return 1.1;
  return 1.15;
}

const PRESET_SET: Record<string, true> = {
  today: true,
  yesterday: true,
  "last-24h": true,
  "last-7d": true,
  "last-30d": true,
  "this-month": true,
  "last-month": true,
  "this-quarter": true,
  "last-quarter": true,
  "this-year": true,
  "last-year": true,
  "last-5m": true,
  "last-15m": true,
  "last-30m": true,
  "last-1h": true,
  "last-4h": true,
  "last-6h": true,
  "last-12h": true,
  "last-3d": true,
  "last-1w": true,
  "last-2w": true,
  "last-3m": true,
  "rt-5m": true,
  "rt-15m": true,
  "rt-30m": true,
  custom: true,
};

export function isDashboardTimePresetId(
  value: string | null
): value is DashboardTimePresetId {
  return Boolean(value && PRESET_SET[value]);
}

export function refreshIntervalMs(
  interval: DashboardRefreshInterval | undefined
): number | null {
  switch (interval) {
    case "30s":
      return 30_000;
    case "1m":
      return 60_000;
    case "5m":
      return 300_000;
    default:
      return null;
  }
}

export function timeRangeToSearchParams(
  range: DashboardTimeRange
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("range", range.preset);
  if (range.preset === "custom") {
    params.set("start", range.startIso);
    params.set("end", range.endIso);
  }
  if (range.refreshInterval && range.refreshInterval !== "off") {
    params.set("refresh", range.refreshInterval);
  }
  return params;
}

export function timeRangeFromSearchParams(
  params: URLSearchParams
): DashboardTimeRange {
  const refreshRaw = params.get("refresh");
  const refreshInterval: DashboardRefreshInterval =
    refreshRaw === "30s" || refreshRaw === "1m" || refreshRaw === "5m"
      ? refreshRaw
      : "off";

  const presetRaw = params.get("range");
  if (presetRaw === "custom") {
    const start = params.get("start");
    const end = params.get("end");
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        return createCustomTimeRange(s, e, refreshInterval);
      }
    }
  }
  if (isDashboardTimePresetId(presetRaw) && presetRaw !== "custom") {
    return createTimeRangeFromPreset(presetRaw, { refreshInterval });
  }
  return createTimeRangeFromPreset("today");
}

export function compactTriggerLabel(range: DashboardTimeRange): string {
  if (range.preset !== "custom") return range.label.replace(/\n/g, " ");
  const start = new Date(range.startIso);
  const end = new Date(range.endIso);
  return `${formatDashboardDate(start)} → ${formatDashboardDate(end)}`;
}

/** Re-resolve relative / realtime windows against current clock. */
export function refreshTimeRangeBounds(
  range: DashboardTimeRange
): DashboardTimeRange {
  if (range.preset === "custom") return range;
  return createTimeRangeFromPreset(range.preset, {
    refreshInterval: range.refreshInterval,
  });
}

/** Calendar / custom-range helpers for the Splunk-style picker. */
export function startOfMonthDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function timeInputValue(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, day] = value.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== y ||
    d.getMonth() !== m - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function normalizeCustomRange(
  start: Date,
  end: Date
): { start: Date; end: Date } {
  if (start.getTime() <= end.getTime()) return { start, end };
  return { start: end, end: start };
}

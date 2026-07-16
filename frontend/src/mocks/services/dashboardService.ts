import { dashboardMock } from "../data/dashboardData";
import type { DashboardData } from "../types/dashboard";
import type { DashboardTimeRange } from "../types/executiveKpi";
import { timeRangeScaleFactor } from "../../utils/dashboardTimeRange";

const MOCK_DELAY_MS = 280;

export type MockFetchMode = "success" | "empty" | "error";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function scaleDashboard(
  base: DashboardData,
  range: DashboardTimeRange
): DashboardData {
  const factor = timeRangeScaleFactor(range);
  const scale = (n: number) => Math.max(0, Math.round(n * factor));

  return {
    ...base,
    dateRangeLabel: range.label,
    complianceScore: Math.min(
      100,
      Math.max(0, Math.round(base.complianceScore + (factor < 0.85 ? -2 : 0)))
    ),
    metrics: base.metrics.map((m) => {
      const numeric = Number(String(m.value).replace(/,/g, ""));
      if (Number.isNaN(numeric)) return { ...m, hint: range.label };
      return {
        ...m,
        value: String(scale(numeric)),
        hint: `Within ${range.label}`,
      };
    }),
    trend: base.trend.map((point, index) => {
      const wave = 0.75 + (index / Math.max(1, base.trend.length)) * 0.4;
      const scalePoint = (n: number) =>
        Math.max(0, Math.round(n * factor * wave));
      return {
        ...point,
        critical: scalePoint(point.critical),
        high: scalePoint(point.high),
        medium: scalePoint(point.medium),
        low: scalePoint(point.low),
      };
    }),
    severity: base.severity.map((slice) => ({
      ...slice,
      value: scale(slice.value),
    })),
    topTypes: base.topTypes.map((item) => ({
      ...item,
      count: scale(item.count),
    })),
    recentViolations:
      factor < 0.7
        ? base.recentViolations.slice(0, 2)
        : factor < 0.9
          ? base.recentViolations.slice(0, 3)
          : base.recentViolations,
    criticalAssets:
      factor < 0.75
        ? base.criticalAssets.slice(0, 2)
        : base.criticalAssets,
    insights: base.insights.map((insight) => ({
      ...insight,
      body: `${insight.body} Filtered to ${range.label}.`,
    })),
  };
}

/**
 * Local mock dashboard service — replaceable by FastAPI later.
 * Analytics are scaled to the selected Dashboard time range only.
 */
export async function fetchDashboard(
  mode: MockFetchMode = "success",
  range?: DashboardTimeRange
): Promise<DashboardData> {
  await delay(MOCK_DELAY_MS);

  if (mode === "error") {
    throw new Error("Unable to load dashboard data.");
  }

  if (mode === "empty") {
    return {
      ...dashboardMock,
      dateRangeLabel: range?.label ?? "Today",
      metrics: dashboardMock.metrics.map((m) => ({
        ...m,
        value: "0",
        hint: "No data for selected range",
      })),
      recentViolations: [],
      criticalAssets: [],
      insights: [],
      trend: [],
      severity: [],
      topTypes: [],
      regulatoryCoverage: [],
      complianceScore: 0,
      overallRisk: "Low",
    };
  }

  const clone = structuredClone(dashboardMock);
  if (!range) return clone;
  return scaleDashboard(clone, range);
}

export function mockExportDashboardReport(): { ok: true; message: string } {
  return {
    ok: true,
    message: "Dashboard report export queued locally (mock — no file uploaded).",
  };
}

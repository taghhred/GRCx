import type {
  DashboardDateRangeId,
  DashboardDateRangeOption,
  DashboardTimeRange,
  ExecutiveKpi,
} from "../types/executiveKpi";
import { QUICK_TIME_PRESETS } from "../types/executiveKpi";
import { dashboardMock } from "../data/dashboardData";
import { bcmDashboardData } from "../data/bcmData";
import { drDashboardData } from "../data/drpData";
import { assetComplianceData } from "../data/complianceData";
import {
  isDashboardTimePresetId,
  timeRangeScaleFactor,
} from "../../utils/dashboardTimeRange";
import type { DashboardAnalytics } from "./dashboardAnalyticsService";

export const DASHBOARD_DATE_RANGES: DashboardDateRangeOption[] =
  QUICK_TIME_PRESETS.filter((p) => p.id !== "custom").map((p) => ({
    id: p.id,
    label: p.label,
    viewingLabel: p.label,
  }));

export function isDashboardDateRangeId(
  value: string | null
): value is DashboardDateRangeId {
  return isDashboardTimePresetId(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scaleCount(base: number, factor: number): number {
  return Math.max(0, Math.round(base * factor));
}

/**
 * Executive KPI strip for the enterprise dashboard overview.
 * Prefer live risk analytics when available; otherwise fall back to module mocks.
 */
export function buildExecutiveKpis(
  range: DashboardTimeRange,
  analytics?: DashboardAnalytics | null
): ExecutiveKpi[] {
  const factor = timeRangeScaleFactor(range);
  const isToday = range.preset === "today";
  const isShort = factor < 0.9;

  const complianceBase =
    dashboardMock.complianceScore ||
    Math.round(
      (assetComplianceData.assets.filter(
        (item) => item.complianceStatus === "Compliant"
      ).length /
        Math.max(1, assetComplianceData.assets.length)) *
        100
    );

  const openRisksBase = analytics?.openRisks ?? 12;
  const criticalRisksBase = analytics?.criticalRisks ?? 2;
  const overdueBase = analytics?.overdueAssessments ?? 3;
  const treatmentBase = analytics?.treatmentProgress ?? 64;

  const bcmReadiness = Number.parseInt(
    bcmDashboardData.kpis.find((item) => item.id === "readiness")?.value ?? "87",
    10
  );
  const drReadiness = Number.parseInt(
    drDashboardData.kpis.find((item) => item.id === "readiness")?.value ?? "92",
    10
  );

  const compliance = clamp(
    Math.round(complianceBase + (isToday ? -2 : factor > 1.05 ? 3 : 0)),
    0,
    100
  );
  const openRisks = scaleCount(openRisksBase, factor);
  const criticalRisks = scaleCount(criticalRisksBase || 1, factor);
  const overdue = scaleCount(overdueBase || 1, factor);
  const treatment = clamp(treatmentBase + (isShort ? -3 : factor > 1 ? 2 : 0), 0, 100);
  const bcm = clamp(bcmReadiness + (isToday ? -1 : factor > 1 ? 2 : 0), 0, 100);
  const dr = clamp(drReadiness + (isShort ? -2 : factor > 1 ? 1 : 0), 0, 100);

  return [
    {
      id: "compliance-score",
      title: "Compliance Score",
      value: `${compliance}%`,
      trendDirection: compliance >= complianceBase ? "up" : "down",
      trendLabel: compliance >= complianceBase ? "▲ +3%" : "▼ -2%",
      comparisonLabel: "vs previous period",
      status: compliance >= 85 ? "Healthy" : compliance >= 70 ? "Warning" : "Critical",
      href: "/compliance",
    },
    {
      id: "open-risks",
      title: "Open Risks",
      value: String(openRisks),
      trendDirection: openRisks > openRisksBase ? "up" : "down",
      trendLabel: openRisks >= openRisksBase ? "▲ +2" : "▼ -1",
      comparisonLabel: "vs previous period",
      status: openRisks > 40 ? "Critical" : openRisks > 20 ? "Warning" : "Information",
      href: "/risk/register",
    },
    {
      id: "critical-risks",
      title: "Critical Risks",
      value: String(criticalRisks),
      trendDirection: criticalRisks > 2 ? "up" : "flat",
      trendLabel: criticalRisks > 2 ? "▲ +1" : "■ 0",
      comparisonLabel: "vs previous period",
      status: criticalRisks >= 3 ? "Critical" : criticalRisks >= 1 ? "Warning" : "Healthy",
      href: "/risk/register",
    },
    {
      id: "overdue-assessments",
      title: "Overdue Assessments",
      value: String(overdue),
      trendDirection: overdue > 0 ? "up" : "flat",
      trendLabel: overdue > 0 ? "▲ +1" : "■ 0",
      comparisonLabel: "vs previous period",
      status: overdue >= 5 ? "Critical" : overdue >= 1 ? "Warning" : "Healthy",
      href: "/risk/register",
    },
    {
      id: "treatment-progress",
      title: "Treatment Progress",
      value: `${treatment}%`,
      trendDirection: treatment >= treatmentBase ? "up" : "down",
      trendLabel: treatment >= treatmentBase ? "▲ +2%" : "▼ -2%",
      comparisonLabel: "vs previous period",
      status: treatment >= 80 ? "Healthy" : treatment >= 55 ? "Warning" : "Critical",
      href: "/risk/treatment",
    },
    {
      id: "bcm-readiness",
      title: "Business Continuity",
      value: `${bcm}%`,
      trendDirection: "up",
      trendLabel: "▲ +2%",
      comparisonLabel: "vs previous period",
      status: bcm >= 85 ? "Healthy" : bcm >= 70 ? "Warning" : "Critical",
      href: "/bcm",
    },
    {
      id: "dr-readiness",
      title: "Disaster Recovery",
      value: `${dr}%`,
      trendDirection: isShort ? "down" : "up",
      trendLabel: isShort ? "▼ -2%" : "▲ +1%",
      comparisonLabel: "vs previous period",
      status: dr >= 85 ? "Healthy" : dr >= 70 ? "Warning" : "Critical",
      href: "/drp",
    },
  ];
}

export function getDateRangeOption(
  id: DashboardDateRangeId
): DashboardDateRangeOption {
  return (
    DASHBOARD_DATE_RANGES.find((item) => item.id === id) ?? {
      id: "today",
      label: "Today",
      viewingLabel: "Today",
    }
  );
}

export function defaultDashboardTimeRange(): DashboardTimeRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    preset: "last-30d",
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: "Last 30 Days",
    refreshInterval: "off",
  };
}

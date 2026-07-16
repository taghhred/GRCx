import { isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type { DashboardAnalytics } from "../../mocks/services/dashboardAnalyticsService";
import type { ExecutiveKpi } from "../../mocks/types/executiveKpi";
import type { OrgNode } from "../../mocks/data/dashboardOrgData";
import {
  buildDashboardAnalytics,
} from "../../mocks/services/dashboardAnalyticsService";
import { buildExecutiveKpis } from "../../mocks/services/executiveKpiService";
import {
  DASHBOARD_ORG_TREE,
  DASHBOARD_RESPONSIBILITIES,
} from "../../mocks/data/dashboardOrgData";
import type { DashboardTimeRange } from "../../mocks/types/executiveKpi";

export interface DashboardOrganization {
  orgTree: OrgNode | Record<string, unknown>;
  responsibilities: Array<{
    id: string;
    name: string;
    role: string;
    department: string;
    responsibilities: string;
  }>;
}

function mapKpiStatus(
  status: string | undefined
): ExecutiveKpi["status"] {
  const s = (status || "").toLowerCase();
  if (s === "at-risk" || s === "critical") return "Critical";
  if (s === "watch" || s === "warning") return "Warning";
  if (s === "information" || s === "info") return "Information";
  return "Healthy";
}

function normalizeKpis(rows: Array<Record<string, unknown>>): ExecutiveKpi[] {
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    value: String(row.value ?? ""),
    trendDirection: (row.trendDirection as ExecutiveKpi["trendDirection"]) || "flat",
    trendLabel: String(row.trendLabel ?? ""),
    comparisonLabel: String(row.comparisonLabel ?? ""),
    status: mapKpiStatus(
      typeof row.status === "string" ? row.status : undefined
    ),
    href: String(row.href ?? "/"),
  }));
}

export async function fetchAnalytics(params?: {
  start?: string;
  end?: string;
}): Promise<DashboardAnalytics> {
  if (isMocksEnabled()) {
    return buildDashboardAnalytics();
  }
  const qs = new URLSearchParams();
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  const suffix = qs.toString() ? `?${qs}` : "";
  try {
    return await apiRequest<DashboardAnalytics>(`/dashboard/analytics${suffix}`);
  } catch {
    return buildDashboardAnalytics();
  }
}

export async function fetchKpis(
  timeRange?: DashboardTimeRange,
  analytics?: DashboardAnalytics | null
): Promise<ExecutiveKpi[]> {
  if (isMocksEnabled()) {
    return buildExecutiveKpis(
      timeRange ?? {
        preset: "last-30d",
        startIso: "",
        endIso: "",
        label: "Last 30 Days",
      },
      analytics
    );
  }
  try {
    const rows = await apiRequest<Array<Record<string, unknown>>>("/dashboard/kpis");
    if (rows.length > 0) return normalizeKpis(rows);
  } catch {
    /* fall through */
  }
  return buildExecutiveKpis(
    timeRange ?? {
      preset: "last-30d",
      startIso: "",
      endIso: "",
      label: "Last 30 Days",
    },
    analytics
  );
}

export async function fetchOrganization(): Promise<DashboardOrganization> {
  if (isMocksEnabled()) {
    return {
      orgTree: DASHBOARD_ORG_TREE,
      responsibilities: DASHBOARD_RESPONSIBILITIES,
    };
  }
  try {
    const remote = await apiRequest<DashboardOrganization>("/dashboard/organization");
    if (remote?.orgTree && Object.keys(remote.orgTree).length > 0) {
      return remote;
    }
  } catch {
    /* fall through */
  }
  return {
    orgTree: DASHBOARD_ORG_TREE,
    responsibilities: DASHBOARD_RESPONSIBILITIES,
  };
}

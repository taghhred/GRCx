import { isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type { CriticalBusinessProcess } from "../../mocks/types/bcm";
import { bcmDashboardData } from "../../mocks/data/bcmData";

export interface BcmDashboardBundle {
  processes: CriticalBusinessProcess[];
  kpis: typeof bcmDashboardData.kpis;
  activities: typeof bcmDashboardData.activities;
  recommendations: typeof bcmDashboardData.recommendations;
}

export async function fetchBcmDashboard(): Promise<BcmDashboardBundle> {
  if (isMocksEnabled()) {
    return {
      processes: bcmDashboardData.processes,
      kpis: bcmDashboardData.kpis,
      activities: bcmDashboardData.activities,
      recommendations: bcmDashboardData.recommendations,
    };
  }
  try {
    const remote = await apiRequest<Partial<BcmDashboardBundle>>("/bcm/dashboard");
    if (remote.processes?.length) {
      return {
        processes: remote.processes,
        kpis: (remote.kpis as BcmDashboardBundle["kpis"]) || bcmDashboardData.kpis,
        activities:
          (remote.activities as BcmDashboardBundle["activities"]) ||
          bcmDashboardData.activities,
        recommendations:
          (remote.recommendations as BcmDashboardBundle["recommendations"]) ||
          bcmDashboardData.recommendations,
      };
    }
  } catch {
    /* fall through */
  }
  return {
    processes: bcmDashboardData.processes,
    kpis: bcmDashboardData.kpis,
    activities: bcmDashboardData.activities,
    recommendations: bcmDashboardData.recommendations,
  };
}

export async function replaceProcesses(
  rows: CriticalBusinessProcess[]
): Promise<{ ok: boolean; count: number }> {
  if (isMocksEnabled()) {
    return { ok: true, count: rows.length };
  }
  return apiRequest<{ ok: boolean; count: number }>("/bcm/processes", {
    method: "PUT",
    body: { rows },
  });
}

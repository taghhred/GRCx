import { isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type { CriticalSystem } from "../../mocks/types/drp";
import { drDashboardData } from "../../mocks/data/drpData";

export type DrDashboardBundle = typeof drDashboardData & {
  systems: CriticalSystem[];
};

export async function fetchDrDashboard(): Promise<DrDashboardBundle> {
  if (isMocksEnabled()) {
    return { ...drDashboardData };
  }
  try {
    const remote = await apiRequest<Partial<DrDashboardBundle>>("/dr/dashboard");
    if (remote.systems?.length) {
      return {
        ...drDashboardData,
        ...remote,
        systems: remote.systems,
      } as DrDashboardBundle;
    }
  } catch {
    /* fall through */
  }
  return { ...drDashboardData };
}

export async function replaceSystems(
  rows: CriticalSystem[]
): Promise<{ ok: boolean; count: number }> {
  if (isMocksEnabled()) {
    return { ok: true, count: rows.length };
  }
  return apiRequest<{ ok: boolean; count: number }>("/dr/systems", {
    method: "PUT",
    body: { rows },
  });
}

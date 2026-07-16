import { isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type { IdentityMonitoringRow } from "../../mocks/types/identity";
import { identityMonitoringData } from "../../mocks/data/identityData";

export interface IdentityMonitoringBundle {
  identities: IdentityMonitoringRow[];
  departments: string[];
}

export async function fetchIdentityMonitoring(): Promise<IdentityMonitoringBundle> {
  if (isMocksEnabled()) {
    return {
      identities: identityMonitoringData.identities,
      departments: identityMonitoringData.departments,
    };
  }
  try {
    const remote = await apiRequest<IdentityMonitoringBundle>("/identity/monitoring");
    if (remote.identities?.length) {
      return {
        identities: remote.identities,
        departments:
          remote.departments?.length
            ? remote.departments
            : identityMonitoringData.departments,
      };
    }
  } catch {
    /* fall through */
  }
  return {
    identities: identityMonitoringData.identities,
    departments: identityMonitoringData.departments,
  };
}

export async function replaceIdentities(
  rows: IdentityMonitoringRow[]
): Promise<{ ok: boolean; count: number }> {
  if (isMocksEnabled()) {
    return { ok: true, count: rows.length };
  }
  return apiRequest<{ ok: boolean; count: number }>("/identity/monitoring", {
    method: "PUT",
    body: { rows },
  });
}

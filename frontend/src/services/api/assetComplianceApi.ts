import { isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type { ComplianceAsset, FrameworkCode } from "../../mocks/types/compliance";
import { assetComplianceData } from "../../mocks/data/complianceData";

export interface AssetComplianceBundle {
  assets: ComplianceAsset[];
  departments: string[];
  frameworks: FrameworkCode[];
}

export async function fetchAssetCompliance(): Promise<AssetComplianceBundle> {
  if (isMocksEnabled()) {
    return {
      assets: assetComplianceData.assets,
      departments: assetComplianceData.departments,
      frameworks: assetComplianceData.frameworks,
    };
  }
  try {
    const remote = await apiRequest<Partial<AssetComplianceBundle>>(
      "/compliance/assets"
    );
    if (remote.assets?.length) {
      return {
        assets: remote.assets as ComplianceAsset[],
        departments:
          remote.departments?.length
            ? remote.departments
            : assetComplianceData.departments,
        frameworks:
          (remote.frameworks as FrameworkCode[] | undefined)?.length
            ? (remote.frameworks as FrameworkCode[])
            : assetComplianceData.frameworks,
      };
    }
  } catch {
    /* fall through */
  }
  return {
    assets: assetComplianceData.assets,
    departments: assetComplianceData.departments,
    frameworks: assetComplianceData.frameworks,
  };
}

export async function replaceAssets(
  rows: ComplianceAsset[]
): Promise<{ ok: boolean; count: number }> {
  if (isMocksEnabled()) {
    return { ok: true, count: rows.length };
  }
  return apiRequest<{ ok: boolean; count: number }>("/compliance/assets", {
    method: "PUT",
    body: { rows },
  });
}

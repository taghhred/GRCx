import { apiBaseUrl, isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type {
  RiskImportSummary,
  RiskRegisterItem,
  RiskStats,
} from "../../mocks/types/riskRegister";
import {
  computeRiskStats,
  loadSeedExcelFiles,
  parseRiskRegisterWorkbook,
} from "../risk/riskExcelClient";

let localStore: RiskRegisterItem[] | null = null;

function preferLocalStore(): boolean {
  return isMocksEnabled();
}

async function ensureLocal(): Promise<RiskRegisterItem[]> {
  if (localStore) return localStore;
  const loaded = await loadSeedExcelFiles();
  localStore = loaded.rows;
  return localStore;
}

export async function fetchRisks(): Promise<RiskRegisterItem[]> {
  if (preferLocalStore()) {
    return ensureLocal();
  }
  try {
    const rows = await apiRequest<RiskRegisterItem[]>("/risks");
    if (rows.length > 0) return rows;
  } catch {
    /* fall through to Excel seed */
  }
  return ensureLocal();
}

export async function fetchRiskStats(): Promise<RiskStats> {
  if (preferLocalStore()) {
    return computeRiskStats(await ensureLocal());
  }
  try {
    return await apiRequest<RiskStats>("/risks/stats");
  } catch {
    return computeRiskStats(await ensureLocal());
  }
}

export async function syncRiskFolder(): Promise<RiskImportSummary[]> {
  if (preferLocalStore()) {
    localStore = null;
    const loaded = await loadSeedExcelFiles();
    localStore = loaded.rows;
    return loaded.files.map((filename) => ({
      filename,
      imported: loaded.rows.filter((r) => r.sourceFilename === filename).length,
      updated: 0,
      skipped_duplicates: 0,
      errors: 0,
      error_messages: [],
    }));
  }
  return apiRequest<RiskImportSummary[]>("/risks/sync-folder", { method: "POST" });
}

export async function importRiskExcel(
  file: File,
  mode: "append-update" | "skip-duplicates" = "append-update"
): Promise<RiskImportSummary> {
  if (preferLocalStore()) {
    const buffer = await file.arrayBuffer();
    const parsed = parseRiskRegisterWorkbook(buffer, file.name);
    const existing = await ensureLocal();
    const byId = new Map(existing.map((r) => [r.riskId, r]));
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    for (const row of parsed.rows) {
      if (!byId.has(row.riskId)) {
        byId.set(row.riskId, row);
        imported += 1;
      } else if (mode === "skip-duplicates") {
        skipped += 1;
      } else {
        byId.set(row.riskId, {
          ...byId.get(row.riskId)!,
          ...row,
          id: row.riskId,
        });
        updated += 1;
      }
    }
    localStore = Array.from(byId.values());
    return {
      filename: file.name,
      imported,
      updated,
      skipped_duplicates: skipped,
      errors: parsed.errors.length,
      error_messages: parsed.errors,
    };
  }

  const form = new FormData();
  form.append("file", file);
  return apiRequest<RiskImportSummary>(
    `/risks/import?mode=${encodeURIComponent(mode)}`,
    { method: "POST", form }
  );
}

export async function createRisk(
  body: Partial<RiskRegisterItem> & { riskId: string; title: string }
): Promise<RiskRegisterItem> {
  if (preferLocalStore()) {
    const rows = await ensureLocal();
    if (rows.some((r) => r.riskId === body.riskId)) {
      throw new Error("Duplicate Risk ID");
    }
    const now = new Date().toISOString().slice(0, 10);
    const item: RiskRegisterItem = {
      id: body.riskId,
      riskId: body.riskId,
      title: body.title,
      category: body.category || "General",
      affectedAsset: body.affectedAsset || "",
      businessUnit: body.businessUnit || "",
      department: body.department || body.businessUnit || "",
      vendor: body.vendor || "",
      owner: body.owner || "Unassigned",
      description: body.description || "",
      inherentLikelihood: body.inherentLikelihood ?? null,
      inherentImpact: body.inherentImpact ?? null,
      inherentScore: body.inherentScore ?? null,
      inherentLevel: body.inherentLevel || "Medium",
      treatment: body.treatment || "Mitigate",
      plannedControls: body.plannedControls || "",
      framework: body.framework || "",
      frameworkControlRef: body.frameworkControlRef || "",
      residualLikelihood: body.residualLikelihood ?? null,
      residualImpact: body.residualImpact ?? null,
      residualScore: body.residualScore ?? null,
      residualLevel: body.residualLevel || "Medium",
      status: body.status || "Open",
      dateIdentified: body.dateIdentified || now,
      nextReviewDate: body.nextReviewDate || "",
      notes: body.notes || "",
      sourceFilename: body.sourceFilename || "Manual Entry",
      sourceFileId: null,
      lastUpdated: now,
      createdAt: now,
      evidence: [],
      history: [
        {
          id: `h-${body.riskId}-new`,
          actor: "User",
          action: "Created",
          detail: "Manual risk entry",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    localStore = [item, ...rows];
    return item;
  }

  return apiRequest<RiskRegisterItem>("/risks", {
    method: "POST",
    body: {
      risk_id: body.riskId,
      title: body.title,
      category: body.category,
      affected_asset: body.affectedAsset,
      business_unit: body.businessUnit,
      department: body.department,
      vendor: body.vendor,
      owner: body.owner,
      description: body.description,
      inherent_likelihood: body.inherentLikelihood,
      inherent_impact: body.inherentImpact,
      inherent_score: body.inherentScore,
      inherent_level: body.inherentLevel,
      treatment: body.treatment,
      planned_controls: body.plannedControls,
      framework: body.framework,
      framework_control_ref: body.frameworkControlRef,
      residual_likelihood: body.residualLikelihood,
      residual_impact: body.residualImpact,
      residual_score: body.residualScore,
      residual_level: body.residualLevel,
      status: body.status,
      date_identified: body.dateIdentified || null,
      next_review_date: body.nextReviewDate || null,
      notes: body.notes,
    },
  });
}

export async function updateRisk(
  riskId: string,
  patch: Partial<RiskRegisterItem>
): Promise<RiskRegisterItem> {
  if (preferLocalStore()) {
    const rows = await ensureLocal();
    const idx = rows.findIndex((r) => r.riskId === riskId);
    if (idx < 0) throw new Error("Risk not found");
    const next = {
      ...rows[idx],
      ...patch,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    const copy = [...rows];
    copy[idx] = next;
    localStore = copy;
    return next;
  }
  return apiRequest<RiskRegisterItem>(`/risks/${encodeURIComponent(riskId)}`, {
    method: "PATCH",
    body: {
      title: patch.title,
      category: patch.category,
      affected_asset: patch.affectedAsset,
      business_unit: patch.businessUnit,
      department: patch.department,
      vendor: patch.vendor,
      owner: patch.owner,
      description: patch.description,
      inherent_likelihood: patch.inherentLikelihood,
      inherent_impact: patch.inherentImpact,
      inherent_score: patch.inherentScore,
      inherent_level: patch.inherentLevel,
      treatment: patch.treatment,
      planned_controls: patch.plannedControls,
      framework: patch.framework,
      framework_control_ref: patch.frameworkControlRef,
      residual_likelihood: patch.residualLikelihood,
      residual_impact: patch.residualImpact,
      residual_score: patch.residualScore,
      residual_level: patch.residualLevel,
      status: patch.status,
      date_identified: patch.dateIdentified || null,
      next_review_date: patch.nextReviewDate || null,
      notes: patch.notes,
    },
  });
}

export async function archiveRisk(riskId: string): Promise<void> {
  if (preferLocalStore()) {
    const rows = await ensureLocal();
    localStore = rows.map((r) =>
      r.riskId === riskId ? { ...r, status: "Archived" } : r
    );
    return;
  }
  await apiRequest(`/risks/${encodeURIComponent(riskId)}`, { method: "DELETE" });
}

export function riskSourceDownloadUrl(fileId: string): string {
  return `${apiBaseUrl()}/risks/files/${encodeURIComponent(fileId)}/download`;
}

export function replaceLocalRiskStore(rows: RiskRegisterItem[]): void {
  localStore = rows;
}

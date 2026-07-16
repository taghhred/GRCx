import { isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type {
  ComplianceAssessmentItem,
  ComplianceEvidenceItem,
  ComplianceFindingItem,
  ComplianceFrameworkSummary,
  ComplianceImportSummary,
  ComplianceRegisterItem,
  ComplianceStats,
} from "../../mocks/types/complianceManagement";
import {
  buildFrameworkSummaries,
  computeComplianceStats,
  deriveFindings,
  loadComplianceSeedFiles,
  parseComplianceUpload,
} from "../compliance/complianceExcelClient";

export interface ComplianceBundle {
  register: ComplianceRegisterItem[];
  assessments: ComplianceAssessmentItem[];
  evidence: ComplianceEvidenceItem[];
  findings: ComplianceFindingItem[];
  frameworks: ComplianceFrameworkSummary[];
  stats: ComplianceStats;
}

interface LocalStores {
  register: ComplianceRegisterItem[];
  assessments: ComplianceAssessmentItem[];
  evidence: ComplianceEvidenceItem[];
}

let localStore: LocalStores | null = null;

function preferLocalStore(): boolean {
  return isMocksEnabled();
}

function buildBundle(stores: LocalStores): ComplianceBundle {
  const findings = deriveFindings(stores.register, stores.assessments);
  const frameworks = buildFrameworkSummaries(
    stores.register,
    stores.assessments,
    stores.evidence,
    findings
  );
  const stats = computeComplianceStats(
    stores.register,
    stores.assessments,
    stores.evidence,
    findings
  );
  return {
    register: stores.register,
    assessments: stores.assessments,
    evidence: stores.evidence,
    findings,
    frameworks,
    stats,
  };
}

async function ensureLocal(): Promise<LocalStores> {
  if (localStore) return localStore;
  const loaded = await loadComplianceSeedFiles();
  localStore = {
    register: loaded.register,
    assessments: loaded.assessments,
    evidence: loaded.evidence,
  };
  return localStore;
}

function mergeById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
  mode: "append-update" | "skip-duplicates"
): { next: T[]; imported: number; updated: number; skipped: number } {
  const byId = new Map(existing.map((row) => [row.id, row]));
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of incoming) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
      imported += 1;
    } else if (mode === "skip-duplicates") {
      skipped += 1;
    } else {
      byId.set(row.id, { ...byId.get(row.id)!, ...row, id: row.id });
      updated += 1;
    }
  }
  return { next: Array.from(byId.values()), imported, updated, skipped };
}

export async function fetchComplianceBundle(): Promise<ComplianceBundle> {
  if (preferLocalStore()) {
    return buildBundle(await ensureLocal());
  }
  try {
    const remote = await apiRequest<Partial<ComplianceBundle>>("/compliance/bundle");
    if (remote.register || remote.assessments || remote.evidence) {
      const stores: LocalStores = {
        register: remote.register || [],
        assessments: remote.assessments || [],
        evidence: remote.evidence || [],
      };
      return buildBundle(stores);
    }
  } catch {
    /* fall through to Excel seed */
  }
  return buildBundle(await ensureLocal());
}

export async function reloadComplianceSeeds(): Promise<ComplianceImportSummary[]> {
  if (preferLocalStore()) {
    localStore = null;
    const loaded = await loadComplianceSeedFiles();
    localStore = {
      register: loaded.register,
      assessments: loaded.assessments,
      evidence: loaded.evidence,
    };
    return loaded.files.map((filename) => ({
      filename,
      imported:
        loaded.register.filter((r) => r.sourceFilename === filename).length +
        loaded.assessments.filter((r) => r.sourceFilename === filename).length +
        loaded.evidence.filter((r) => r.sourceFilename === filename).length,
      updated: 0,
      skipped_duplicates: 0,
      errors: loaded.errors.filter((e) => e.includes(filename)).length,
      error_messages: loaded.errors.filter((e) => e.includes(filename)),
    }));
  }
  return apiRequest<ComplianceImportSummary[]>("/compliance/sync-folder", {
    method: "POST",
  });
}

export async function importComplianceExcel(
  file: File,
  mode: "append-update" | "skip-duplicates" = "append-update"
): Promise<ComplianceImportSummary> {
  if (preferLocalStore()) {
    const buffer = await file.arrayBuffer();
    const parsed = parseComplianceUpload(buffer, file.name);
    const existing = await ensureLocal();

    const reg = mergeById(existing.register, parsed.register, mode);
    const asm = mergeById(existing.assessments, parsed.assessments, mode);
    const evd = mergeById(existing.evidence, parsed.evidence, mode);

    localStore = {
      register: reg.next,
      assessments: asm.next,
      evidence: evd.next,
    };

    return {
      filename: file.name,
      imported: reg.imported + asm.imported + evd.imported,
      updated: reg.updated + asm.updated + evd.updated,
      skipped_duplicates: reg.skipped + asm.skipped + evd.skipped,
      errors: parsed.errors.length,
      error_messages: parsed.errors,
    };
  }

  const form = new FormData();
  form.append("file", file);
  return apiRequest<ComplianceImportSummary>(
    `/compliance/import?mode=${encodeURIComponent(mode)}`,
    { method: "POST", form }
  );
}

export function replaceLocalComplianceStore(stores: LocalStores): void {
  localStore = stores;
}

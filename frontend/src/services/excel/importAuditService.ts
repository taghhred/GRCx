import type { ImportApplyResult, ImportAuditEntry } from "./types";

const auditLog: ImportAuditEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** Local session-only audit metadata — no row payloads, no localStorage. */
export const importAuditService = {
  record(result: ImportApplyResult): ImportAuditEntry {
    const entry: ImportAuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: result.timestamp,
      moduleId: result.moduleId,
      moduleLabel: result.moduleLabel,
      filename: result.filename,
      added: result.added,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      actingUser: result.importedBy,
    };
    auditLog.unshift(entry);
    if (auditLog.length > 50) auditLog.pop();
    notify();
    return entry;
  },

  list(): ImportAuditEntry[] {
    return [...auditLog];
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const PROTOTYPE_ACTING_USER = "Mona";

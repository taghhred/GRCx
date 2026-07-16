/**
 * Session in-memory store for operational module rows.
 *
 * Persistence: data lives only for the current browser tab session.
 * Refreshing the page resets to seed mock data.
 * Do NOT write sensitive operational rows to localStorage.
 *
 * Backend swap point: replace get/set/subscribe with FastAPI-backed repositories.
 */

import type { OperationalModuleId } from "../../services/excel/types";

type Listener = () => void;

interface StoreBucket<T extends { id?: string; caseId?: string }> {
  rows: T[];
  seed: T[];
  undo: T[] | null;
  lastAffectedIds: string[];
}

const buckets = new Map<OperationalModuleId, StoreBucket<Record<string, unknown>>>();
const listeners = new Map<OperationalModuleId, Set<Listener>>();

function keyOf(row: Record<string, unknown>, uniqueKey: string): string {
  return String(row[uniqueKey] ?? row.id ?? "");
}

export function initModuleStore<T extends Record<string, unknown>>(
  moduleId: OperationalModuleId,
  seed: T[]
): void {
  if (buckets.has(moduleId)) return;
  buckets.set(moduleId, {
    rows: seed.map((r) => ({ ...r })),
    seed: seed.map((r) => ({ ...r })),
    undo: null,
    lastAffectedIds: [],
  });
}

/** Replace seed + rows (e.g. after API hydrate). Notifies subscribers. */
export function resetModuleStore(
  moduleId: OperationalModuleId,
  seed: object[]
): void {
  const rows = seed.map((r) => ({ ...(r as Record<string, unknown>) }));
  buckets.set(moduleId, {
    rows,
    seed: rows.map((r) => ({ ...r })),
    undo: null,
    lastAffectedIds: [],
  });
  notify(moduleId);
}

export function getModuleRows<T>(moduleId: OperationalModuleId): T[] {
  const bucket = buckets.get(moduleId);
  return (bucket?.rows ?? []) as T[];
}

export function subscribeModule(
  moduleId: OperationalModuleId,
  listener: Listener
): () => void {
  if (!listeners.has(moduleId)) listeners.set(moduleId, new Set());
  listeners.get(moduleId)!.add(listener);
  return () => listeners.get(moduleId)?.delete(listener);
}

function notify(moduleId: OperationalModuleId) {
  listeners.get(moduleId)?.forEach((l) => l());
}

export function getLastAffectedIds(moduleId: OperationalModuleId): string[] {
  return buckets.get(moduleId)?.lastAffectedIds ?? [];
}

export function clearLastAffectedIds(moduleId: OperationalModuleId): void {
  const bucket = buckets.get(moduleId);
  if (!bucket) return;
  bucket.lastAffectedIds = [];
  notify(moduleId);
}

export function canUndoModule(moduleId: OperationalModuleId): boolean {
  return Boolean(buckets.get(moduleId)?.undo);
}

export function undoLastImport(moduleId: OperationalModuleId): boolean {
  const bucket = buckets.get(moduleId);
  if (!bucket?.undo) return false;
  bucket.rows = bucket.undo.map((r) => ({ ...r }));
  bucket.undo = null;
  bucket.lastAffectedIds = [];
  notify(moduleId);
  return true;
}

export function applyImportMerge<T extends Record<string, unknown>>(
  moduleId: OperationalModuleId,
  uniqueKey: string,
  operations: Array<{
    action: "Add" | "Update";
    uniqueId: string;
    values: Record<string, string>;
    buildNew: (values: Record<string, string>) => T;
    mergeExisting: (existing: T, values: Record<string, string>) => T;
  }>
): { added: number; updated: number; skipped: number; affectedIds: string[] } {
  const bucket = buckets.get(moduleId);
  if (!bucket) {
    return { added: 0, updated: 0, skipped: 0, affectedIds: [] };
  }

  bucket.undo = bucket.rows.map((r) => ({ ...r }));
  let added = 0;
  let updated = 0;
  const affectedIds: string[] = [];
  const indexById = new Map<string, number>();
  bucket.rows.forEach((row, index) => {
    indexById.set(keyOf(row, uniqueKey), index);
  });

  for (const op of operations) {
    if (op.action === "Add") {
      if (indexById.has(op.uniqueId)) continue;
      const created = op.buildNew(op.values) as Record<string, unknown>;
      bucket.rows = [...bucket.rows, created];
      indexById.set(op.uniqueId, bucket.rows.length - 1);
      added += 1;
      affectedIds.push(op.uniqueId);
    } else if (op.action === "Update") {
      const idx = indexById.get(op.uniqueId);
      if (idx == null) continue;
      const existing = bucket.rows[idx] as T;
      const merged = op.mergeExisting(existing, op.values) as Record<
        string,
        unknown
      >;
      const next = [...bucket.rows];
      next[idx] = merged;
      bucket.rows = next;
      updated += 1;
      affectedIds.push(op.uniqueId);
    }
  }

  bucket.lastAffectedIds = affectedIds;
  notify(moduleId);
  return {
    added,
    updated,
    skipped: 0,
    affectedIds,
  };
}

export function replaceModuleRows<T extends object>(
  moduleId: OperationalModuleId,
  rows: T[],
  options?: { preserveUndo?: boolean }
): void {
  const bucket = buckets.get(moduleId);
  if (!bucket) return;
  if (!options?.preserveUndo) {
    // do not clobber undo snapshot for local UI edits
  }
  bucket.rows = rows.map((r) => ({ ...r })) as Record<string, unknown>[];
  notify(moduleId);
}

/**
 * Patch a single row outside the import flow (e.g. status change, timeline
 * append triggered from the UI). Deliberately does not touch `undo` or
 * `lastAffectedIds` — those are reserved for the Excel import/merge flow so
 * "Undo Last Import" and the imported-row highlight stay scoped to imports.
 */
export function patchModuleRow<T extends object>(
  moduleId: OperationalModuleId,
  uniqueKey: string,
  uniqueId: string,
  patch: (existing: T) => T
): void {
  const bucket = buckets.get(moduleId);
  if (!bucket) return;
  const index = bucket.rows.findIndex(
    (row) => keyOf(row, uniqueKey) === uniqueId
  );
  if (index < 0) return;
  const next = [...bucket.rows];
  next[index] = patch(next[index] as T) as Record<string, unknown>;
  bucket.rows = next;
  notify(moduleId);
}

/** Interface stub for future FastAPI persistence. */
export interface OperationalRepository<T> {
  list(): Promise<T[]>;
  upsert(rows: T[]): Promise<void>;
}

export function createSessionRepository<T>(
  moduleId: OperationalModuleId
): OperationalRepository<T> {
  return {
    async list() {
      return getModuleRows<T>(moduleId);
    },
    async upsert() {
      // Backend will persist; session store already updated synchronously.
    },
  };
}

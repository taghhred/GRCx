import { useCallback, useEffect, useState } from "react";
import {
  applyImportMerge,
  canUndoModule,
  clearLastAffectedIds,
  getLastAffectedIds,
  getModuleRows,
  initModuleStore,
  subscribeModule,
  undoLastImport,
} from "../../mocks/services/operationalDataStore";
import type {
  ImportApplyResult,
  ImportMode,
  ModuleImportSchema,
  OperationalModuleId,
  ValidatedImportRow,
} from "./types";
import { importAuditService, PROTOTYPE_ACTING_USER } from "./importAuditService";

interface Adapters<T> {
  toFlat: (row: T) => Record<string, string>;
  buildNew: (values: Record<string, string>) => T;
  mergeExisting: (existing: T, values: Record<string, string>) => T;
}

export function useOperationalModuleData<T extends object>(
  moduleId: OperationalModuleId,
  seed: T[],
  schema: ModuleImportSchema,
  adapters: Adapters<T>
) {
  initModuleStore(moduleId, seed as Array<Record<string, unknown>>);

  const [rows, setRows] = useState<T[]>(() => getModuleRows<T>(moduleId));
  const [affectedIds, setAffectedIds] = useState<string[]>(() =>
    getLastAffectedIds(moduleId)
  );
  const [canUndo, setCanUndo] = useState(() => canUndoModule(moduleId));

  useEffect(() => {
    return subscribeModule(moduleId, () => {
      setRows(getModuleRows<T>(moduleId));
      setAffectedIds(getLastAffectedIds(moduleId));
      setCanUndo(canUndoModule(moduleId));
    });
  }, [moduleId]);

  const flatRecords = rows.map((r) => adapters.toFlat(r));

  const applyImport = useCallback(
    (payload: {
      mode: ImportMode;
      rows: ValidatedImportRow[];
      filename: string;
      sheetName: string;
    }): ImportApplyResult => {
      const { buildNew, mergeExisting } = adapters;
      const ops = payload.rows
        .filter(
          (r) => r.proposedAction === "Add" || r.proposedAction === "Update"
        )
        .map((r) => ({
          action: r.proposedAction as "Add" | "Update",
          uniqueId: r.uniqueId,
          values: r.values,
          buildNew,
          mergeExisting,
        }));

      const merge = applyImportMerge(
        moduleId,
        schema.uniqueKey,
        ops as Parameters<typeof applyImportMerge>[2]
      );
      const result: ImportApplyResult = {
        added: merge.added,
        updated: merge.updated,
        skipped: 0,
        failed: 0,
        affectedIds: merge.affectedIds,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        importedBy: PROTOTYPE_ACTING_USER,
        filename: payload.filename,
        moduleId,
        moduleLabel: schema.moduleLabel,
        importMode: payload.mode,
        sheetName: payload.sheetName,
      };
      importAuditService.record(result);
      return result;
    },
    [moduleId, schema.moduleLabel, schema.uniqueKey, adapters]
  );

  const undo = useCallback(() => {
    undoLastImport(moduleId);
  }, [moduleId]);

  const clearHighlights = useCallback(() => {
    clearLastAffectedIds(moduleId);
  }, [moduleId]);

  return {
    rows,
    flatRecords,
    affectedIds,
    canUndo,
    applyImport,
    undo,
    clearHighlights,
  };
}

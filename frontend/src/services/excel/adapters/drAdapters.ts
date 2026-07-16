import type {
  CriticalSystem,
  DrSeverity,
  SystemRecoveryStatus,
} from "../../../mocks/types/drp";

export function drToFlat(row: CriticalSystem): Record<string, string> {
  return {
    id: row.id,
    system: row.system,
    owner: row.owner,
    priority: row.priority,
    recoveryStatus: row.recoveryStatus,
    recoveryTime: row.recoveryTime,
    rto: row.objectives.rto,
    rpo: row.objectives.rpo,
  };
}

export function drBuildNew(values: Record<string, string>): CriticalSystem {
  return {
    id: values.id,
    system: values.system || "Imported system",
    owner: values.owner || "Unassigned",
    priority: (values.priority as DrSeverity) || "Medium",
    recoveryStatus:
      (values.recoveryStatus as SystemRecoveryStatus) || "Pending",
    recoveryTime: values.recoveryTime || "",
    dependencies: [],
    checklist: [],
    documents: [],
    logs: [],
    objectives: {
      rto: values.rto || "",
      rpo: values.rpo || "",
      mao: "",
    },
    aiRecommendations: ["Imported via Excel merge (session prototype)."],
  };
}

export function drMerge(
  existing: CriticalSystem,
  values: Record<string, string>
): CriticalSystem {
  return {
    ...existing,
    system: values.system || existing.system,
    owner: values.owner || existing.owner,
    priority: (values.priority as DrSeverity) || existing.priority,
    recoveryStatus:
      (values.recoveryStatus as SystemRecoveryStatus) ||
      existing.recoveryStatus,
    recoveryTime: values.recoveryTime || existing.recoveryTime,
    objectives: {
      ...existing.objectives,
      rto: values.rto || existing.objectives.rto,
      rpo: values.rpo || existing.objectives.rpo,
    },
  };
}

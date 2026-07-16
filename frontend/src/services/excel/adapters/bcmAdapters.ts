import type {
  BcmBusinessImpact,
  BcmCriticality,
  BcmProcessStatus,
  BcmRiskLevel,
  CriticalBusinessProcess,
} from "../../../mocks/types/bcm";

function emptyProcessExtras(id: string, owner: string): Pick<
  CriticalBusinessProcess,
  | "checklist"
  | "documents"
  | "aiRecommendations"
  | "bia"
  | "recoveryPlan"
  | "communicationPlan"
  | "evidence"
  | "attachments"
  | "testHistory"
  | "auditHistory"
  | "lessonsLearned"
  | "timeline"
  | "comments"
  | "versionHistory"
> {
  return {
    checklist: [],
    documents: [],
    aiRecommendations: ["Imported via Excel merge (session prototype)."],
    bia: {
      financialImpact: "Pending BIA capture.",
      operationalImpact: "Pending BIA capture.",
      regulatoryImpact: "Pending BIA capture.",
      reputationalImpact: "Pending BIA capture.",
      peakDependency: "Not specified",
      downtimeCostPerHour: 0,
      recoveryPriority: 3,
      riskScenario: "Not specified",
    },
    recoveryPlan: {
      primarySite: "",
      drSite: "",
      backupType: "",
      backupFrequency: "",
      recoveryMethod: "",
      alternateService: "",
      runbookRef: `${id}-RUNBOOK`,
      steps: [],
    },
    communicationPlan: {
      internalContacts: [owner || "Unassigned"],
      externalContacts: [],
      escalationPath: [],
      channels: [],
      templates: [],
    },
    evidence: [],
    attachments: [],
    testHistory: [],
    auditHistory: [
      {
        id: `${id}-import`,
        date: new Date().toISOString().slice(0, 10),
        action: "Imported",
        actor: "Excel Import",
        detail: "Record created or updated from Excel merge.",
      },
    ],
    lessonsLearned: [],
    timeline: [],
    comments: [],
    versionHistory: [
      {
        id: `${id}-v-import`,
        version: "1.0",
        date: new Date().toISOString().slice(0, 10),
        author: owner || "System",
        changeSummary: "Imported via Excel.",
      },
    ],
  };
}

function normalizeStatus(value: string | undefined, fallback: BcmProcessStatus): BcmProcessStatus {
  if (!value) return fallback;
  if (value === "Active") return "Ready";
  if (
    value === "Ready" ||
    value === "Testing" ||
    value === "At Risk" ||
    value === "Draft" ||
    value === "Review"
  ) {
    return value;
  }
  return fallback;
}

export function bcmToFlat(row: CriticalBusinessProcess): Record<string, string> {
  return {
    id: row.id,
    name: row.name,
    businessUnit: row.businessUnit,
    department: row.department,
    owner: row.owner,
    criticality: row.criticality,
    businessImpact: row.businessImpact,
    rto: row.rto,
    rpo: row.rpo,
    mao: row.mao,
    recoveryStrategy: row.recoveryStrategy,
    dependencies: row.dependencies.join("; "),
    recoveryTeam: row.recoveryTeam,
    status: row.status,
    lastTest: row.lastTest,
    nextTest: row.nextTest,
    nextReview: row.nextReview,
    version: row.version,
    riskLevel: row.riskLevel,
  };
}

export function bcmBuildNew(
  values: Record<string, string>
): CriticalBusinessProcess {
  const id = values.id;
  const owner = values.owner || "Unassigned";
  const strategy = values.recoveryStrategy || "Failover";
  return {
    id,
    name: values.name || "Imported process",
    businessUnit: values.businessUnit || "",
    department: values.department || "",
    owner,
    criticality: (values.criticality as BcmCriticality) || "Medium",
    businessImpact: (values.businessImpact as BcmBusinessImpact) || "Moderate",
    rto: values.rto || "",
    rpo: values.rpo || "",
    mao: values.mao || "",
    recoveryStrategy: strategy,
    dependencies: values.dependencies
      ? values.dependencies.split(";").map((s) => s.trim()).filter(Boolean)
      : [],
    recoveryTeam: values.recoveryTeam || "Unassigned",
    status: normalizeStatus(values.status, "Draft"),
    lastTest: values.lastTest || "",
    nextTest: values.nextTest || "",
    nextReview: values.nextReview || "",
    version: values.version || "1.0",
    riskLevel: (values.riskLevel as BcmRiskLevel) || "Medium",
    riskScore: 0,
    ...emptyProcessExtras(id, owner),
    recoveryPlan: {
      ...emptyProcessExtras(id, owner).recoveryPlan,
      recoveryMethod: strategy,
    },
  };
}

export function bcmMerge(
  existing: CriticalBusinessProcess,
  values: Record<string, string>
): CriticalBusinessProcess {
  return {
    ...existing,
    name: values.name || existing.name,
    businessUnit: values.businessUnit || existing.businessUnit,
    department: values.department || existing.department,
    owner: values.owner || existing.owner,
    criticality: (values.criticality as BcmCriticality) || existing.criticality,
    businessImpact:
      (values.businessImpact as BcmBusinessImpact) || existing.businessImpact,
    rto: values.rto || existing.rto,
    rpo: values.rpo || existing.rpo,
    mao: values.mao || existing.mao,
    recoveryStrategy: values.recoveryStrategy || existing.recoveryStrategy,
    dependencies: values.dependencies
      ? values.dependencies.split(";").map((s) => s.trim()).filter(Boolean)
      : existing.dependencies,
    recoveryTeam: values.recoveryTeam || existing.recoveryTeam,
    status: normalizeStatus(values.status, existing.status),
    lastTest: values.lastTest || existing.lastTest,
    nextTest: values.nextTest || existing.nextTest,
    nextReview: values.nextReview || existing.nextReview,
    version: values.version || existing.version,
    riskLevel: (values.riskLevel as BcmRiskLevel) || existing.riskLevel,
  };
}

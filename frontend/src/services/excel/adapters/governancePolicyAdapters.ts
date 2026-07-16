import type {
  ApprovalStatus,
  GovernanceDepartment,
  GovernancePolicy,
  PolicyCategory,
  PolicyStatus,
  ReviewFrequency,
} from "../../../mocks/types/governance";

export function policyToFlat(row: GovernancePolicy): Record<string, string> {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    department: row.department,
    owner: row.owner,
    approver: row.approver,
    version: row.version,
    effectiveDate: row.effectiveDate,
    nextReviewDate: row.nextReviewDate,
    reviewFrequency: row.reviewFrequency,
    approvalStatus: row.approvalStatus,
    policyStatus: row.policyStatus,
    frameworks: row.frameworks.join("; "),
    controls: row.controls.join("; "),
    notes: row.notes,
    lastUpdated: row.lastUpdated,
  };
}

function splitList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[;,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function policyBuildNew(
  values: Record<string, string>
): GovernancePolicy {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: values.id,
    name: values.name || "Imported Policy",
    description: values.description || "",
    category: (values.category as PolicyCategory) || "Information Security",
    department: (values.department as GovernanceDepartment) || "Cybersecurity GRC",
    owner: values.owner || "Unassigned",
    approver: values.approver || "",
    version: values.version || "1.0",
    effectiveDate: values.effectiveDate || now,
    nextReviewDate: values.nextReviewDate || now,
    reviewFrequency: (values.reviewFrequency as ReviewFrequency) || "Annual",
    approvalStatus: (values.approvalStatus as ApprovalStatus) || "Not Submitted",
    policyStatus: (values.policyStatus as PolicyStatus) || "Draft",
    frameworks: splitList(values.frameworks),
    controls: splitList(values.controls),
    evidenceNames: [],
    notes: values.notes || "",
    lastUpdated: values.lastUpdated || now,
    versions: [
      {
        version: values.version || "1.0",
        changeSummary: "Imported via Excel",
        changedBy: values.owner || "System",
        changeDate: now,
        approvalStatus:
          (values.approvalStatus as ApprovalStatus) || "Not Submitted",
        isCurrent: true,
      },
    ],
    activity: [
      {
        id: `imp-${values.id}`,
        at: `${now} 00:00`,
        actor: "System",
        action: "Imported",
      },
    ],
  };
}

export function policyMerge(
  existing: GovernancePolicy,
  values: Record<string, string>
): GovernancePolicy {
  return {
    ...existing,
    name: values.name || existing.name,
    description: values.description || existing.description,
    category: (values.category as PolicyCategory) || existing.category,
    department:
      (values.department as GovernanceDepartment) || existing.department,
    owner: values.owner || existing.owner,
    approver: values.approver || existing.approver,
    version: values.version || existing.version,
    effectiveDate: values.effectiveDate || existing.effectiveDate,
    nextReviewDate: values.nextReviewDate || existing.nextReviewDate,
    reviewFrequency:
      (values.reviewFrequency as ReviewFrequency) || existing.reviewFrequency,
    approvalStatus:
      (values.approvalStatus as ApprovalStatus) || existing.approvalStatus,
    policyStatus: (values.policyStatus as PolicyStatus) || existing.policyStatus,
    frameworks: values.frameworks
      ? splitList(values.frameworks)
      : existing.frameworks,
    controls: values.controls ? splitList(values.controls) : existing.controls,
    notes: values.notes ?? existing.notes,
    lastUpdated:
      values.lastUpdated || new Date().toISOString().slice(0, 10),
  };
}

import type {
  ComplianceAsset,
  ComplianceRiskLevel,
  ComplianceStatus,
  FrameworkCode,
  AssetType,
} from "../../../mocks/types/compliance";

export function complianceToFlat(row: ComplianceAsset): Record<string, string> {
  return {
    id: row.id,
    name: row.name,
    assetType: row.assetType,
    owner: row.owner,
    department: row.department,
    operatingSystem: row.operatingSystem,
    framework: row.framework,
    complianceStatus: row.complianceStatus,
    riskLevel: row.riskLevel,
    lastAssessment: row.lastAssessment,
    failedControlId: row.failedControlId,
    failedControlName: row.failedControlName,
  };
}

export function complianceBuildNew(
  values: Record<string, string>
): ComplianceAsset {
  return {
    id: values.id,
    name: values.name || "Imported Asset",
    assetType: (values.assetType as AssetType) || "Endpoint",
    owner: values.owner || "Unassigned",
    department: values.department || "",
    operatingSystem: values.operatingSystem || "N/A",
    framework: (values.framework as FrameworkCode) || "NCA ECC",
    failedControlId: values.failedControlId || "—",
    failedControlName: values.failedControlName || "—",
    complianceStatus:
      (values.complianceStatus as ComplianceStatus) || "Under Review",
    riskLevel: (values.riskLevel as ComplianceRiskLevel) || "Low",
    lastAssessment: values.lastAssessment || "",
    installedSoftware: [],
    securityConfiguration: [],
    frameworks: [(values.framework as FrameworkCode) || "NCA ECC"],
    failedControls: [],
    findings: [],
    remediation: [],
    historicalAssessments: [],
    auditHistory: [],
    relatedIncidents: [],
    aiRecommendation: "Imported via Excel merge (session prototype).",
  };
}

export function complianceMerge(
  existing: ComplianceAsset,
  values: Record<string, string>
): ComplianceAsset {
  return {
    ...existing,
    name: values.name || existing.name,
    assetType: (values.assetType as AssetType) || existing.assetType,
    owner: values.owner || existing.owner,
    department: values.department || existing.department,
    operatingSystem: values.operatingSystem || existing.operatingSystem,
    framework: (values.framework as FrameworkCode) || existing.framework,
    failedControlId: values.failedControlId || existing.failedControlId,
    failedControlName: values.failedControlName || existing.failedControlName,
    complianceStatus:
      (values.complianceStatus as ComplianceStatus) ||
      existing.complianceStatus,
    riskLevel: (values.riskLevel as ComplianceRiskLevel) || existing.riskLevel,
    lastAssessment: values.lastAssessment || existing.lastAssessment,
  };
}

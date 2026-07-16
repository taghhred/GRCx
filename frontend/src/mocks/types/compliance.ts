export type AssetType =
  | "Endpoint"
  | "Server"
  | "Employee"
  | "Service Account"
  | "Application"
  | "Database"
  | "Network Device"
  | "Cloud Resource";

export type ComplianceStatus =
  | "Compliant"
  | "Partially Compliant"
  | "Non-Compliant"
  | "Under Review";

export type ComplianceRiskLevel = "Low" | "Medium" | "High" | "Critical";

export type FrameworkCode = "NCA ECC" | "SAMA CSF" | "PCI DSS" | "ISO 27001";

export interface FailedControl {
  framework: FrameworkCode;
  controlId: string;
  controlName: string;
  status: "Failed" | "Partial" | "Passed";
  reason: string;
  recommendation: string;
}

export interface ComplianceAsset {
  id: string;
  name: string;
  assetType: AssetType;
  owner: string;
  department: string;
  operatingSystem: string;
  framework: FrameworkCode;
  failedControlId: string;
  failedControlName: string;
  complianceStatus: ComplianceStatus;
  riskLevel: ComplianceRiskLevel;
  lastAssessment: string;
  installedSoftware: string[];
  securityConfiguration: string[];
  frameworks: FrameworkCode[];
  failedControls: FailedControl[];
  findings: string[];
  remediation: string[];
  historicalAssessments: string[];
  auditHistory: string[];
  relatedIncidents: string[];
  aiRecommendation: string;
}

export interface AssetComplianceData {
  assets: ComplianceAsset[];
  departments: string[];
  frameworks: FrameworkCode[];
}

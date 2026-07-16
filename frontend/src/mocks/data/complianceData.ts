import type {
  AssetComplianceData,
  AssetType,
  ComplianceAsset,
  ComplianceRiskLevel,
  ComplianceStatus,
  FrameworkCode,
} from "../types/compliance";

const DEPARTMENTS = [
  "IT",
  "Finance",
  "Operations",
  "Retail Banking",
  "Security",
  "Treasury",
  "HR",
] as const;

function asset(
  partial: ComplianceAsset
): ComplianceAsset {
  return partial;
}

const seedAssets: ComplianceAsset[] = [
  asset({
    id: "ast-laptop-023",
    name: "Laptop-IT-023",
    assetType: "Endpoint",
    owner: "Mohammed",
    department: "IT",
    operatingSystem: "Windows 11",
    framework: "NCA ECC",
    failedControlId: "ECC-2-3",
    failedControlName: "Endpoint Protection",
    complianceStatus: "Non-Compliant",
    riskLevel: "High",
    lastAssessment: "2026-07-12",
    installedSoftware: ["Microsoft 365", "CrowdStrike", "BitLocker (disabled)"],
    securityConfiguration: ["Disk encryption: Off", "Firewall: On", "Local admin: Restricted"],
    frameworks: ["NCA ECC", "ISO 27001"],
    failedControls: [
      {
        framework: "NCA ECC",
        controlId: "ECC-2-3",
        controlName: "Endpoint Protection",
        status: "Failed",
        reason: "BitLocker is disabled.",
        recommendation: "Enable BitLocker and escrow recovery keys to Entra.",
      },
    ],
    findings: ["BitLocker policy not applied", "Recovery key missing from MDM"],
    remediation: ["Enable BitLocker via Intune", "Validate escrow within 24 hours"],
    historicalAssessments: ["2026-04-10 — Partially Compliant", "2026-07-12 — Non-Compliant"],
    auditHistory: ["2026-07-12 — Automated ECC scan"],
    relatedIncidents: ["INC-90112 — Endpoint encryption gap"],
    aiRecommendation:
      "Prioritize encryption remediation before the next NCA evidence pack submission.",
  }),
  asset({
    id: "ast-db-oracle-01",
    name: "DB-Oracle-01",
    assetType: "Database",
    owner: "Huda",
    department: "Operations",
    operatingSystem: "Oracle Linux 8",
    framework: "PCI DSS",
    failedControlId: "PCI 3.4",
    failedControlName: "Cryptographic protection of CHD",
    complianceStatus: "Non-Compliant",
    riskLevel: "Critical",
    lastAssessment: "2026-07-10",
    installedSoftware: ["Oracle 19c", "Oracle Audit Vault"],
    securityConfiguration: ["TDE: Disabled", "Network encryption: Partial"],
    frameworks: ["PCI DSS", "SAMA CSF"],
    failedControls: [
      {
        framework: "PCI DSS",
        controlId: "PCI 3.4",
        controlName: "Cryptographic protection of CHD",
        status: "Failed",
        reason: "Sensitive cardholder data is not encrypted.",
        recommendation: "Enable TDE and rotate encryption keys under dual control.",
      },
    ],
    findings: ["CHD columns stored in plaintext", "Key management SOP incomplete"],
    remediation: ["Enable Oracle TDE", "Migrate CHD tablespace", "Re-run PCI evidence scan"],
    historicalAssessments: ["2026-01-20 — Non-Compliant", "2026-07-10 — Non-Compliant"],
    auditHistory: ["2026-07-10 — QSA sample review"],
    relatedIncidents: ["INC-90140 — Unencrypted CHD store"],
    aiRecommendation:
      "Treat as Priority-1 PCI gap. Block new CHD writes until TDE is verified.",
  }),
  asset({
    id: "ast-finance-app",
    name: "Finance-App",
    assetType: "Application",
    owner: "Sara",
    department: "Finance",
    operatingSystem: "RHEL 9 / AKS",
    framework: "SAMA CSF",
    failedControlId: "IAM-04",
    failedControlName: "Privileged access control",
    complianceStatus: "Partially Compliant",
    riskLevel: "High",
    lastAssessment: "2026-07-08",
    installedSoftware: ["Finance ERP", "SSO connector"],
    securityConfiguration: ["SSO: Enforced", "Standing admin roles: 14"],
    frameworks: ["SAMA CSF", "NCA ECC"],
    failedControls: [
      {
        framework: "SAMA CSF",
        controlId: "IAM-04",
        controlName: "Privileged access control",
        status: "Failed",
        reason: "Excessive privileged accounts detected.",
        recommendation: "Convert standing admins to JIT and recertify monthly.",
      },
    ],
    findings: ["14 standing privileged roles", "3 orphaned service admins"],
    remediation: ["Enable PIM", "Remove orphaned admins", "Recertify access"],
    historicalAssessments: ["2026-03-01 — Compliant", "2026-07-08 — Partially Compliant"],
    auditHistory: ["2026-07-08 — SAMA CSF control sample"],
    relatedIncidents: [],
    aiRecommendation:
      "Reduce privileged footprint before Peak Payday; align with Identity Monitoring findings.",
  }),
  asset({
    id: "ast-emp-sara",
    name: "Sara",
    assetType: "Employee",
    owner: "People & Culture",
    department: "Security",
    operatingSystem: "N/A (Identity)",
    framework: "NCA ECC",
    failedControlId: "IAM-CTRL",
    failedControlName: "IAM Control — MFA",
    complianceStatus: "Non-Compliant",
    riskLevel: "Critical",
    lastAssessment: "2026-07-14",
    installedSoftware: [],
    securityConfiguration: ["MFA: Disabled", "Phishing-resistant methods: None"],
    frameworks: ["NCA ECC", "SAMA CSF"],
    failedControls: [
      {
        framework: "NCA ECC",
        controlId: "IAM-CTRL",
        controlName: "IAM Control",
        status: "Failed",
        reason: "MFA not enabled.",
        recommendation: "Enforce phishing-resistant MFA within 24 hours.",
      },
    ],
    findings: ["MFA methods removed", "Privileged role retained"],
    remediation: ["Force MFA enrollment", "Temporarily restrict privileged apps"],
    historicalAssessments: ["2026-06-01 — Compliant", "2026-07-14 — Non-Compliant"],
    auditHistory: ["2026-07-14 — Continuous IAM monitoring"],
    relatedIncidents: ["INC-88470 — Privileged MFA removal"],
    aiRecommendation:
      "Correlate with Identity Monitoring anomaly and open a GRC case if MFA remains disabled.",
  }),
  asset({
    id: "ast-srv-ad-01",
    name: "SRV-AD-01",
    assetType: "Server",
    owner: "Identity Ops",
    department: "IT",
    operatingSystem: "Windows Server 2022",
    framework: "NCA ECC",
    failedControlId: "ECC-1-2",
    failedControlName: "Secure configuration",
    complianceStatus: "Under Review",
    riskLevel: "Medium",
    lastAssessment: "2026-07-11",
    installedSoftware: ["AD DS", "DNS"],
    securityConfiguration: ["Hardening baseline: Partial", "LAPS: Enabled"],
    frameworks: ["NCA ECC", "ISO 27001"],
    failedControls: [
      {
        framework: "NCA ECC",
        controlId: "ECC-1-2",
        controlName: "Secure configuration",
        status: "Partial",
        reason: "CIS benchmark drift on 6 hardening settings.",
        recommendation: "Re-apply domain hardening GPO and re-scan.",
      },
    ],
    findings: ["SMB signing exception present"],
    remediation: ["Remove temporary SMB exception", "Re-run CIS scan"],
    historicalAssessments: ["2026-05-02 — Compliant"],
    auditHistory: ["2026-07-11 — Configuration drift alert"],
    relatedIncidents: [],
    aiRecommendation: "Close drift within the Under Review SLA (7 days).",
  }),
  asset({
    id: "ast-svc-backup",
    name: "svc-backup-agent",
    assetType: "Service Account",
    owner: "Infrastructure",
    department: "IT",
    operatingSystem: "N/A (Service Account)",
    framework: "ISO 27001",
    failedControlId: "A.8.2",
    failedControlName: "Privileged access rights",
    complianceStatus: "Partially Compliant",
    riskLevel: "Medium",
    lastAssessment: "2026-07-09",
    installedSoftware: [],
    securityConfiguration: ["Password age: 240 days", "Interactive logon: Allowed"],
    frameworks: ["ISO 27001", "NCA ECC"],
    failedControls: [
      {
        framework: "ISO 27001",
        controlId: "A.8.2",
        controlName: "Privileged access rights",
        status: "Failed",
        reason: "Service account allows interactive logon.",
        recommendation: "Deny interactive logon and rotate credentials.",
      },
    ],
    findings: ["Interactive logon right granted"],
    remediation: ["Apply GPO deny logon", "Rotate secret in vault"],
    historicalAssessments: ["2026-02-14 — Compliant"],
    auditHistory: ["2026-07-09 — Service account review"],
    relatedIncidents: [],
    aiRecommendation: "Treat as medium priority; include in monthly service-account recertification.",
  }),
  asset({
    id: "ast-fw-edge-02",
    name: "FW-EDGE-02",
    assetType: "Network Device",
    owner: "Network Engineering",
    department: "IT",
    operatingSystem: "FortiOS 7.4",
    framework: "SAMA CSF",
    failedControlId: "NET-07",
    failedControlName: "Network security monitoring",
    complianceStatus: "Compliant",
    riskLevel: "Low",
    lastAssessment: "2026-07-05",
    installedSoftware: [],
    securityConfiguration: ["IDS: On", "Config backup: Daily"],
    frameworks: ["SAMA CSF", "NCA ECC"],
    failedControls: [],
    findings: [],
    remediation: [],
    historicalAssessments: ["2026-07-05 — Compliant"],
    auditHistory: ["2026-07-05 — Automated NET control scan"],
    relatedIncidents: [],
    aiRecommendation: "No open gaps. Keep daily config backup validation.",
  }),
  asset({
    id: "ast-cloud-aks",
    name: "aks-payments-prod",
    assetType: "Cloud Resource",
    owner: "Cloud SRE",
    department: "Operations",
    operatingSystem: "Azure Kubernetes Service",
    framework: "PCI DSS",
    failedControlId: "PCI 2.2",
    failedControlName: "Secure configuration standards",
    complianceStatus: "Non-Compliant",
    riskLevel: "High",
    lastAssessment: "2026-07-13",
    installedSoftware: ["ingress-nginx", "cert-manager"],
    securityConfiguration: ["Pod security: Baseline", "Public ingress: Enabled"],
    frameworks: ["PCI DSS", "ISO 27001"],
    failedControls: [
      {
        framework: "PCI DSS",
        controlId: "PCI 2.2",
        controlName: "Secure configuration standards",
        status: "Failed",
        reason: "Cluster admits privileged pods outside CDE baseline.",
        recommendation: "Enforce restricted PSS and block privileged containers.",
      },
    ],
    findings: ["Privileged pod admissions in last 7 days"],
    remediation: ["Apply Gatekeeper policy", "Rebuild node pools"],
    historicalAssessments: ["2026-04-18 — Partially Compliant"],
    auditHistory: ["2026-07-13 — PCI cloud posture scan"],
    relatedIncidents: ["INC-90201 — Privileged pod admission"],
    aiRecommendation: "Isolate CDE workloads to a dedicated cluster before next PCI ROC.",
  }),
];

/** Expand seed set so the UI is ready for large inventories. */
function expandInventory(base: ComplianceAsset[], target = 64): ComplianceAsset[] {
  const statuses: ComplianceStatus[] = [
    "Compliant",
    "Partially Compliant",
    "Non-Compliant",
    "Under Review",
  ];
  const risks: ComplianceRiskLevel[] = ["Low", "Medium", "High", "Critical"];
  const types: AssetType[] = [
    "Endpoint",
    "Server",
    "Employee",
    "Service Account",
    "Application",
    "Database",
    "Network Device",
    "Cloud Resource",
  ];
  const frameworks: FrameworkCode[] = ["NCA ECC", "SAMA CSF", "PCI DSS", "ISO 27001"];
  const result = [...base];
  let i = 0;
  while (result.length < target) {
    const template = base[i % base.length];
    const n = result.length + 1;
    const type = types[n % types.length];
    const framework = frameworks[n % frameworks.length];
    const status = statuses[n % statuses.length];
    const risk = risks[n % risks.length];
    const hasFailure = status !== "Compliant";
    result.push({
      ...template,
      id: `${template.id}-x${n}`,
      name:
        type === "Employee"
          ? `Employee-${String(n).padStart(3, "0")}`
          : `${type.replace(/\s+/g, "-")}-${String(n).padStart(3, "0")}`,
      assetType: type,
      department: DEPARTMENTS[n % DEPARTMENTS.length],
      framework,
      frameworks: [framework, template.frameworks[0]],
      complianceStatus: status,
      riskLevel: risk,
      failedControlId: hasFailure ? template.failedControlId : "—",
      failedControlName: hasFailure ? template.failedControlName : "—",
      failedControls: hasFailure ? template.failedControls : [],
      findings: hasFailure ? template.findings : [],
      remediation: hasFailure ? template.remediation : [],
      lastAssessment: `2026-07-${String((n % 28) + 1).padStart(2, "0")}`,
      operatingSystem:
        type === "Employee" || type === "Service Account"
          ? "N/A"
          : template.operatingSystem,
    });
    i += 1;
  }
  return result;
}

export const assetComplianceData: AssetComplianceData = {
  departments: [...DEPARTMENTS],
  frameworks: ["NCA ECC", "SAMA CSF", "PCI DSS", "ISO 27001"],
  assets: expandInventory(seedAssets, 72),
};

export const ASSET_TYPE_TABS = [
  "All Assets",
  "Endpoints",
  "Servers",
  "Employees",
  "Service Accounts",
  "Applications",
  "Databases",
  "Network Devices",
  "Cloud Resources",
] as const;

export function tabToAssetType(
  tab: (typeof ASSET_TYPE_TABS)[number]
): AssetType | null {
  switch (tab) {
    case "Endpoints":
      return "Endpoint";
    case "Servers":
      return "Server";
    case "Employees":
      return "Employee";
    case "Service Accounts":
      return "Service Account";
    case "Applications":
      return "Application";
    case "Databases":
      return "Database";
    case "Network Devices":
      return "Network Device";
    case "Cloud Resources":
      return "Cloud Resource";
    default:
      return null;
  }
}

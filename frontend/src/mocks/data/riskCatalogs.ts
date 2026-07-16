/**
 * Enterprise Risk Assessment reference catalogs.
 * Used by the Wizard, Asset Inventory, Threat/Vulnerability libraries.
 */

export type AssetType =
  | "Server"
  | "Endpoint"
  | "Cloud"
  | "VM"
  | "Container"
  | "Database"
  | "Application"
  | "API"
  | "Identity System"
  | "PAM"
  | "IAM"
  | "Firewall"
  | "Switch"
  | "SIEM"
  | "SOAR"
  | "EDR"
  | "Email"
  | "OT"
  | "IoT"
  | "AI System"
  | "Data Store"
  | "Third Party";

export type AssetCriticality = "Critical" | "High" | "Medium" | "Low";

export interface RiskAsset {
  id: string;
  name: string;
  type: AssetType;
  criticality: AssetCriticality;
  owner: string;
  location: string;
  businessService: string;
  classification: string;
  confidentiality: 1 | 2 | 3 | 4 | 5;
  integrity: 1 | 2 | 3 | 4 | 5;
  availability: 1 | 2 | 3 | 4 | 5;
}

export interface ThreatItem {
  id: string;
  name: string;
  category: string;
  description: string;
  typicalLikelihood: number;
}

export interface VulnerabilityItem {
  id: string;
  name: string;
  category: string;
  description: string;
  typicalImpact: number;
}

export interface FrameworkControlRef {
  id: string;
  framework: string;
  controlId: string;
  name: string;
  owner: string;
  status: "Not Started" | "In Progress" | "Implemented" | "Partial";
  effectivenessPercent: number;
}

export const RISK_ASSETS: RiskAsset[] = [
  {
    id: "AST-001",
    name: "OpenShift Control Plane",
    type: "Container",
    criticality: "Critical",
    owner: "Cloud Ops",
    location: "Hybrid Cloud",
    businessService: "Container Platform",
    classification: "Confidential",
    confidentiality: 4,
    integrity: 5,
    availability: 5,
  },
  {
    id: "AST-002",
    name: "Privileged Access Vault",
    type: "PAM",
    criticality: "Critical",
    owner: "IAM Team",
    location: "Core DC",
    businessService: "Privileged Access",
    classification: "Restricted",
    confidentiality: 5,
    integrity: 5,
    availability: 4,
  },
  {
    id: "AST-003",
    name: "Customer Db2 Cluster",
    type: "Database",
    criticality: "Critical",
    owner: "Data Services",
    location: "Primary DC",
    businessService: "Customer Records",
    classification: "Restricted",
    confidentiality: 5,
    integrity: 5,
    availability: 4,
  },
  {
    id: "AST-004",
    name: "MQ Integration Hub",
    type: "Application",
    criticality: "High",
    owner: "Integration",
    location: "Primary DC",
    businessService: "Messaging",
    classification: "Internal",
    confidentiality: 3,
    integrity: 5,
    availability: 4,
  },
  {
    id: "AST-005",
    name: "Cloud Object Storage Vault",
    type: "Cloud",
    criticality: "High",
    owner: "Cloud Ops",
    location: "Saudi Region",
    businessService: "Object Storage",
    classification: "Confidential",
    confidentiality: 4,
    integrity: 4,
    availability: 3,
  },
  {
    id: "AST-006",
    name: "Enterprise SIEM",
    type: "SIEM",
    criticality: "Critical",
    owner: "SOC",
    location: "SOC Hub",
    businessService: "Detection",
    classification: "Confidential",
    confidentiality: 4,
    integrity: 5,
    availability: 5,
  },
  {
    id: "AST-007",
    name: "SOAR Orchestration",
    type: "SOAR",
    criticality: "High",
    owner: "SOC",
    location: "SOC Hub",
    businessService: "Response",
    classification: "Internal",
    confidentiality: 3,
    integrity: 4,
    availability: 4,
  },
  {
    id: "AST-008",
    name: "Corporate Email Gateway",
    type: "Email",
    criticality: "High",
    owner: "Messaging",
    location: "Edge",
    businessService: "Email",
    classification: "Internal",
    confidentiality: 3,
    integrity: 4,
    availability: 4,
  },
  {
    id: "AST-009",
    name: "Identity Provider (IAM)",
    type: "IAM",
    criticality: "Critical",
    owner: "IAM Team",
    location: "Core DC",
    businessService: "Authentication",
    classification: "Restricted",
    confidentiality: 5,
    integrity: 5,
    availability: 5,
  },
  {
    id: "AST-010",
    name: "API Gateway",
    type: "API",
    criticality: "High",
    owner: "API Platform",
    location: "DMZ",
    businessService: "Public APIs",
    classification: "Internal",
    confidentiality: 3,
    integrity: 4,
    availability: 4,
  },
  {
    id: "AST-011",
    name: "EDR Fleet Console",
    type: "EDR",
    criticality: "High",
    owner: "Endpoint Sec",
    location: "SOC Hub",
    businessService: "Endpoint Defense",
    classification: "Confidential",
    confidentiality: 4,
    integrity: 4,
    availability: 4,
  },
  {
    id: "AST-012",
    name: "AI Model Inference Cluster",
    type: "AI System",
    criticality: "Medium",
    owner: "AI Lab",
    location: "Secure Enclave",
    businessService: "Generative AI",
    classification: "Confidential",
    confidentiality: 4,
    integrity: 3,
    availability: 3,
  },
];

export const THREAT_LIBRARY: ThreatItem[] = [
  {
    id: "THR-001",
    name: "Unauthorized Access",
    category: "Access",
    description: "Access by an unauthorized actor to protected systems or data.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-002",
    name: "Credential Theft",
    category: "Identity",
    description: "Compromise of authentication secrets through phishing or malware.",
    typicalLikelihood: 4,
  },
  {
    id: "THR-003",
    name: "Ransomware",
    category: "Malware",
    description: "Encryption of critical data with extortion demands.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-004",
    name: "Malware",
    category: "Malware",
    description: "Malicious software execution on enterprise endpoints or servers.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-005",
    name: "Insider Threat",
    category: "Insider",
    description: "Malicious or negligent actions by privileged insiders.",
    typicalLikelihood: 2,
  },
  {
    id: "THR-006",
    name: "Supply Chain Compromise",
    category: "Third Party",
    description: "Compromise introduced through vendor software or services.",
    typicalLikelihood: 2,
  },
  {
    id: "THR-007",
    name: "Cloud Misconfiguration",
    category: "Cloud",
    description: "Insecure cloud configuration exposing assets or data.",
    typicalLikelihood: 4,
  },
  {
    id: "THR-008",
    name: "API Abuse",
    category: "Application",
    description: "Automated or unauthorized misuse of exposed APIs.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-009",
    name: "Privilege Escalation",
    category: "Access",
    description: "Elevation from limited to administrative privileges.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-010",
    name: "AI Prompt Injection",
    category: "AI",
    description: "Adversarial prompts that bypass AI policy or extract sensitive context.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-011",
    name: "Data Leakage",
    category: "Data",
    description: "Unauthorized exfiltration of sensitive information.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-012",
    name: "DDoS",
    category: "Availability",
    description: "Volumetric or application-layer denial of service.",
    typicalLikelihood: 2,
  },
  {
    id: "THR-013",
    name: "Phishing",
    category: "Social",
    description: "Social engineering to obtain credentials or deliver payloads.",
    typicalLikelihood: 5,
  },
  {
    id: "THR-014",
    name: "Business Email Compromise",
    category: "Social",
    description: "Fraudulent email impersonation targeting finance or executives.",
    typicalLikelihood: 3,
  },
  {
    id: "THR-015",
    name: "Shadow IT",
    category: "Governance",
    description: "Unmanaged systems outside approved IT control.",
    typicalLikelihood: 3,
  },
];

export const VULNERABILITY_LIBRARY: VulnerabilityItem[] = [
  {
    id: "VUL-001",
    name: "Weak Password Policy",
    category: "Identity",
    description: "Password complexity or rotation controls are insufficient.",
    typicalImpact: 4,
  },
  {
    id: "VUL-002",
    name: "No MFA",
    category: "Identity",
    description: "Multi-factor authentication is not enforced for critical access.",
    typicalImpact: 5,
  },
  {
    id: "VUL-003",
    name: "Excessive Privileges",
    category: "Access",
    description: "Standing privileges exceed least-privilege requirements.",
    typicalImpact: 5,
  },
  {
    id: "VUL-004",
    name: "Public Storage Bucket",
    category: "Cloud",
    description: "Object storage is publicly readable or writable.",
    typicalImpact: 5,
  },
  {
    id: "VUL-005",
    name: "Missing WAF",
    category: "Application",
    description: "Web applications lack reverse-proxy / WAF protection.",
    typicalImpact: 4,
  },
  {
    id: "VUL-006",
    name: "Weak IAM",
    category: "Identity",
    description: "Identity and access controls are incomplete or misconfigured.",
    typicalImpact: 5,
  },
  {
    id: "VUL-007",
    name: "No Logging",
    category: "Monitoring",
    description: "Critical systems do not produce usable audit logs.",
    typicalImpact: 4,
  },
  {
    id: "VUL-008",
    name: "No Monitoring",
    category: "Monitoring",
    description: "Detection coverage is missing for key attack patterns.",
    typicalImpact: 4,
  },
  {
    id: "VUL-009",
    name: "Unpatched Software",
    category: "Patch",
    description: "Known CVEs remain unremediated beyond SLA.",
    typicalImpact: 5,
  },
  {
    id: "VUL-010",
    name: "Weak Encryption",
    category: "Cryptography",
    description: "Deprecated ciphers or missing encryption at rest/in transit.",
    typicalImpact: 5,
  },
  {
    id: "VUL-011",
    name: "Shared Accounts",
    category: "Identity",
    description: "Non-attributable shared credentials are in use.",
    typicalImpact: 4,
  },
  {
    id: "VUL-012",
    name: "Broken Access Control",
    category: "Application",
    description: "Authorization checks can be bypassed at the application layer.",
    typicalImpact: 5,
  },
  {
    id: "VUL-013",
    name: "Open Ports",
    category: "Network",
    description: "Unnecessary services are exposed on network interfaces.",
    typicalImpact: 3,
  },
  {
    id: "VUL-014",
    name: "Misconfigured Firewall",
    category: "Network",
    description: "Firewall rules are overly permissive or stale.",
    typicalImpact: 4,
  },
];

export const FRAMEWORK_CONTROLS: FrameworkControlRef[] = [
  {
    id: "CTL-001",
    framework: "ISO 27001",
    controlId: "A.8.2",
    name: "Privileged access rights",
    owner: "IAM",
    status: "Implemented",
    effectivenessPercent: 75,
  },
  {
    id: "CTL-002",
    framework: "NCA ECC",
    controlId: "2-3-1",
    name: "Access control",
    owner: "GRC",
    status: "Partial",
    effectivenessPercent: 60,
  },
  {
    id: "CTL-003",
    framework: "NIST CSF",
    controlId: "PR.AC-1",
    name: "Identity management",
    owner: "IAM",
    status: "Implemented",
    effectivenessPercent: 80,
  },
  {
    id: "CTL-004",
    framework: "SAMA CSF",
    controlId: "3.3.3",
    name: "Cybersecurity operations",
    owner: "SOC",
    status: "In Progress",
    effectivenessPercent: 55,
  },
  {
    id: "CTL-005",
    framework: "PCI DSS",
    controlId: "8.3",
    name: "MFA for CDE access",
    owner: "Payments Sec",
    status: "Implemented",
    effectivenessPercent: 85,
  },
  {
    id: "CTL-006",
    framework: "CIS Controls",
    controlId: "5.4",
    name: "Restrict admin privileges",
    owner: "IAM",
    status: "Partial",
    effectivenessPercent: 65,
  },
  {
    id: "CTL-007",
    framework: "ISO 22301",
    controlId: "8.4",
    name: "Business continuity strategies",
    owner: "BCM",
    status: "In Progress",
    effectivenessPercent: 50,
  },
  {
    id: "CTL-008",
    framework: "NCA CSCC",
    controlId: "CSCC-04",
    name: "Cloud security monitoring",
    owner: "Cloud Sec",
    status: "Not Started",
    effectivenessPercent: 20,
  },
];

/** Heuristic enrichment so register rows gain threat/vuln/criticality context. */
export function enrichRiskContext(assetName: string, category: string) {
  const asset =
    RISK_ASSETS.find(
      (a) =>
        a.name.toLowerCase().includes(assetName.toLowerCase().slice(0, 12)) ||
        assetName.toLowerCase().includes(a.name.toLowerCase().slice(0, 12))
    ) ?? null;

  const threat =
    THREAT_LIBRARY.find((t) =>
      category.toLowerCase().includes(t.category.toLowerCase().slice(0, 4))
    ) ??
    THREAT_LIBRARY.find((t) =>
      assetName.toLowerCase().includes(t.name.toLowerCase().split(" ")[0]!)
    ) ??
    THREAT_LIBRARY[0]!;

  const vulnerability =
    VULNERABILITY_LIBRARY.find((v) =>
      category.toLowerCase().includes(v.category.toLowerCase().slice(0, 4))
    ) ?? VULNERABILITY_LIBRARY[2]!;

  return {
    asset,
    threat,
    vulnerability,
    assetCriticality: asset?.criticality ?? ("Medium" as AssetCriticality),
  };
}

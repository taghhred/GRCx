export type ViolationSeverity = "Critical" | "High" | "Medium" | "Low";

export interface ViolationListItem {
  id: string;
  employee: string;
  department: string;
  title: string;
  severity: ViolationSeverity;
  riskScore: number;
  framework: string[];
  confidence: number;
}

export const violationsData: ViolationListItem[] = [
  {
    id: "VIOL-001",
    employee: "Rayan",
    department: "Finance",
    title: "Excessive Privileged Access",
    severity: "Critical",
    riskScore: 96,
    framework: ["SAMA", "NCA"],
    confidence: 98,
  },
  {
    id: "VIOL-002",
    employee: "Sara",
    department: "IT Security",
    title: "Dormant Administrator Account",
    severity: "High",
    riskScore: 84,
    framework: ["NCA"],
    confidence: 95,
  },
  {
    id: "VIOL-003",
    employee: "Saad",
    department: "Operations",
    title: "Segregation of Duties Conflict",
    severity: "Critical",
    riskScore: 91,
    framework: ["SAMA", "ISO 27001"],
    confidence: 97,
  },
  {
    id: "VIOL-004",
    employee: "Noor",
    department: "Human Resources",
    title: "Inactive User Account",
    severity: "Medium",
    riskScore: 62,
    framework: ["NCA"],
    confidence: 92,
  },
  {
    id: "VIOL-005",
    employee: "Yousef",
    department: "Treasury",
    title: "Unreviewed Privileged Role",
    severity: "High",
    riskScore: 81,
    framework: ["SAMA"],
    confidence: 96,
  },
  {
    id: "VIOL-006",
    employee: "Majed",
    department: "Infrastructure",
    title: "Shared Administrative Account",
    severity: "Low",
    riskScore: 37,
    framework: ["NCA"],
    confidence: 88,
  },
];

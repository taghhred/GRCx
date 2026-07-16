import { displayFirstName } from "../../utils/reportDisplay";

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  department: string;
  children?: OrgNode[];
}

export interface ResponsibilityRow {
  id: string;
  name: string;
  role: string;
  department: string;
  responsibilities: string;
}

/** Executive hierarchy for Dashboard → Organization. First names only. */
export const DASHBOARD_ORG_TREE: OrgNode = {
  id: "ceo",
  name: displayFirstName("Sara"),
  role: "Chief Executive Officer",
  department: "Executive Office",
  children: [
    {
      id: "cio",
      name: displayFirstName("Mohammed"),
      role: "Chief Information Officer",
      department: "Technology",
      children: [
        {
          id: "ciso",
          name: displayFirstName("Ahmed"),
          role: "Chief Information Security Officer",
          department: "Information Security",
          children: [
            {
              id: "grc-dir",
              name: displayFirstName("Noura"),
              role: "GRC Director",
              department: "Cybersecurity GRC",
            },
            {
              id: "soc-mgr",
              name: displayFirstName("Khalid"),
              role: "SOC Manager",
              department: "Security Operations",
            },
          ],
        },
        {
          id: "it-dir",
          name: displayFirstName("Faisal"),
          role: "IT Director",
          department: "Infrastructure",
        },
      ],
    },
    {
      id: "cro",
      name: displayFirstName("Huda"),
      role: "Chief Risk Officer",
      department: "Risk",
      children: [
        {
          id: "risk-mgr",
          name: displayFirstName("Majed"),
          role: "Enterprise Risk Manager",
          department: "Risk",
        },
            {
              id: "bcm-mgr",
              name: "Amal",
              role: "BCM Manager",
              department: "Business Continuity",
            },
      ],
    },
    {
      id: "cco",
      name: displayFirstName("Fatimah"),
      role: "Chief Compliance Officer",
      department: "Compliance",
      children: [
        {
          id: "comp-lead",
          name: displayFirstName("Omar"),
          role: "Compliance Lead",
          department: "Compliance",
        },
      ],
    },
  ],
};

export const DASHBOARD_RESPONSIBILITIES: ResponsibilityRow[] = [
  {
    id: "r1",
    name: "Sara",
    role: "Chief Executive Officer",
    department: "Executive Office",
    responsibilities: "Enterprise strategy · Board reporting · Risk appetite",
  },
  {
    id: "r2",
    name: "Mohammed",
    role: "Chief Information Officer",
    department: "Technology",
    responsibilities: "Technology portfolio · Digital resilience · IT governance",
  },
  {
    id: "r3",
    name: "Ahmed",
    role: "Chief Information Security Officer",
    department: "Information Security",
    responsibilities: "Cybersecurity program · Control assurance · Incident escalation",
  },
  {
    id: "r4",
    name: "Huda",
    role: "Chief Risk Officer",
    department: "Risk",
    responsibilities: "Enterprise risk · Residual exposure · Risk committee",
  },
  {
    id: "r5",
    name: "Fatimah",
    role: "Chief Compliance Officer",
    department: "Compliance",
    responsibilities: "Regulatory frameworks · Attestations · Findings closure",
  },
  {
    id: "r6",
    name: "Noura",
    role: "GRC Director",
    department: "Cybersecurity GRC",
    responsibilities: "GRC platform · Policy lifecycle · Control mapping",
  },
  {
    id: "r7",
    name: "Khalid",
    role: "SOC Manager",
    department: "Security Operations",
    responsibilities: "Threat monitoring · Case triage · Escalation SLAs",
  },
  {
    id: "r8",
    name: "Majed",
    role: "Enterprise Risk Manager",
    department: "Risk",
    responsibilities: "Risk register · Assessments · Treatment tracking",
  },
  {
    id: "r9",
    name: "Amal",
    role: "BCM Manager",
    department: "Business Continuity",
    responsibilities: "BIA · Continuity plans · Exercise schedule",
  },
  {
    id: "r10",
    name: "Omar",
    role: "Compliance Lead",
    department: "Compliance",
    responsibilities: "NCA ECC · SAMA CSF · Evidence packs",
  },
  {
    id: "r11",
    name: "Faisal",
    role: "IT Director",
    department: "Infrastructure",
    responsibilities: "Critical systems · Recovery readiness · Change control",
  },
];

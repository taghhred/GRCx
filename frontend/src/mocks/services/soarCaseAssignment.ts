import type { SoarSpecialization } from "../types/grcCases";
import { GRC_ANALYSTS } from "../data/analysts";

export interface GrcSpecialistProfile {
  id: string;
  name: string;
  active: boolean;
  specialization: SoarSpecialization;
  departments: string[];
}

/** Active GRC specialists used for SOAR auto-assignment load balancing. */
export const GRC_SPECIALISTS: GrcSpecialistProfile[] = [
  {
    id: "anl-mohammed",
    name: "Mohammed",
    active: true,
    specialization: "Identity",
    departments: ["IT Security", "IT", "Finance"],
  },
  {
    id: "anl-sara",
    name: "Sara",
    active: true,
    specialization: "Compliance",
    departments: ["Compliance", "Legal", "Sales"],
  },
  {
    id: "anl-ahmed",
    name: "Ahmed",
    active: true,
    specialization: "BCM",
    departments: ["Operations", "Business Continuity"],
  },
  {
    id: "anl-fatimah",
    name: "Fatimah",
    active: true,
    specialization: "Risk",
    departments: ["Risk", "Security", "Procurement"],
  },
  {
    id: "anl-noura",
    name: "Noura",
    active: true,
    specialization: "DR",
    departments: ["IT Operations", "Infrastructure", "IT"],
  },
  {
    id: "anl-khalid",
    name: "Khalid",
    active: true,
    specialization: "General",
    departments: ["Procurement", "HR"],
  },
];

export function countOpenAssignments(
  assigneeName: string,
  cases: Array<{ assignedTo: string; status: string; archived?: boolean }>
): number {
  return cases.filter(
    (c) =>
      c.assignedTo === assigneeName &&
      !c.archived &&
      c.status !== "Closed" &&
      c.status !== "Rejected" &&
      c.status !== "Archived"
  ).length;
}

/**
 * Load-balanced auto-assignment for inbound SOAR cases.
 * Prefer specialization + department ownership, then lowest open caseload.
 */
export function autoAssignSpecialist(input: {
  specialization: SoarSpecialization;
  department: string;
  openCases: Array<{ assignedTo: string; status: string; archived?: boolean }>;
}): GrcSpecialistProfile {
  const active = GRC_SPECIALISTS.filter((s) => s.active);
  const bySpec = active.filter((s) => s.specialization === input.specialization);
  const byDept = active.filter((s) =>
    s.departments.some(
      (d) => d.toLowerCase() === input.department.toLowerCase()
    )
  );

  const pool =
    bySpec.length > 0 ? bySpec : byDept.length > 0 ? byDept : active;

  const ranked = [...pool].sort((a, b) => {
    const loadA = countOpenAssignments(a.name, input.openCases);
    const loadB = countOpenAssignments(b.name, input.openCases);
    if (loadA !== loadB) return loadA - loadB;
    return a.name.localeCompare(b.name);
  });

  return ranked[0] ?? active[0]!;
}

export function listSharableSpecialists(ownerName: string) {
  return GRC_ANALYSTS.filter((a) => a.name !== ownerName);
}

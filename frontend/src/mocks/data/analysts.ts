import type { GrcAnalyst } from "../types/collaboration";
import { mockInitials } from "./mockPeople";

/** Prototype current analyst — used for Shared With Me and notifications. */
export const CURRENT_ANALYST: GrcAnalyst = {
  id: "anl-sara",
  name: "Sara",
  role: "GRC Analyst",
  department: "Compliance",
  initials: "SA",
};

export const GRC_ANALYSTS: GrcAnalyst[] = [
  CURRENT_ANALYST,
  {
    id: "anl-mohammed",
    name: "Mohammed",
    role: "Senior GRC Analyst",
    department: "IT Security",
    initials: "MO",
  },
  {
    id: "anl-ahmed",
    name: "Ahmed",
    role: "GRC Analyst",
    department: "Infrastructure",
    initials: "AH",
  },
  {
    id: "anl-fatimah",
    name: "Fatimah",
    role: "Compliance Analyst",
    department: "Compliance",
    initials: "FA",
  },
  {
    id: "anl-noura",
    name: "Noura",
    role: "Cloud GRC Analyst",
    department: "IT",
    initials: "NO",
  },
  {
    id: "anl-khalid",
    name: "Khalid",
    role: "Third-Party Risk Analyst",
    department: "Procurement",
    initials: "KH",
  },
];

/** First-name display helper (names are already first-name only). */
export function shortName(fullName: string): string {
  return fullName.split(/\s+/)[0] ?? fullName;
}

export function initialsFromName(fullName: string): string {
  return mockInitials(shortName(fullName));
}

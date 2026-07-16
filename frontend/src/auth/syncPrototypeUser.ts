/**
 * Bridges AuthProvider → prototype collaboration CURRENT_USER without
 * rewriting every mock service call site in Phase 1.
 */

export type PrototypeUser = {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  isManager: boolean;
};

const DEFAULT_USER: PrototypeUser = {
  id: "anl-mohammed",
  name: "Mohammed",
  shortName: "Mohammed",
  initials: "MA",
  isManager: true,
};

/** Mutable identity used by mock collaboration / SOAR assignment flows. */
export const CURRENT_USER: PrototypeUser = { ...DEFAULT_USER };

export function syncPrototypeCurrentUser(user: PrototypeUser | null): void {
  const next = user ?? DEFAULT_USER;
  CURRENT_USER.id = next.id;
  CURRENT_USER.name = next.name;
  CURRENT_USER.shortName = next.shortName;
  CURRENT_USER.initials = next.initials;
  CURRENT_USER.isManager = next.isManager;
}

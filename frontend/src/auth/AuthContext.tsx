import { useMemo, type ReactNode } from "react";
import { LOCAL_DEMO_USER } from "./demoUser";
import { syncPrototypeCurrentUser } from "./syncPrototypeUser";
import { AuthContext, type AuthContextValue } from "./authTypes";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

// Sync once at module load for mock collaboration services.
syncPrototypeCurrentUser({
  id: LOCAL_DEMO_USER.id,
  name: LOCAL_DEMO_USER.full_name,
  shortName: LOCAL_DEMO_USER.full_name.split(/\s+/)[0] || LOCAL_DEMO_USER.full_name,
  initials: initialsFromName(LOCAL_DEMO_USER.full_name),
  isManager: LOCAL_DEMO_USER.is_manager,
});

type AuthProviderProps = { children: ReactNode };

/**
 * Hackathon identity provider — always authenticated with an in-memory user.
 * No login, cookies, or /auth/demo calls.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const value = useMemo<AuthContextValue>(
    () => ({
      status: "authenticated",
      user: LOCAL_DEMO_USER,
      isAuthenticated: true,
      isMockSession: false,
      isDemoMode: true,
      login: async () => undefined,
      enterDemoSession: async () => undefined,
      logout: async () => undefined,
      hasRole: (role: string) => LOCAL_DEMO_USER.roles.includes(role),
      hasPermission: (code: string) =>
        LOCAL_DEMO_USER.roles.includes("Admin") ||
        LOCAL_DEMO_USER.permissions.includes(code),
    }),
    []
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

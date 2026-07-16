import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMe,
  loginApi,
  logoutApiWithRefresh,
  type AuthUser,
} from "../services/api/authApi";
import { clearMockUserJson, setRememberMe } from "../services/api/config";
import { syncPrototypeCurrentUser } from "./syncPrototypeUser";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "./authTypes";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const applyUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    setStatus(next ? "authenticated" : "anonymous");
    if (next) {
      syncPrototypeCurrentUser({
        id: next.id,
        name: next.full_name,
        shortName: next.full_name.split(/\s+/)[0] || next.full_name,
        initials: initialsFromName(next.full_name),
        isManager: next.is_manager,
      });
    } else {
      syncPrototypeCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      clearMockUserJson();
      try {
        const me = await fetchMe();
        if (!cancelled) applyUser(me);
      } catch {
        if (!cancelled) applyUser(null);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  const login = useCallback(
    async (
      emailOrUsername: string,
      password: string,
      rememberMe: boolean
    ) => {
      setRememberMe(rememberMe);
      const me = await loginApi(emailOrUsername, password, rememberMe);
      applyUser(me);
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    await logoutApiWithRefresh();
    applyUser(null);
  }, [applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated" && !!user,
      isMockSession: false,
      login,
      logout,
      hasRole: (role: string) => !!user?.roles.includes(role),
      hasPermission: (code: string) =>
        !!user?.roles.includes("Admin") || !!user?.permissions.includes(code),
    }),
    [status, user, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  demoLoginApi,
  fetchMe,
  loginApi,
  logoutApiWithRefresh,
  type AuthUser,
} from "../services/api/authApi";
import {
  clearMockUserJson,
  isDemoModeEnabled,
  setRememberMe,
} from "../services/api/config";
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
  const demoMode = isDemoModeEnabled();
  const demoAttempted = useRef(false);

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

  const enterDemoSession = useCallback(async () => {
    if (!demoMode) {
      throw new Error("Demo mode is disabled");
    }
    setStatus("loading");
    try {
      const me = await demoLoginApi();
      applyUser(me);
    } catch (err) {
      applyUser(null);
      setStatus("demo_error");
      throw err;
    }
  }, [applyUser, demoMode]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      clearMockUserJson();
      try {
        const me = await fetchMe();
        if (!cancelled) applyUser(me);
        return;
      } catch {
        /* no existing session */
      }

      if (!demoMode) {
        if (!cancelled) applyUser(null);
        return;
      }

      // Demo mode: create session once before any protected UI renders.
      if (demoAttempted.current) {
        if (!cancelled) setStatus("demo_error");
        return;
      }
      demoAttempted.current = true;
      try {
        const me = await demoLoginApi();
        if (!cancelled) applyUser(me);
      } catch {
        if (!cancelled) {
          applyUser(null);
          setStatus("demo_error");
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyUser, demoMode]);

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
    if (demoMode) {
      // Allow a fresh demo session after logout in showcase mode.
      demoAttempted.current = false;
      setStatus("loading");
      try {
        const me = await demoLoginApi();
        applyUser(me);
      } catch {
        applyUser(null);
        setStatus("demo_error");
      }
    }
  }, [applyUser, demoMode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated" && !!user,
      isMockSession: false,
      isDemoMode: demoMode,
      login,
      enterDemoSession,
      logout,
      hasRole: (role: string) => !!user?.roles.includes(role),
      hasPermission: (code: string) =>
        !!user?.roles.includes("Admin") || !!user?.permissions.includes(code),
    }),
    [status, user, login, logout, enterDemoSession, demoMode]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

import { createContext } from "react";
import type { AuthUser } from "../services/api/authApi";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True when session is local mock (backend unreachable / mocks mode). */
  isMockSession: boolean;
  login: (
    emailOrUsername: string,
    password: string,
    rememberMe: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (code: string) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

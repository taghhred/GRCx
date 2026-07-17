import { createContext } from "react";
import type { AuthUser } from "../services/api/authApi";

export type AuthStatus = "authenticated";

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser;
  isAuthenticated: true;
  isMockSession: boolean;
  isDemoMode: true;
  login: (
    emailOrUsername: string,
    password: string,
    rememberMe: boolean
  ) => Promise<void>;
  enterDemoSession: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (code: string) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

import { apiRequest } from "./client";
import { apiBaseUrl, clearMockUserJson } from "./config";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  department?: string | null;
  is_active: boolean;
  is_manager: boolean;
  roles: string[];
  permissions: string[];
}

export async function loginApi(
  email: string,
  password: string,
  rememberMe = false
): Promise<AuthUser> {
  await apiRequest<{
    access_token: string;
    refresh_token: string;
  }>("/auth/login", {
    body: {
      email: email.trim(),
      password,
      remember_me: rememberMe,
    },
    auth: false,
  });
  clearMockUserJson();
  return apiRequest<AuthUser>("/auth/me");
}

/** Server-side demo session (DEMO_MODE). Cookie-only; no client roles/ids. */
export async function demoLoginApi(): Promise<AuthUser> {
  await apiRequest<{
    access_token: string;
    refresh_token: string;
  }>("/auth/demo", {
    method: "POST",
    body: {},
    auth: false,
  });
  clearMockUserJson();
  return apiRequest<AuthUser>("/auth/me");
}

export async function fetchMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me");
}

export async function logoutApiWithRefresh(): Promise<void> {
  try {
    await fetch(`${apiBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-GRCx-CSRF": "1" },
    });
  } catch {
    /* still clear local remnants */
  } finally {
    clearMockUserJson();
  }
}

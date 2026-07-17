/**
 * Frontend API client — cookie session (credentials: include).
 * Do not store access/refresh tokens in localStorage.
 */

export function isMocksEnabled(): boolean {
  const flag = import.meta.env.VITE_USE_MOCKS;
  if (flag === undefined || flag === "") return false;
  return String(flag).toLowerCase() === "true";
}

/** Hackathon open-access flag (backend DEMO_MODE). Frontend no longer gates on this. */
export function isDemoModeEnabled(): boolean {
  return true;
}

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  // Production builds must target the public backend only (never AI/Ollama).
  if (!configured) {
    if (import.meta.env.PROD) {
      throw new Error(
        "VITE_API_BASE_URL is required for production builds (public backend URL).",
      );
    }
  }
  const raw = configured || "http://localhost:8002/api/v1";
  // Normalize if someone set only the host
  if (raw.endsWith("/api/v1")) return raw;
  if (raw.match(/^https?:\/\/[^/]+$/)) return `${raw}/api/v1`;
  return raw;
}

const REMEMBER_KEY = "grcx_remember_me";

export function setRememberMe(remember: boolean): void {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, "1");
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
}

export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

/** Tokens live in HttpOnly cookies — no-ops kept for cleanup of legacy storage. */
export function getAccessToken(): string | null {
  return null;
}

export function getRefreshToken(): string | null {
  return null;
}

export function setTokens(_a?: string, _b?: string): void {
  void _a;
  void _b;
}

export function clearTokens(): void {
  /* cookies cleared by API logout */
}

export function clearMockUserJson(): void {
  try {
    sessionStorage.removeItem("grcx_mock_user");
    localStorage.removeItem("grcx_mock_user");
    sessionStorage.removeItem("grcx_access_token");
    sessionStorage.removeItem("grcx_refresh_token");
    localStorage.removeItem("grcx_access_token");
    localStorage.removeItem("grcx_refresh_token");
  } catch {
    /* ignore */
  }
}

export function getMockUserJson(): string | null {
  return null;
}

export function setMockUserJson(json?: string): void {
  void json;
}

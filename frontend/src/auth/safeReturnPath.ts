/** Safe post-login return path — blocks open redirects. */

import { isSafeInternalPath } from "../utils/security";

const FORBIDDEN_RETURN = new Set(["/login"]);

export function sanitizeReturnPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!raw) return fallback;

  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  path = path.split("#")[0] ?? path;

  if (!isSafeInternalPath(path)) return fallback;

  const pathname = path.split("?")[0] ?? path;
  if (FORBIDDEN_RETURN.has(pathname)) return fallback;
  if (pathname.startsWith("/login")) return fallback;

  return path;
}

export function buildLoginRedirect(currentPath: string, search = ""): string {
  const next = sanitizeReturnPath(`${currentPath}${search}`);
  if (next === "/dashboard") return "/login";
  return `/login?next=${encodeURIComponent(next)}`;
}

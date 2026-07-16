/** Safe frontend helpers aligned with OWASP guidance (no secrets, no open redirects). */

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Same-origin relative paths only — blocks protocol-relative and absolute URLs. */
export function isSafeInternalPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("://") &&
    !path.includes("\\")
  );
}

export function isSafeRouteId(id: string | undefined): id is string {
  return typeof id === "string" && SAFE_ID_PATTERN.test(id);
}

export const SEARCH_MAX_LENGTH = 120;
export const CHAT_MESSAGE_MAX_LENGTH = 2000;

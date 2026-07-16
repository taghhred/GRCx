/** Display only the first given name in Reports UI and PDF metadata. */
export function displayFirstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "—";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "—";
}

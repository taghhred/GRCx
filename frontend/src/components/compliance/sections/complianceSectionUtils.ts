/**
 * Shared helpers for Compliance Management sections.
 */
import type { Severity } from "../../../mocks/types/dashboard";

export const CHART_PALETTE = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-info)",
  "var(--color-danger)",
  "var(--color-high)",
  "var(--color-low)",
  "var(--color-text-muted)",
];

const VALID_SEVERITIES = new Set(["Critical", "High", "Medium", "Low"]);

export function asSeverity(level: string | null | undefined): Severity {
  return (VALID_SEVERITIES.has(level ?? "") ? level : "Medium") as Severity;
}

export function complianceStatusTone(
  status: string
): "success" | "warning" | "danger" | "info" | "neutral" {
  const s = status.toLowerCase();
  if (s === "compliant" || s === "passed" || s === "approved" || s === "available") {
    return "success";
  }
  if (
    s.includes("partial") ||
    s.includes("requires update") ||
    s === "in progress" ||
    s.includes("pending")
  ) {
    return "warning";
  }
  if (s.includes("under review") || s.includes("submitted")) return "info";
  if (s.includes("non-compliant") || s.includes("fail") || s.includes("reject")) {
    return "danger";
  }
  return "neutral";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdueReview(nextReview: string | null | undefined): boolean {
  if (!nextReview) return false;
  return nextReview < todayIso();
}

export function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort();
}

export function groupCount<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item) || "Unspecified";
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

export interface CountEntry {
  name: string;
  count: number;
}

export function topEntries(record: Record<string, number>, n: number): CountEntry[] {
  return Object.entries(record)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function formatDate(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "—";
}

export function fmtScore(value: number | null | undefined): string {
  return value == null ? "—" : String(value);
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

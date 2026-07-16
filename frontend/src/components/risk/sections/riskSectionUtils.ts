/**
 * Shared helpers for the Risk Assessment section components.
 * Keeps derived-metric logic consistent across Overview / Register / Heatmap /
 * Treatment / Analytics / Wizard so figures never drift between screens.
 */
import type { Severity } from "../../../mocks/types/dashboard";
import type { EnrichedRisk } from "../../../services/risk/RiskModuleContext";

export const CLOSED_STATUSES = new Set(["Closed", "Archived"]);
export const MITIGATED_CLOSEDISH_STATUSES = new Set(["Closed", "Accepted"]);

export const LEVEL_COLOR_VAR: Record<string, string> = {
  Critical: "var(--color-critical)",
  High: "var(--color-high)",
  Medium: "var(--color-medium)",
  Low: "var(--color-low)",
};

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

export function statusTone(
  status: string
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Closed" || status === "Accepted") return "success";
  if (status === "Remediation in Progress" || status === "In Progress") return "warning";
  if (status === "Under Assessment" || status === "Pending Approval" || status === "Pending Evidence")
    return "info";
  if (status === "Archived") return "neutral";
  return "danger";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function levelOf(risk: EnrichedRisk): string {
  return (risk.residualLevel || risk.inherentLevel || "Medium").toString();
}

export function scoreOf(risk: EnrichedRisk): number | null {
  return risk.residualScore ?? risk.inherentScore ?? null;
}

export function likelihoodOf(risk: EnrichedRisk): number | null {
  return risk.residualLikelihood ?? risk.inherentLikelihood ?? null;
}

export function impactOf(risk: EnrichedRisk): number | null {
  return risk.residualImpact ?? risk.inherentImpact ?? null;
}

export function isOverdue(risk: EnrichedRisk): boolean {
  if (!risk.nextReviewDate) return false;
  if (CLOSED_STATUSES.has(risk.status)) return false;
  return risk.nextReviewDate < todayIso();
}

export function isMitigatedClosed(risk: EnrichedRisk): boolean {
  return risk.treatment === "Mitigate" && MITIGATED_CLOSEDISH_STATUSES.has(risk.status);
}

export function hasTreatmentSet(risk: EnrichedRisk): boolean {
  return Boolean(risk.treatment && risk.treatment.trim().length > 0);
}

/** Wizard/step-9 scoring bands, per the enterprise risk methodology used by the wizard. */
export function levelFromScoreWizard(score: number | null): "Low" | "Medium" | "High" | "Critical" {
  if (score == null) return "Medium";
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

/** 5-band matrix cell coloring (score 1-25 split into quintiles) for the heatmap. */
export function scoreBandClass(score: number): "l1" | "l2" | "l3" | "l4" | "l5" {
  if (score <= 5) return "l1";
  if (score <= 10) return "l2";
  if (score <= 15) return "l3";
  if (score <= 20) return "l4";
  return "l5";
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

/** Neutralizes CSV/Excel formula injection for values that may begin with =, +, -, or @. */
export function sanitizeExportCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function monthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.length < 7) return null;
  return dateStr.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

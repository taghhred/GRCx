import type {
  KpiStatusLabel,
  PerformanceDirection,
} from "../mocks/types/governance";

/**
 * Calculate semantic KPI status from value + thresholds.
 * Does not mutate inputs.
 */
export function calculateKpiStatus(options: {
  value: number | null | undefined;
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  direction: PerformanceDirection;
  targetMin?: number;
  targetMax?: number;
}): KpiStatusLabel {
  const { value, target, warningThreshold, criticalThreshold, direction } =
    options;

  if (value == null || Number.isNaN(value)) {
    return "No Data";
  }

  if (direction === "Higher Is Better") {
    if (value >= target) return "On Target";
    if (value >= warningThreshold) return "Warning";
    return "Critical";
  }

  if (direction === "Lower Is Better") {
    if (value <= target) return "On Target";
    if (value <= warningThreshold) return "Warning";
    return "Critical";
  }

  // Target Range
  const min = options.targetMin ?? Math.min(target, warningThreshold);
  const max = options.targetMax ?? Math.max(target, warningThreshold);
  if (value >= min && value <= max) return "On Target";
  const span = Math.max(max - min, 1);
  const band = span * 0.25;
  if (value >= min - band && value <= max + band) return "Warning";
  void criticalThreshold;
  return "Critical";
}

export function kpiStatusTone(
  status: KpiStatusLabel
): "success" | "warning" | "danger" | "neutral" {
  if (status === "On Target") return "success";
  if (status === "Warning") return "warning";
  if (status === "Critical") return "danger";
  return "neutral";
}

export function policyStatusTone(
  status: string
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Published" || status === "Approved") return "success";
  if (status === "Pending Approval" || status === "Under Review") return "warning";
  if (status === "Expired" || status === "Archived") return "neutral";
  if (status === "Draft") return "info";
  return "neutral";
}

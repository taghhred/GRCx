import type {
  GovernanceDepartment,
  GovernanceKpi,
  KpiCategory,
  KpiDataSource,
  KpiFrequency,
  KpiUnit,
  PerformanceDirection,
} from "../../../mocks/types/governance";
import { calculateKpiStatus } from "../../../utils/kpiStatus";

export function kpiToFlat(row: GovernanceKpi): Record<string, string> {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    department: row.department,
    owner: row.owner,
    frequency: row.frequency,
    unit: row.unit,
    formula: row.formula,
    direction: row.direction,
    target: String(row.target),
    warningThreshold: String(row.warningThreshold),
    criticalThreshold: String(row.criticalThreshold),
    currentValue: row.currentValue == null ? "" : String(row.currentValue),
    status: row.status,
    dataSource: row.dataSource,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    lastUpdated: row.lastUpdated,
    notes: row.notes,
  };
}

function num(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function numOrNull(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function kpiBuildNew(values: Record<string, string>): GovernanceKpi {
  const now = new Date().toISOString().slice(0, 10);
  const direction =
    (values.direction as PerformanceDirection) || "Higher Is Better";
  const target = num(values.target, 0);
  const warningThreshold = num(values.warningThreshold, 0);
  const criticalThreshold = num(values.criticalThreshold, 0);
  const currentValue = numOrNull(values.currentValue);
  const status = calculateKpiStatus({
    value: currentValue,
    target,
    warningThreshold,
    criticalThreshold,
    direction,
  });
  return {
    id: values.id,
    name: values.name || "Imported KPI",
    description: values.description || "",
    category: (values.category as KpiCategory) || "Governance",
    department: (values.department as GovernanceDepartment) || "Cybersecurity GRC",
    owner: values.owner || "Unassigned",
    frequency: (values.frequency as KpiFrequency) || "Monthly",
    unit: (values.unit as KpiUnit) || "Percentage",
    formula: values.formula || "",
    direction,
    target,
    warningThreshold,
    criticalThreshold,
    currentValue,
    status,
    dataSource: (values.dataSource as KpiDataSource) || "Excel Import",
    periodStart: values.periodStart || now,
    periodEnd: values.periodEnd || now,
    lastUpdated: values.lastUpdated || now,
    evidenceNames: [],
    notes: values.notes || "",
    measurements: [],
  };
}

export function kpiMerge(
  existing: GovernanceKpi,
  values: Record<string, string>
): GovernanceKpi {
  const direction =
    (values.direction as PerformanceDirection) || existing.direction;
  const target = values.target ? num(values.target, existing.target) : existing.target;
  const warningThreshold = values.warningThreshold
    ? num(values.warningThreshold, existing.warningThreshold)
    : existing.warningThreshold;
  const criticalThreshold = values.criticalThreshold
    ? num(values.criticalThreshold, existing.criticalThreshold)
    : existing.criticalThreshold;
  const currentValue =
    values.currentValue !== undefined && values.currentValue !== ""
      ? numOrNull(values.currentValue)
      : existing.currentValue;
  const status = calculateKpiStatus({
    value: currentValue,
    target,
    warningThreshold,
    criticalThreshold,
    direction,
    targetMin: existing.targetMin,
    targetMax: existing.targetMax,
  });
  return {
    ...existing,
    name: values.name || existing.name,
    description: values.description || existing.description,
    category: (values.category as KpiCategory) || existing.category,
    department:
      (values.department as GovernanceDepartment) || existing.department,
    owner: values.owner || existing.owner,
    frequency: (values.frequency as KpiFrequency) || existing.frequency,
    unit: (values.unit as KpiUnit) || existing.unit,
    formula: values.formula || existing.formula,
    direction,
    target,
    warningThreshold,
    criticalThreshold,
    currentValue,
    status,
    dataSource: (values.dataSource as KpiDataSource) || existing.dataSource,
    periodStart: values.periodStart || existing.periodStart,
    periodEnd: values.periodEnd || existing.periodEnd,
    lastUpdated:
      values.lastUpdated || new Date().toISOString().slice(0, 10),
    notes: values.notes ?? existing.notes,
  };
}

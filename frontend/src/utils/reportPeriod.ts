import type { PeriodPreset, ReportPeriod } from "../mocks/types/reports";

function formatLabel(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildPeriodFromPreset(preset: PeriodPreset): ReportPeriod {
  const end = new Date("2026-07-14T12:00:00");
  const start = new Date(end);

  switch (preset) {
    case "Last 7 Days":
      start.setDate(end.getDate() - 6);
      break;
    case "Last 30 Days":
      start.setDate(end.getDate() - 29);
      break;
    case "Last Quarter":
      start.setMonth(end.getMonth() - 3);
      break;
    case "Last 6 Months":
      start.setMonth(end.getMonth() - 6);
      break;
    case "Current Year":
      start.setMonth(0, 1);
      break;
    case "Custom Range":
    default:
      start.setDate(1);
      break;
  }

  const startDate = toIso(start);
  const endDate = toIso(end);
  return {
    preset,
    startDate,
    endDate,
    label: formatLabel(startDate, endDate),
  };
}

export function formatReportPeriodLabel(start: string, end: string): string {
  return formatLabel(start, end);
}

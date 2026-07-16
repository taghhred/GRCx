import type { PeriodPreset, ReportPeriod } from "../../mocks/types/reports";
import {
  buildPeriodFromPreset,
  formatReportPeriodLabel,
} from "../../utils/reportPeriod";
import styles from "./WizardShared.module.css";

interface ReportingPeriodSelectorProps {
  value: ReportPeriod;
  onChange: (value: ReportPeriod) => void;
}

export default function ReportingPeriodSelector({
  value,
  onChange,
}: ReportingPeriodSelectorProps) {
  const presets: PeriodPreset[] = [
    "Last 7 Days",
    "Last 30 Days",
    "Last Quarter",
    "Last 6 Months",
    "Current Year",
    "Custom Range",
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.chipRow} role="group" aria-label="Period presets">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`${styles.chip} ${value.preset === preset ? styles.chipActive : ""}`}
            onClick={() => onChange(buildPeriodFromPreset(preset))}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Start Date</span>
          <input
            type="date"
            value={value.startDate}
            onChange={(event) => {
              const startDate = event.target.value;
              onChange({
                preset: "Custom Range",
                startDate,
                endDate: value.endDate,
                label: formatReportPeriodLabel(startDate, value.endDate),
              });
            }}
          />
        </label>
        <label className={styles.field}>
          <span>End Date</span>
          <input
            type="date"
            value={value.endDate}
            onChange={(event) => {
              const endDate = event.target.value;
              onChange({
                preset: "Custom Range",
                startDate: value.startDate,
                endDate,
                label: formatReportPeriodLabel(value.startDate, endDate),
              });
            }}
          />
        </label>
      </div>

      <p className={styles.periodLabel}>
        Reporting Period: <strong>{value.label}</strong>
      </p>
    </div>
  );
}

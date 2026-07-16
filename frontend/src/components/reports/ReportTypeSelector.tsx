import type { ReportCategory } from "../../mocks/types/reports";
import styles from "./WizardShared.module.css";

interface ReportTypeSelectorProps {
  value: ReportCategory | null;
  onChange: (value: ReportCategory) => void;
}

export default function ReportTypeSelector({
  value,
  onChange,
}: ReportTypeSelectorProps) {
  return (
    <div className={styles.stack}>
      <p className={styles.periodLabel}>
        Choose the report audience. Contents and tone change based on this
        selection.
      </p>
      <div
        className={styles.choiceGrid}
        role="radiogroup"
        aria-label="Report type"
      >
        {(
          [
            {
              id: "Executive" as const,
              title: "Executive Report",
              copy: "A concise report for executives, management, regulators, and decision-makers.",
            },
            {
              id: "Detailed" as const,
              title: "Detailed Report",
              copy: "A comprehensive report for auditors, compliance teams, risk teams, and technical stakeholders.",
            },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={`${styles.choiceCard} ${value === option.id ? styles.choiceActive : ""}`}
            onClick={() => onChange(option.id)}
          >
            <strong>{option.title}</strong>
            <span>{option.copy}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import styles from "../bcm/BcmRiskGauge.module.css";

interface DrPercentGaugeProps {
  label: string;
  value: number;
  tone?: "warning" | "success" | "info";
}

/** Semi-circle percent gauge (0–100) for DR readiness scores. */
export default function DrPercentGauge({
  label,
  value,
  tone = "info",
}: DrPercentGaugeProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = 42;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`${styles.gauge} ${styles[tone]}`}>
      <svg viewBox="0 0 120 70" className={styles.svg} aria-hidden>
        <path
          className={styles.track}
          d="M18 60 A42 42 0 0 1 102 60"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          className={styles.fill}
          d="M18 60 A42 42 0 0 1 102 60"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.valueBlock}>
        <span className={styles.value}>{Math.round(clamped)}%</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}

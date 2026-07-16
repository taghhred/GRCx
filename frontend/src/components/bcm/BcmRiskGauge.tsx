import styles from "./BcmRiskGauge.module.css";

interface BcmRiskGaugeProps {
  label: string;
  value: number;
  max?: number;
  tone?: "warning" | "success" | "info";
}

export default function BcmRiskGauge({
  label,
  value,
  max = 5,
  tone = "info",
}: BcmRiskGaugeProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = (clamped / max) * 100;
  // Semi-circle: circumference of half circle with r=42 → π*42
  const radius = 42;
  const circumference = Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

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
        <span className={styles.value}>{value.toFixed(1)}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}

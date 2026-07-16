import styles from "./DrCircularProgress.module.css";

interface DrCircularProgressProps {
  percent: number;
  label?: string;
  size?: number;
}

export default function DrCircularProgress({
  percent,
  label = "Overall Recovery Progress",
  size = 176,
}: DrCircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 160 160"
        className={styles.svg}
        role="img"
        aria-label={`${label} ${clamped}%`}
      >
        <circle
          className={styles.track}
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="12"
        />
        <circle
          className={styles.fill}
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.value}>{clamped}%</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}

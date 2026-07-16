import styles from "./MetricCard.module.css";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "success" | "info";
  icon?: React.ReactNode;
}

export default function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: MetricCardProps) {
  return (
    <article className={`${styles.card} ${styles[tone]}`} aria-label={label}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
      </div>
      <p className={styles.value}>{value}</p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </article>
  );
}

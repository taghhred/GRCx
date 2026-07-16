import type { Severity } from "../../mocks/types/dashboard";
import styles from "./SeverityBadge.module.css";

interface SeverityBadgeProps {
  severity: Severity;
}

const CLASS_MAP: Record<Severity, string> = {
  Critical: styles.critical,
  High: styles.high,
  Medium: styles.medium,
  Low: styles.low,
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`${styles.badge} ${CLASS_MAP[severity]}`}>
      <span className={styles.mark} aria-hidden>
        {severity.charAt(0)}
      </span>
      {severity}
    </span>
  );
}

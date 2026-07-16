import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { BcmKpi } from "../../mocks/types/bcm";
import styles from "./BcmKpiCard.module.css";

interface BcmKpiCardProps {
  kpi: BcmKpi;
  icon: React.ReactNode;
}

export default function BcmKpiCard({ kpi, icon }: BcmKpiCardProps) {
  const TrendIcon =
    kpi.trendDirection === "up"
      ? TrendingUp
      : kpi.trendDirection === "down"
        ? TrendingDown
        : Minus;

  return (
    <article
      className={`${styles.card} ${styles[kpi.tone]}`}
      aria-label={`${kpi.label}: ${kpi.value}`}
    >
      <div className={styles.top}>
        <div className={styles.labelRow}>
          <span className={styles.label}>{kpi.label}</span>
          <span className={styles.badge} data-tone={kpi.tone}>
            {kpi.badge}
          </span>
        </div>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      </div>
      <p className={styles.value}>{kpi.value}</p>
      <div className={styles.trend} data-direction={kpi.trendDirection}>
        <TrendIcon size={14} aria-hidden />
        <span>{kpi.trend}</span>
      </div>
      <p className={styles.hint}>{kpi.description}</p>
    </article>
  );
}

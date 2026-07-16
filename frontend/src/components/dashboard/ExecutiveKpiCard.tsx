import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Scale,
  ServerCrash,
  ShieldAlert,
} from "lucide-react";
import type { ExecutiveKpi } from "../../mocks/types/executiveKpi";
import type { DashboardTimeRange } from "../../mocks/types/executiveKpi";
import { isSafeInternalPath } from "../../utils/security";
import styles from "./ExecutiveKpiCard.module.css";

const ICONS: Record<string, LucideIcon> = {
  "compliance-score": Scale,
  "open-grc-cases": Briefcase,
  "critical-risks": AlertTriangle,
  "active-violations": ShieldAlert,
  "bcm-readiness": Building2,
  "dr-readiness": ServerCrash,
};

interface ExecutiveKpiCardProps {
  kpi: ExecutiveKpi;
  timeRange: DashboardTimeRange;
}

export default function ExecutiveKpiCard({
  kpi,
  timeRange,
}: ExecutiveKpiCardProps) {
  const navigate = useNavigate();
  const Icon = ICONS[kpi.id] ?? Scale;

  const onActivate = () => {
    if (!isSafeInternalPath(kpi.href)) return;
    const params = new URLSearchParams({
      range: timeRange.preset,
      from: "dashboard",
    });
    if (timeRange.preset === "custom") {
      params.set("start", timeRange.startIso);
      params.set("end", timeRange.endIso);
    }
    navigate({
      pathname: kpi.href,
      search: `?${params.toString()}`,
    });
  };

  return (
    <button
      type="button"
      className={`${styles.card} ${styles[`status${kpi.status}`]}`}
      onClick={onActivate}
      aria-label={`${kpi.title}: ${kpi.value}. ${kpi.status}. ${kpi.trendLabel}. Open related module.`}
    >
      <div className={styles.top}>
        <span className={styles.title}>{kpi.title}</span>
        <span className={styles.iconWrap} aria-hidden>
          <Icon size={15} />
        </span>
      </div>

      <p className={styles.value}>{kpi.value}</p>

      <div className={styles.footer}>
        <span
          className={`${styles.trend} ${
            kpi.trendDirection === "up"
              ? styles.trendUp
              : kpi.trendDirection === "down"
                ? styles.trendDown
                : styles.trendFlat
          }`}
        >
          {kpi.trendLabel}
        </span>
        <span className={`${styles.badge} ${styles[`badge${kpi.status}`]}`}>
          {kpi.status}
        </span>
      </div>
    </button>
  );
}

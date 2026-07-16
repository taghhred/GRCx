import type { ExecutiveKpi } from "../../mocks/types/executiveKpi";
import type { DashboardTimeRange } from "../../mocks/types/executiveKpi";
import ExecutiveKpiCard from "./ExecutiveKpiCard";
import styles from "./ExecutiveKpiRow.module.css";

interface ExecutiveKpiRowProps {
  kpis: ExecutiveKpi[];
  timeRange: DashboardTimeRange;
}

export default function ExecutiveKpiRow({
  kpis,
  timeRange,
}: ExecutiveKpiRowProps) {
  return (
    <div className={styles.grid} role="list" aria-label="Executive KPIs">
      {kpis.map((kpi) => (
        <div key={kpi.id} role="listitem">
          <ExecutiveKpiCard kpi={kpi} timeRange={timeRange} />
        </div>
      ))}
    </div>
  );
}

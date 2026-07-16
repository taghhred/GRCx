import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useRiskModule } from "../../../services/risk/RiskModuleContext";
import type { EnrichedRisk } from "../../../services/risk/RiskModuleContext";
import EmptyState from "../../ui/EmptyState";
import {
  CHART_PALETTE,
  average,
  formatDate,
  groupCount,
  hasTreatmentSet,
  isMitigatedClosed,
  isOverdue,
  levelOf,
  scoreOf,
  topEntries,
} from "./riskSectionUtils";
import styles from "../../../pages/Risk/RiskAssessment.module.css";

interface KpiCardDef {
  label: string;
  value: string;
  hint?: string;
  tone?: "toneCritical" | "toneHigh" | "toneWarn" | "toneOk";
}

function KpiCard({ label, value, hint, tone }: KpiCardDef) {
  return (
    <div className={`${styles.kpiCard} ${tone ? styles[tone] : ""}`}>
      <div>
        <span className={styles.kpiLabel}>{label}</span>
        <div className={styles.kpiValue}>{value}</div>
      </div>
      {hint ? <span className={styles.kpiHint}>{hint}</span> : null}
    </div>
  );
}

function RiskListPanel({
  title,
  sub,
  risks,
  onSelect,
  emptyLabel,
  metaFor,
}: {
  title: string;
  sub?: string;
  risks: EnrichedRisk[];
  onSelect: (riskId: string) => void;
  emptyLabel: string;
  metaFor: (risk: EnrichedRisk) => string;
}) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {sub ? <p className={styles.panelSub}>{sub}</p> : null}
      {risks.length === 0 ? (
        <p className={styles.sidePanelEmpty}>{emptyLabel}</p>
      ) : (
        <ul className={styles.list}>
          {risks.map((risk) => (
            <li
              key={risk.riskId}
              className={styles.listItem}
              onClick={() => onSelect(risk.riskId)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect(risk.riskId);
              }}
            >
              <div className={styles.listMain}>
                <div className={styles.listTitle}>
                  {risk.riskId} · {risk.title}
                </div>
                <div className={styles.listMeta}>{metaFor(risk)}</div>
              </div>
              <span className={styles.chip}>{levelOf(risk)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CountListPanel({ title, entries }: { title: string; entries: { name: string; count: number }[] }) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {entries.length === 0 ? (
        <p className={styles.sidePanelEmpty}>No data available yet.</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.name} className={styles.listItem}>
              <div className={styles.listMain}>
                <div className={styles.listTitle}>{entry.name}</div>
              </div>
              <span className={styles.chip}>{entry.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RiskOverviewSection() {
  const navigate = useNavigate();
  const { risks, setSelectedRiskId } = useRiskModule();

  const metrics = useMemo(() => {
    const total = risks.length;
    const critical = risks.filter((r) => levelOf(r) === "Critical").length;
    const high = risks.filter((r) => levelOf(r) === "High").length;
    const open = risks.filter((r) => r.status === "Open").length;
    const accepted = risks.filter((r) => r.status === "Accepted").length;
    const mitigated = risks.filter(isMitigatedClosed).length;
    const residualCriticalHigh = risks.filter(
      (r) => r.residualLevel === "Critical" || r.residualLevel === "High"
    ).length;
    const overdueReviews = risks.filter(isOverdue).length;
    const scored = risks.map(scoreOf).filter((v): v is number => v != null);
    const avgScore = average(scored);
    const treatmentProgress =
      total === 0 ? 0 : (risks.filter(hasTreatmentSet).length / total) * 100;

    return {
      total,
      critical,
      high,
      open,
      accepted,
      mitigated,
      residualCriticalHigh,
      overdueReviews,
      avgScore,
      treatmentProgress,
    };
  }, [risks]);

  const byBusinessUnit = useMemo(
    () => topEntries(groupCount(risks, (r) => r.businessUnit || "Unspecified"), 8),
    [risks]
  );
  const byCategory = useMemo(
    () => topEntries(groupCount(risks, (r) => r.category || "Unspecified"), 6),
    [risks]
  );
  const topAssets = useMemo(
    () => topEntries(groupCount(risks, (r) => r.affectedAsset || "Unspecified"), 6),
    [risks]
  );
  const topFrameworks = useMemo(
    () => topEntries(groupCount(risks, (r) => r.framework || "Unmapped"), 6),
    [risks]
  );
  const topDepartments = useMemo(
    () => topEntries(groupCount(risks, (r) => r.department || "Unspecified"), 6),
    [risks]
  );

  const latestAssessments = useMemo(
    () =>
      [...risks]
        .sort((a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || ""))
        .slice(0, 6),
    [risks]
  );

  const upcomingReviews = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...risks]
      .filter((r) => r.nextReviewDate && r.nextReviewDate >= today)
      .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
      .slice(0, 6);
  }, [risks]);

  function goToRisk(riskId: string) {
    setSelectedRiskId(riskId);
    navigate("/risk/register");
  }

  if (risks.length === 0) {
    return (
      <EmptyState
        title="No risk data loaded yet"
        description="Import a risk register workbook or refresh from the seeded data to populate the risk overview."
      />
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Portfolio KPIs</h3>
        <p className={styles.panelSub}>
          Live figures computed from the current risk register — no static placeholders.
        </p>
        <div className={styles.kpiGrid}>
          <KpiCard label="Total Risks" value={String(metrics.total)} />
          <KpiCard label="Critical" value={String(metrics.critical)} tone="toneCritical" />
          <KpiCard label="High" value={String(metrics.high)} tone="toneHigh" />
          <KpiCard label="Open" value={String(metrics.open)} tone="toneWarn" />
          <KpiCard label="Accepted" value={String(metrics.accepted)} />
          <KpiCard label="Mitigated" value={String(metrics.mitigated)} tone="toneOk" hint="Mitigate treatment, closed/accepted" />
          <KpiCard
            label="Residual Critical + High"
            value={String(metrics.residualCriticalHigh)}
            tone="toneCritical"
          />
          <KpiCard label="Overdue Reviews" value={String(metrics.overdueReviews)} tone="toneWarn" />
          <KpiCard label="Avg Risk Score" value={metrics.avgScore.toFixed(1)} hint="out of 25" />
          <KpiCard
            label="Treatment Progress"
            value={`${metrics.treatmentProgress.toFixed(0)}%`}
            hint="Risks with a treatment decision"
          />
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>By Business Unit</h3>
          <p className={styles.panelSub}>Risk volume across business units.</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byBusinessUnit} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>By Category</h3>
          <p className={styles.panelSub}>Distribution of risk categories.</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={byCategory}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="46%"
                outerRadius={78}
                label={false}
              >
                {byCategory.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.grid3}>
        <CountListPanel title="Top Assets" entries={topAssets} />
        <CountListPanel title="Top Frameworks" entries={topFrameworks} />
        <CountListPanel title="Top Departments" entries={topDepartments} />
      </div>

      <div className={styles.grid2}>
        <RiskListPanel
          title="Latest Assessments"
          sub="Most recently updated risk records."
          risks={latestAssessments}
          onSelect={goToRisk}
          emptyLabel="No assessments recorded yet."
          metaFor={(r) => `Updated ${formatDate(r.lastUpdated)} · ${r.owner || "Unassigned"}`}
        />
        <RiskListPanel
          title="Upcoming Reviews"
          sub="Risks with a scheduled review date ahead."
          risks={upcomingReviews}
          onSelect={goToRisk}
          emptyLabel="No upcoming reviews scheduled."
          metaFor={(r) => `Due ${formatDate(r.nextReviewDate)} · ${r.owner || "Unassigned"}`}
        />
      </div>
    </div>
  );
}

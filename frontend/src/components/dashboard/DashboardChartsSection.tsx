import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardAnalytics, HeatmapCell } from "../../mocks/services/dashboardAnalyticsService";
import styles from "../../pages/Dashboard/Dashboard.module.css";

const LEVEL_COLORS: Record<string, string> = {
  Critical: "var(--color-critical)",
  High: "var(--color-high)",
  Medium: "var(--color-medium)",
  Low: "var(--color-low)",
};

const PALETTE = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-info)",
  "var(--color-danger)",
  "var(--color-high)",
  "var(--color-low)",
  "var(--color-text-muted)",
];

const IMPACTS = [5, 4, 3, 2, 1] as const;
const LIKELIHOODS = [1, 2, 3, 4, 5] as const;
const CHART_H = 180;

function tooltipStyle() {
  return {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  };
}

function heatTone(count: number, max: number): string {
  if (count <= 0) return "color-mix(in srgb, var(--color-surface-elevated) 80%, transparent)";
  const intensity = Math.min(1, count / Math.max(1, max));
  if (intensity > 0.75) return "#fca5a5";
  if (intensity > 0.5) return "#fdba74";
  if (intensity > 0.25) return "#fde68a";
  return "#bbf7d0";
}

function HeatmapWidget({ cells }: { cells: HeatmapCell[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const lookup = new Map(cells.map((c) => [`${c.likelihood}-${c.impact}`, c.count]));

  return (
    <div className={styles.miniHeatmap} role="img" aria-label="Residual risk heat map">
      <div className={styles.miniHeatmapGrid}>
        <div className={styles.miniHeatmapCorner} />
        {LIKELIHOODS.map((l) => (
          <div key={`h-${l}`} className={styles.miniHeatmapAxis}>
            L{l}
          </div>
        ))}
        {IMPACTS.map((impact) => (
          <div key={`row-${impact}`} className={styles.miniHeatmapRow}>
            <div className={styles.miniHeatmapAxis}>I{impact}</div>
            {LIKELIHOODS.map((likelihood) => {
              const count = lookup.get(`${likelihood}-${impact}`) ?? 0;
              return (
                <div
                  key={`${likelihood}-${impact}`}
                  className={styles.miniHeatmapCell}
                  style={{ background: heatTone(count, max) }}
                  title={`L${likelihood} × I${impact}: ${count}`}
                >
                  {count || ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <Link to="/risk/heatmaps" className={styles.viewAll}>
        Full heat map
      </Link>
    </div>
  );
}

interface Props {
  analytics: DashboardAnalytics;
}

export default function DashboardChartsSection({ analytics }: Props) {
  return (
    <section className={styles.section} aria-label="Executive charts">
      <div className={styles.chartsGrid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Risk by Level</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={analytics.byLevel}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {analytics.byLevel.map((entry) => (
                    <Cell key={entry.name} fill={LEVEL_COLORS[entry.name] ?? "var(--color-primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Risk by Department</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={analytics.byDepartment} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                />
                <Tooltip contentStyle={tooltipStyle()} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Framework Coverage</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={analytics.byFramework}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {analytics.byFramework.map((entry, index) => (
                    <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Risk Trend</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <LineChart data={analytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend />
                <Line type="monotone" dataKey="count" name="Identified" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="open" name="Open" stroke="var(--color-warning)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Treatment Status</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <PieChart>
                <Tooltip contentStyle={tooltipStyle()} />
                <Pie data={analytics.byTreatment} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>
                  {analytics.byTreatment.map((entry, index) => (
                    <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Compliance Trend</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <LineChart data={analytics.complianceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Line type="monotone" dataKey="count" name="Score %" stroke="var(--color-success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Residual Risk</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={analytics.residualDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Bar dataKey="value" fill="var(--color-high)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Open vs Closed</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <PieChart>
                <Tooltip contentStyle={tooltipStyle()} />
                <Pie data={analytics.openVsClosed} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70}>
                  <Cell fill="var(--color-danger)" />
                  <Cell fill="var(--color-success)" />
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${styles.card} ${styles.heatmapCard}`}>
          <h3 className={styles.cardTitle}>Heat Map</h3>
          <HeatmapWidget cells={analytics.heatmap} />
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Business Units</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={analytics.byBusinessUnit}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} interval={0} angle={-18} textAnchor="end" height={48} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Bar dataKey="value" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

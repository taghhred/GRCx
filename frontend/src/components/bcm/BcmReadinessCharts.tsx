import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CriticalBusinessProcess } from "../../mocks/types/bcm";
import styles from "./BcmReadinessCharts.module.css";

const PALETTE = [
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#38bdf8",
  "#ef4444",
  "#a78bfa",
  "#14b8a6",
  "#94a3b8",
];

function countBy(
  rows: CriticalBusinessProcess[],
  keyFn: (row: CriticalBusinessProcess) => string
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row) || "Unassigned";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function readinessScore(row: CriticalBusinessProcess): number {
  let score = 40;
  if (row.status === "Ready") score += 35;
  else if (row.status === "Testing") score += 20;
  else if (row.status === "Review") score += 10;
  else if (row.status === "At Risk") score -= 10;
  const done = row.checklist.filter((c) => c.done).length;
  const total = Math.max(1, row.checklist.length);
  score += Math.round((done / total) * 25);
  return Math.max(0, Math.min(100, score));
}

interface BcmReadinessChartsProps {
  rows: CriticalBusinessProcess[];
}

export default function BcmReadinessCharts({ rows }: BcmReadinessChartsProps) {
  const byDepartment = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const row of rows) {
      const list = groups.get(row.department) ?? [];
      list.push(readinessScore(row));
      groups.set(row.department, list);
    }
    return [...groups.entries()]
      .map(([name, scores]) => ({
        name,
        value: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const criticalByBu = useMemo(
    () =>
      countBy(
        rows.filter((r) => r.criticality === "Critical" || r.criticality === "High"),
        (r) => r.businessUnit
      ),
    [rows]
  );

  const rtoDist = useMemo(() => countBy(rows, (r) => r.rto || "Unset"), [rows]);
  const rpoDist = useMemo(() => countBy(rows, (r) => r.rpo || "Unset"), [rows]);
  const strategyDist = useMemo(
    () => countBy(rows, (r) => r.recoveryStrategy || "Unset"),
    [rows]
  );
  const impactByDept = useMemo(() => {
    const weights: Record<string, number> = {
      Severe: 4,
      Major: 3,
      Moderate: 2,
      Minor: 1,
    };
    const groups = new Map<string, number>();
    for (const row of rows) {
      groups.set(
        row.department,
        (groups.get(row.department) ?? 0) + (weights[row.businessImpact] ?? 1)
      );
    }
    return [...groups.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const tooltipStyle = {
    background: "var(--color-surface-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-text-primary)",
    fontSize: 12,
  };

  return (
    <div className={styles.grid}>
      <article className={styles.card}>
        <h3>Readiness by Department</h3>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDepartment} layout="vertical" margin={{ left: 8, right: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Readiness %" radius={[0, 6, 6, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={styles.card}>
        <h3>Critical Processes by Business Unit</h3>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={criticalByBu} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Critical / High" radius={[6, 6, 0, 0]} fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={styles.card}>
        <h3>RTO Distribution</h3>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rtoDist} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {rtoDist.map((entry, index) => (
                  <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={styles.card}>
        <h3>RPO Distribution</h3>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rpoDist} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {rpoDist.map((entry, index) => (
                  <Cell key={entry.name} fill={PALETTE[(index + 2) % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={styles.card}>
        <h3>Recovery Strategy Distribution</h3>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strategyDist} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Processes" radius={[6, 6, 0, 0]}>
                {strategyDist.map((entry, index) => (
                  <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={styles.card}>
        <h3>Business Impact by Department</h3>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={impactByDept} layout="vertical" margin={{ left: 8, right: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={96} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Impact weight" radius={[0, 6, 6, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}

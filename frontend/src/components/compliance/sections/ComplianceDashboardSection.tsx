// @ts-nocheck
import { useMemo } from "react";
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
import { useNavigate } from "react-router-dom";
import { useComplianceModule } from "../../../services/compliance/ComplianceModuleContext";
import EmptyState from "../../ui/EmptyState";
import {
  CHART_PALETTE,
  formatDate,
  isOverdueReview,
  topEntries,
} from "./complianceSectionUtils";
import styles from "../Compliance.module.css";

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

function monthKey(isoDate: string): string | null {
  if (!isoDate || isoDate.length < 7) return null;
  return isoDate.slice(0, 7);
}

export default function ComplianceDashboardSection() {
  const navigate = useNavigate();
  const {
    register,
    assessments,
    evidence,
    findings,
    stats,
    setSelection,
  } = useComplianceModule();

  const byStatusChart = useMemo(
    () => topEntries(stats.byStatus, 8),
    [stats.byStatus]
  );
  const byFrameworkChart = useMemo(
    () => topEntries(stats.byFramework, 8),
    [stats.byFramework]
  );
  const byDepartmentChart = useMemo(
    () => topEntries(stats.byDepartment, 8),
    [stats.byDepartment]
  );
  const byBusinessUnitChart = useMemo(
    () => topEntries(stats.byBusinessUnit, 8),
    [stats.byBusinessUnit]
  );
  const byRiskLevelChart = useMemo(
    () => topEntries(stats.byRiskLevel, 8),
    [stats.byRiskLevel]
  );

  const complianceTrend = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();

    for (const r of register) {
      const key = monthKey(r.lastAssessment);
      if (!key || r.complianceScore == null) continue;
      const cur = buckets.get(key) || { sum: 0, count: 0 };
      cur.sum += r.complianceScore;
      cur.count += 1;
      buckets.set(key, cur);
    }

    for (const a of assessments) {
      const key = monthKey(a.assessmentDate);
      if (!key || a.compliancePercent == null) continue;
      const cur = buckets.get(key) || { sum: 0, count: 0 };
      cur.sum += a.compliancePercent;
      cur.count += 1;
      buckets.set(key, cur);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sum, count }]) => ({
        month,
        compliance: Math.round(sum / count),
      }));
  }, [register, assessments]);

  const failedControls = useMemo(
    () =>
      register
        .filter((r) => {
          const s = r.status.toLowerCase();
          return s.includes("non-compliant") || s.includes("partial");
        })
        .slice(0, 8),
    [register]
  );

  const recentFindings = useMemo(() => findings.slice(0, 8), [findings]);

  const upcomingReviews = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...register]
      .filter((r) => r.nextReview && r.nextReview >= today)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
      .slice(0, 8);
  }, [register]);

  const latestEvidence = useMemo(
    () =>
      [...evidence]
        .sort((a, b) => (b.uploadDate || "").localeCompare(a.uploadDate || ""))
        .slice(0, 8),
    [evidence]
  );

  const overdueCount = useMemo(
    () => register.filter((r) => isOverdueReview(r.nextReview)).length,
    [register]
  );

  if (register.length === 0 && assessments.length === 0 && evidence.length === 0) {
    return (
      <EmptyState
        title="No compliance data loaded yet"
        description="Import Compliance Register, Assessment, or Evidence workbooks, or refresh seeded Excel files."
      />
    );
  }

  function openRegister(id: string) {
    setSelection(id, "register");
    navigate("/compliance/register");
  }

  function openFinding(id: string) {
    setSelection(id, "finding");
    navigate("/compliance/findings");
  }

  function openEvidence(id: string) {
    setSelection(id, "evidence");
    navigate("/compliance/evidence");
  }

  const tooltipStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Compliance KPIs</h3>
        <p className={styles.panelSub}>
          Live portfolio metrics derived from Excel register, assessment, and evidence records.
        </p>
        <div className={styles.kpiGrid}>
          <KpiCard
            label="Overall Compliance %"
            value={`${stats.overallCompliancePercent}%`}
            tone="toneOk"
          />
          <KpiCard label="Passed Controls" value={String(stats.passedControls)} tone="toneOk" />
          <KpiCard
            label="Failed Controls"
            value={String(stats.failedControls)}
            tone="toneCritical"
          />
          <KpiCard label="Open Findings" value={String(stats.openFindings)} tone="toneWarn" />
          <KpiCard
            label="Overdue Reviews"
            value={String(stats.overdueReviews || overdueCount)}
            tone="toneHigh"
          />
          <KpiCard
            label="Evidence Coverage %"
            value={`${stats.evidenceCoveragePercent}%`}
            hint={`${evidence.length} evidence records`}
          />
        </div>
      </div>

      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Compliance Trend</h3>
        <p className={styles.panelSub}>
          Average compliance score by month from last assessments and assessment dates.
        </p>
        {complianceTrend.length === 0 ? (
          <p className={styles.sidePanelEmpty}>No dated assessment data available for trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={complianceTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="compliance"
                name="Compliance %"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>By Framework</h3>
          <p className={styles.panelSub}>Control volume across frameworks.</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byFrameworkChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>By Status</h3>
          <p className={styles.panelSub}>Compliance register status mix.</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={byStatusChart}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="46%"
                outerRadius={78}
                label={false}
              >
                {byStatusChart.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>By Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDepartmentChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Compliance by Business Unit</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byBusinessUnitChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Compliance by Risk Level</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byRiskLevelChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Portfolio volume</h3>
        <p className={styles.panelSub}>Secondary counts for register depth.</p>
        <div className={styles.kpiGrid}>
          <KpiCard label="Register Controls" value={String(register.length)} />
          <KpiCard label="Assessments" value={String(assessments.length)} />
          <KpiCard label="Evidence Items" value={String(evidence.length)} />
          <KpiCard
            label="Business Units"
            value={String(Object.keys(stats.byBusinessUnit).length)}
          />
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Failed / Partial Controls</h3>
          <p className={styles.panelSub}>Controls requiring remediation attention.</p>
          {failedControls.length === 0 ? (
            <p className={styles.sidePanelEmpty}>No failed controls in the current portfolio.</p>
          ) : (
            <ul className={styles.list}>
              {failedControls.map((r) => (
                <li
                  key={r.complianceId}
                  className={styles.listItem}
                  onClick={() => openRegister(r.complianceId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openRegister(r.complianceId);
                  }}
                >
                  <div className={styles.listMain}>
                    <div className={styles.listTitle}>
                      {r.complianceId} آ· {r.controlName || r.controlId}
                    </div>
                    <div className={styles.listMeta}>
                      {r.framework} آ· {r.department || "â€”"} آ· Score {r.complianceScore ?? "â€”"}%
                    </div>
                  </div>
                  <span className={styles.chip}>{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Recent Findings</h3>
          <p className={styles.panelSub}>Derived from register gaps and assessment failures.</p>
          {recentFindings.length === 0 ? (
            <p className={styles.sidePanelEmpty}>No findings derived yet.</p>
          ) : (
            <ul className={styles.list}>
              {recentFindings.map((f) => (
                <li
                  key={f.findingId}
                  className={styles.listItem}
                  onClick={() => openFinding(f.findingId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openFinding(f.findingId);
                  }}
                >
                  <div className={styles.listMain}>
                    <div className={styles.listTitle}>
                      {f.findingId} آ· {f.controlName || f.controlId}
                    </div>
                    <div className={styles.listMeta}>
                      {f.framework} آ· {f.department || "â€”"}
                    </div>
                  </div>
                  <span className={styles.chip}>{f.severity || "Medium"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Upcoming Reviews</h3>
          {upcomingReviews.length === 0 ? (
            <p className={styles.sidePanelEmpty}>No upcoming reviews scheduled.</p>
          ) : (
            <ul className={styles.list}>
              {upcomingReviews.map((r) => (
                <li
                  key={`rev-${r.complianceId}`}
                  className={styles.listItem}
                  onClick={() => openRegister(r.complianceId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openRegister(r.complianceId);
                  }}
                >
                  <div className={styles.listMain}>
                    <div className={styles.listTitle}>
                      {r.complianceId} آ· {r.controlName || r.controlId}
                    </div>
                    <div className={styles.listMeta}>
                      Due {formatDate(r.nextReview)} آ· {r.owner || "Unassigned"}
                    </div>
                  </div>
                  <span className={styles.chip}>{r.priority || r.riskLevel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Latest Evidence</h3>
          {latestEvidence.length === 0 ? (
            <p className={styles.sidePanelEmpty}>No evidence uploaded yet.</p>
          ) : (
            <ul className={styles.list}>
              {latestEvidence.map((e) => (
                <li
                  key={e.evidenceId}
                  className={styles.listItem}
                  onClick={() => openEvidence(e.evidenceId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") openEvidence(e.evidenceId);
                  }}
                >
                  <div className={styles.listMain}>
                    <div className={styles.listTitle}>
                      {e.evidenceName || e.fileName || e.evidenceId}
                    </div>
                    <div className={styles.listMeta}>
                      {formatDate(e.uploadDate)} آ· {e.uploadedBy || "â€”"} آ· {e.framework || "â€”"}
                    </div>
                  </div>
                  <span className={styles.chip}>{e.reviewStatus || "Pending"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


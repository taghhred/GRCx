import { Link } from "react-router-dom";
import SeverityBadge from "../ui/SeverityBadge";
import type { DashboardAnalytics, RiskInsightRow } from "../../mocks/services/dashboardAnalyticsService";
import type { Severity } from "../../mocks/types/dashboard";
import styles from "../../pages/Dashboard/Dashboard.module.css";

function asSeverity(level: string): Severity {
  if (level === "Critical" || level === "High" || level === "Medium" || level === "Low") {
    return level;
  }
  return "Medium";
}

function RiskList({
  title,
  rows,
  empty,
  meta,
}: {
  title: string;
  rows: RiskInsightRow[];
  empty: string;
  meta: (row: RiskInsightRow) => string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <Link to="/risk/register" className={styles.viewAll}>
          View register
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className={styles.emptyHint}>{empty}</p>
      ) : (
        <ul className={styles.insightList}>
          {rows.map((row) => (
            <li key={row.riskId}>
              <div className={styles.insightMain}>
                <strong>
                  {row.riskId} · {row.title}
                </strong>
                <span>{meta(row)}</span>
              </div>
              <SeverityBadge severity={asSeverity(row.level)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CountList({
  title,
  entries,
}: {
  title: string;
  entries: { name: string; value: number }[];
}) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      {entries.length === 0 ? (
        <p className={styles.emptyHint}>No data available.</p>
      ) : (
        <ul className={styles.countList}>
          {entries.map((entry) => (
            <li key={entry.name}>
              <span>{entry.name}</span>
              <strong>{entry.value}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardInsightsSection({
  analytics,
}: {
  analytics: DashboardAnalytics;
}) {
  return (
    <section className={styles.section} aria-labelledby="dashboard-insights-heading">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="dashboard-insights-heading" className={styles.sectionTitle}>
            Attention & Overview
          </h2>
          <p className={styles.sectionDesc}>
            Critical exposure, recent movement, upcoming reviews, and where risk concentrates.
          </p>
        </div>
      </div>

      <div className={styles.insightsGrid}>
        <RiskList
          title="Top 10 Critical Risks"
          rows={analytics.topCritical}
          empty="No critical or high risks in scope."
          meta={(row) => `${row.owner} · Score ${row.residualScore ?? "—"}`}
        />
        <RiskList
          title="Recently Updated Risks"
          rows={analytics.recentlyUpdated}
          empty="No recent updates."
          meta={(row) => `Updated ${row.lastUpdated || "—"} · ${row.status}`}
        />
        <RiskList
          title="Upcoming Reviews"
          rows={analytics.upcomingReviews}
          empty="No upcoming reviews scheduled."
          meta={(row) => `Review ${row.nextReviewDate} · ${row.owner}`}
        />
        <CountList title="High Risk Business Units" entries={analytics.highRiskBusinessUnits} />
        <CountList title="Most Common Categories" entries={analytics.mostCommonCategories} />
      </div>
    </section>
  );
}

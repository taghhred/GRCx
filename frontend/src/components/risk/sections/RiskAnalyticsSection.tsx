import { useMemo, useState } from "react";
import { Bot, FileSpreadsheet, Sparkles } from "lucide-react";
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
import { useRiskModule } from "../../../services/risk/RiskModuleContext";
import { RISK_LEVELS } from "../../../mocks/types/riskRegister";
import { analyzeRiskWithAi, type RiskAiRecommendation } from "../../../services/ai/riskAiService";
import Button from "../../common/Button";
import EmptyState from "../../ui/EmptyState";
import { excelFilename, exportTableToXlsx } from "../../../services/excelExportService";
import {
  CHART_PALETTE,
  LEVEL_COLOR_VAR,
  groupCount,
  levelOf,
  monthKey,
  monthLabel,
} from "./riskSectionUtils";
import styles from "../../../pages/Risk/RiskAssessment.module.css";

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }));
}

export default function RiskAnalyticsSection() {
  const { risks, selectedRisk } = useRiskModule();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<RiskAiRecommendation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const levelData = useMemo(
    () => RISK_LEVELS.map((level) => ({ name: level, value: risks.filter((r) => levelOf(r) === level).length })),
    [risks]
  );
  const statusData = useMemo(() => toChartData(groupCount(risks, (r) => r.status || "Unspecified")), [risks]);
  const treatmentData = useMemo(
    () => toChartData(groupCount(risks, (r) => r.treatment || "Unassigned")),
    [risks]
  );
  const frameworkData = useMemo(
    () => toChartData(groupCount(risks, (r) => r.framework || "Unmapped")).slice(0, 8),
    [risks]
  );
  const departmentData = useMemo(
    () => toChartData(groupCount(risks, (r) => r.department || "Unspecified")).slice(0, 8),
    [risks]
  );

  const trendData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const risk of risks) {
      const key = monthKey(risk.dateIdentified);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => ({ month: monthLabel(key), count }));
  }, [risks]);

  async function handleGenerateAdvisory() {
    setAiLoading(true);
    setAiError(null);
    try {
      const context = selectedRisk
        ? {
            riskId: selectedRisk.riskId,
            title: selectedRisk.title,
            category: selectedRisk.category,
            description: selectedRisk.description,
            framework: selectedRisk.framework,
            controls: selectedRisk.plannedControls ? [selectedRisk.plannedControls] : [],
            evidenceNames: selectedRisk.evidence.map((e) => e.filename),
            residualLevel: selectedRisk.residualLevel || selectedRisk.inherentLevel,
            treatment: selectedRisk.treatment,
          }
        : {
            title: "Portfolio Summary",
            category: "Enterprise Risk Portfolio",
            description: `${risks.length} tracked risks across ${new Set(risks.map((r) => r.businessUnit)).size} business units.`,
            residualLevel: RISK_LEVELS.find((lvl) => levelData.find((d) => d.name === lvl && d.value > 0)),
          };
      const result = await analyzeRiskWithAi(context);
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI advisory generation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleExportSummary() {
    exportTableToXlsx({
      filename: excelFilename("Risk_Analytics_Summary"),
      sheets: [
        {
          sheetName: "By Level",
          columns: [{ key: "name", header: "Level" }, { key: "value", header: "Count" }],
          rows: levelData,
        },
        {
          sheetName: "By Status",
          columns: [{ key: "name", header: "Status" }, { key: "value", header: "Count" }],
          rows: statusData,
        },
        {
          sheetName: "By Treatment",
          columns: [{ key: "name", header: "Treatment" }, { key: "value", header: "Count" }],
          rows: treatmentData,
        },
        {
          sheetName: "By Framework",
          columns: [{ key: "name", header: "Framework" }, { key: "value", header: "Count" }],
          rows: frameworkData,
        },
        {
          sheetName: "By Department",
          columns: [{ key: "name", header: "Department" }, { key: "value", header: "Count" }],
          rows: departmentData,
        },
        {
          sheetName: "Monthly Trend",
          columns: [{ key: "month", header: "Month" }, { key: "count", header: "Risks Identified" }],
          rows: trendData,
        },
      ],
    });
  }

  if (risks.length === 0) {
    return (
      <EmptyState
        title="No analytics available yet"
        description="Import or refresh the risk register to unlock executive analytics and AI advisory."
      />
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.panelHeaderRow}>
          <div>
            <h3 className={styles.panelTitle}>Executive Analytics</h3>
            <p className={styles.panelSub}>Distribution of the current risk portfolio across key dimensions.</p>
          </div>
          <Button variant="secondary" onClick={handleExportSummary}>
            <FileSpreadsheet size={15} aria-hidden />
            Export Summary Excel
          </Button>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <h4>By Risk Level</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={levelData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {levelData.map((entry) => (
                    <Cell key={entry.name} fill={LEVEL_COLOR_VAR[entry.name] ?? "var(--color-primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h4>By Status</h4>
            <ResponsiveContainer width="100%" height={200}>
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
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="46%" outerRadius={64} label={false}>
                  {statusData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h4>By Treatment</h4>
            <ResponsiveContainer width="100%" height={200}>
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
                <Pie data={treatmentData} dataKey="value" nameKey="name" cx="50%" cy="46%" outerRadius={64} label={false}>
                  {treatmentData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h4>By Framework</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={frameworkData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
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
                <Bar dataKey="value" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h4>By Department</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={departmentData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
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
                <Bar dataKey="value" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h4>Monthly Trend (by Date Identified)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.aiPanel}>
          <div className={styles.aiHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>AI Advisory (Prototype)</h3>
              <p className={styles.panelSub}>
                {selectedRisk
                  ? `Contextual advisory for ${selectedRisk.riskId} — ${selectedRisk.title}.`
                  : "No risk selected — generates a portfolio-level advisory summary."}
              </p>
            </div>
            <span className={styles.aiBadge}>
              <Bot size={13} aria-hidden />
              Local Stub
            </span>
          </div>

          <Button variant="primary" onClick={handleGenerateAdvisory} disabled={aiLoading}>
            <Sparkles size={15} aria-hidden />
            {aiLoading ? "Generating…" : "Generate AI Advisory"}
          </Button>

          {aiError ? <p className={styles.validationHint}>{aiError}</p> : null}

          {aiResult ? (
            <>
              <p className={styles.aiSummary}>{aiResult.summary}</p>
              <div className={styles.aiColumns}>
                <div className={styles.aiBlock}>
                  <h4>Treatment Recommendations</h4>
                  <ul>
                    {aiResult.treatmentRecommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.aiBlock}>
                  <h4>Control Gaps</h4>
                  <ul>
                    {aiResult.controlGaps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.aiBlock}>
                  <h4>Compliance Mapping</h4>
                  <ul>
                    {aiResult.complianceMapping.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.aiBlock}>
                  <h4>Executive Bullets</h4>
                  <ul>
                    {aiResult.executiveBullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

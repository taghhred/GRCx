import { useMemo } from "react";
import { useRiskModule } from "../../../services/risk/RiskModuleContext";
import type { EnrichedRisk } from "../../../services/risk/RiskModuleContext";
import { RISK_STATUSES, RISK_TREATMENTS } from "../../../mocks/types/riskRegister";
import EmptyState from "../../ui/EmptyState";
import SeverityBadge from "../../ui/SeverityBadge";
import { asSeverity, formatDate, levelOf } from "./riskSectionUtils";
import styles from "../../../pages/Risk/RiskAssessment.module.css";

const BUCKETS = [...RISK_TREATMENTS, "Unassigned"] as const;

function bucketOf(risk: EnrichedRisk): string {
  const treatment = risk.treatment?.trim();
  return treatment && (RISK_TREATMENTS as readonly string[]).includes(treatment) ? treatment : "Unassigned";
}

export default function RiskTreatmentSection() {
  const { risks, saveRisk } = useRiskModule();

  const groups = useMemo(() => {
    const map = new Map<string, EnrichedRisk[]>(BUCKETS.map((b) => [b, []]));
    for (const risk of risks) {
      const bucket = bucketOf(risk);
      map.get(bucket)?.push(risk);
    }
    return map;
  }, [risks]);

  const total = risks.length;

  if (total === 0) {
    return (
      <EmptyState
        title="No risks to treat yet"
        description="Import or refresh the risk register to review treatment and mitigation progress."
      />
    );
  }

  function updateTreatment(risk: EnrichedRisk, treatment: string) {
    void saveRisk({ riskId: risk.riskId, title: risk.title, treatment }, "update");
  }

  function updateStatus(risk: EnrichedRisk, status: string) {
    void saveRisk({ riskId: risk.riskId, title: risk.title, status }, "update");
  }

  return (
    <div className={styles.shell}>
      <div className={styles.treatmentGrid}>
        {BUCKETS.map((bucket) => {
          const rows = groups.get(bucket) ?? [];
          const pct = total === 0 ? 0 : (rows.length / total) * 100;
          return (
            <div key={bucket} className={styles.panel}>
              <div className={styles.treatmentHeader}>
                <div className={styles.treatmentTitleGroup}>
                  <span className={styles.treatmentName}>{bucket}</span>
                  <span className={styles.treatmentStat}>
                    {rows.length} risk{rows.length === 1 ? "" : "s"} · {pct.toFixed(0)}% of portfolio
                  </span>
                </div>
                <div className={styles.treatmentBarWrap}>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              {rows.length === 0 ? (
                <p className={styles.sidePanelEmpty}>No risks currently in this treatment bucket.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table} style={{ minWidth: 1100 }}>
                    <thead>
                      <tr>
                        <th scope="col">Risk ID</th>
                        <th scope="col">Title</th>
                        <th scope="col">Owner</th>
                        <th scope="col">Next Review</th>
                        <th scope="col">Residual Level</th>
                        <th scope="col">Planned Controls</th>
                        <th scope="col">Treatment</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((risk) => (
                        <tr key={risk.id}>
                          <td>
                            <strong className={styles.riskIdCell}>{risk.riskId}</strong>
                          </td>
                          <td>{risk.title}</td>
                          <td>{risk.owner || "Unassigned"}</td>
                          <td>{formatDate(risk.nextReviewDate)}</td>
                          <td>
                            <SeverityBadge severity={asSeverity(levelOf(risk))} />
                          </td>
                          <td style={{ maxWidth: 260, whiteSpace: "normal" }}>
                            {risk.plannedControls || "—"}
                          </td>
                          <td>
                            <select
                              className={styles.inlineSelect}
                              value={risk.treatment || ""}
                              onChange={(event) => updateTreatment(risk, event.target.value)}
                            >
                              <option value="">Unassigned</option>
                              {RISK_TREATMENTS.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className={styles.inlineSelect}
                              value={risk.status}
                              onChange={(event) => updateStatus(risk, event.target.value)}
                            >
                              {RISK_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

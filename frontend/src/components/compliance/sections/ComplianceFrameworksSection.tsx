import { useMemo, useState } from "react";
import { useComplianceModule } from "../../../services/compliance/ComplianceModuleContext";
import EmptyState from "../../ui/EmptyState";
import ComplianceRecordDrawer from "../ComplianceRecordDrawer";
import styles from "../Compliance.module.css";

export default function ComplianceFrameworksSection() {
  const { frameworks, setSelection, selectedId, selectedType } = useComplianceModule();
  const [activeId, setActiveId] = useState<string | null>(null);

  const selected = useMemo(() => {
    const id = activeId || (selectedType === "framework" ? selectedId : null);
    return frameworks.find((f) => f.id === id || f.name === id) ?? null;
  }, [frameworks, activeId, selectedId, selectedType]);

  if (frameworks.length === 0) {
    return (
      <EmptyState
        title="No frameworks available"
        description="Framework summaries appear after register, assessment, or evidence data is loaded."
      />
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.grid3}>
        {frameworks.map((fw) => (
          <button
            key={fw.id}
            type="button"
            className={styles.panel}
            style={{
              textAlign: "left",
              cursor: "pointer",
              borderColor:
                selected?.id === fw.id
                  ? "color-mix(in srgb, var(--color-primary) 45%, var(--color-border))"
                  : undefined,
            }}
            onClick={() => {
              setActiveId(fw.id);
              setSelection(fw.id, "framework");
            }}
          >
            <h3 className={styles.panelTitle}>{fw.name}</h3>
            <p className={styles.panelSub}>
              {fw.mappedControls} mapped controls · {fw.evidenceCount} evidence ·{" "}
              {fw.findingsCount} findings
            </p>
            <div className={styles.kpiValue}>{fw.compliancePercent}%</div>
            <div className={styles.kpiHint}>
              Passed {fw.passedControls} · Failed {fw.failedControls}
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>{selected.name} detail</h3>
          <p className={styles.panelSub}>
            Compliance posture {selected.compliancePercent}% across {selected.mappedControls}{" "}
            controls.
          </p>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Passed</span>
              <div className={styles.kpiValue}>{selected.passedControls}</div>
            </div>
            <div className={`${styles.kpiCard} ${styles.toneCritical}`}>
              <span className={styles.kpiLabel}>Failed</span>
              <div className={styles.kpiValue}>{selected.failedControls}</div>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Evidence</span>
              <div className={styles.kpiValue}>{selected.evidenceCount}</div>
            </div>
            <div className={`${styles.kpiCard} ${styles.toneWarn}`}>
              <span className={styles.kpiLabel}>Findings</span>
              <div className={styles.kpiValue}>{selected.findingsCount}</div>
            </div>
          </div>
          <h4 className={styles.panelTitle} style={{ marginTop: 20 }}>
            Department coverage
          </h4>
          {selected.departmentCoverage.length === 0 ? (
            <p className={styles.sidePanelEmpty}>No department mapping available.</p>
          ) : (
            <ul className={styles.list}>
              {selected.departmentCoverage.map((d) => (
                <li key={d.name} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <div className={styles.listTitle}>{d.name}</div>
                  </div>
                  <span className={styles.chip}>{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <ComplianceRecordDrawer
        open={Boolean(selectedId && selectedType === "framework")}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}

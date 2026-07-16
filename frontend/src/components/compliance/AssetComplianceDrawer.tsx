import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { ComplianceAsset } from "../../mocks/types/compliance";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import styles from "./AssetComplianceDrawer.module.css";

interface AssetComplianceDrawerProps {
  asset: ComplianceAsset | null;
  open: boolean;
  onClose: () => void;
}

function statusTone(
  status: ComplianceAsset["complianceStatus"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Compliant") return "success";
  if (status === "Partially Compliant") return "warning";
  if (status === "Under Review") return "info";
  return "danger";
}

export default function AssetComplianceDrawer({
  asset,
  open,
  onClose,
}: AssetComplianceDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !asset) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{asset.assetType}</p>
            <h2 id={titleId} className={styles.title}>
              {asset.name}
            </h2>
            <p className={styles.sub}>
              {asset.department} · {asset.operatingSystem}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close asset details"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>Asset Information</h3>
            <div className={styles.badges}>
              <StatusBadge
                label={asset.complianceStatus}
                tone={statusTone(asset.complianceStatus)}
              />
              <SeverityBadge severity={asset.riskLevel} />
            </div>
            <dl className={styles.meta}>
              <div>
                <dt>Owner</dt>
                <dd>{asset.owner}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{asset.department}</dd>
              </div>
              <div>
                <dt>Last assessment</dt>
                <dd>{asset.lastAssessment}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Installed Software</h3>
            {asset.installedSoftware.length === 0 ? (
              <p className={styles.empty}>No software inventory entries.</p>
            ) : (
              <ul className={styles.list}>
                {asset.installedSoftware.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>Security Configuration</h3>
            <ul className={styles.list}>
              {asset.securityConfiguration.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Compliance Frameworks</h3>
            <ul className={styles.list}>
              {asset.frameworks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Failed Controls</h3>
            {asset.failedControls.length === 0 ? (
              <p className={styles.empty}>No failed controls.</p>
            ) : (
              <div className={styles.controlStack}>
                {asset.failedControls.map((control) => (
                  <article key={`${control.framework}-${control.controlId}`} className={styles.controlCard}>
                    <header>
                      <strong>
                        {control.controlId} — {control.controlName}
                      </strong>
                      <StatusBadge
                        label={control.status}
                        tone={control.status === "Failed" ? "danger" : "warning"}
                      />
                    </header>
                    <p>
                      <span>Framework</span> {control.framework}
                    </p>
                    <p>
                      <span>Reason</span> {control.reason}
                    </p>
                    <p>
                      <span>Recommendation</span> {control.recommendation}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3>Detailed Findings</h3>
            {asset.findings.length === 0 ? (
              <p className={styles.empty}>No open findings.</p>
            ) : (
              <ul className={styles.list}>
                {asset.findings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>Recommended Remediation</h3>
            {asset.remediation.length === 0 ? (
              <p className={styles.empty}>No remediation required.</p>
            ) : (
              <ul className={styles.list}>
                {asset.remediation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>Historical Assessments</h3>
            <ul className={styles.list}>
              {asset.historicalAssessments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Audit History</h3>
            <ul className={styles.list}>
              {asset.auditHistory.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Related Incidents</h3>
            {asset.relatedIncidents.length === 0 ? (
              <p className={styles.empty}>No related incidents.</p>
            ) : (
              <ul className={styles.list}>
                {asset.relatedIncidents.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>AI Recommendation</h3>
            <p className={styles.ai}>{asset.aiRecommendation}</p>
          </section>
        </div>
      </aside>
    </div>
  );
}

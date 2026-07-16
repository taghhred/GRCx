import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type {
  BaselineIndicator,
  IdentityMonitoringRow,
} from "../../mocks/types/identity";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import styles from "./IdentityDrawer.module.css";

interface IdentityDrawerProps {
  identity: IdentityMonitoringRow | null;
  open: boolean;
  onClose: () => void;
}

function behaviorTone(
  status: IdentityMonitoringRow["behaviorStatus"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Normal" || status === "Baseline Matched") return "success";
  if (status === "Minor Deviation") return "warning";
  if (status === "Suspicious Activity") return "danger";
  return "danger";
}

function policyTone(
  status: IdentityMonitoringRow["policyStatus"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Compliant") return "success";
  if (status === "Policy Warning") return "warning";
  return "danger";
}

function BaselineRow({ item }: { item: BaselineIndicator }) {
  return (
    <li className={`${styles.baselineItem} ${styles[item.state]}`}>
      <span className={styles.baselineMark} aria-hidden />
      <span>{item.label}</span>
    </li>
  );
}

export default function IdentityDrawer({
  identity,
  open,
  onClose,
}: IdentityDrawerProps) {
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

  if (!open || !identity) {
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
            <p className={styles.eyebrow}>Identity</p>
            <h2 id={titleId} className={styles.title}>
              {identity.employee}
            </h2>
            <p className={styles.sub}>
              {identity.role} · {identity.department}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close identity details"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>Identity Information</h3>
            <dl className={styles.meta}>
              <div>
                <dt>Employee ID</dt>
                <dd>{identity.id.toUpperCase()}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{identity.email}</dd>
              </div>
              <div>
                <dt>Last login</dt>
                <dd>{identity.lastLogin}</dd>
              </div>
              <div>
                <dt>Current activity</dt>
                <dd>{identity.currentActivity}</dd>
              </div>
            </dl>
            <div className={styles.badges}>
              <StatusBadge
                label={identity.behaviorStatus}
                tone={behaviorTone(identity.behaviorStatus)}
              />
              <SeverityBadge severity={identity.riskLevel} />
              <StatusBadge
                label={identity.policyStatus}
                tone={policyTone(identity.policyStatus)}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3>Behavior Baseline</h3>
            <ul className={styles.baselineList}>
              {identity.baseline.map((item) => (
                <BaselineRow key={item.id} item={item} />
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Recent Activities</h3>
            <ul className={styles.list}>
              {identity.recentActivities.map((item) => (
                <li key={item.id}>
                  <strong>{item.time}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Detected Deviations</h3>
            {identity.deviations.length === 0 ? (
              <p className={styles.empty}>No deviations detected.</p>
            ) : (
              <ul className={styles.list}>
                {identity.deviations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>Policy Violations</h3>
            {identity.policyViolations.length === 0 ? (
              <p className={styles.empty}>No policy violations.</p>
            ) : (
              <ul className={styles.list}>
                {identity.policyViolations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>Access History</h3>
            <ul className={styles.list}>
              {identity.accessHistory.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Related Incidents</h3>
            {identity.relatedIncidents.length === 0 ? (
              <p className={styles.empty}>No related incidents.</p>
            ) : (
              <ul className={styles.list}>
                {identity.relatedIncidents.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>AI Recommendation</h3>
            <p className={styles.ai}>{identity.aiRecommendation}</p>
            <p className={styles.actionHint}>
              Recommended action: <strong>{identity.recommendedAction}</strong>
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

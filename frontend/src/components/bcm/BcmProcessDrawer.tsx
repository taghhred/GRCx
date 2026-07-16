import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { CriticalBusinessProcess } from "../../mocks/types/bcm";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import styles from "./BcmProcessDrawer.module.css";

interface BcmProcessDrawerProps {
  process: CriticalBusinessProcess | null;
  open: boolean;
  onClose: () => void;
}

const TABS = [
  "Overview",
  "Business Impact Analysis",
  "Recovery Objectives",
  "Recovery Plan",
  "Dependencies",
  "Recovery Team",
  "Communication Plan",
  "Evidence",
  "Attachments",
  "Test History",
  "Audit History",
  "Lessons Learned",
  "Timeline",
  "Comments",
  "Version History",
] as const;

type TabId = (typeof TABS)[number];

function statusTone(
  status: CriticalBusinessProcess["status"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Ready") return "success";
  if (status === "Testing") return "info";
  if (status === "At Risk") return "danger";
  if (status === "Review") return "warning";
  return "neutral";
}

function evidenceTone(
  status: string
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Approved") return "success";
  if (status === "Pending") return "warning";
  if (status === "Expired") return "danger";
  return "neutral";
}

function testTone(
  result: string
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (result === "Passed") return "success";
  if (result === "Partial") return "warning";
  if (result === "Failed") return "danger";
  return "neutral";
}

export default function BcmProcessDrawer({
  process,
  open,
  onClose,
}: BcmProcessDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<TabId>("Overview");

  useEffect(() => {
    if (!open) return;
    setTab("Overview");
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, process?.id]);

  const panel = useMemo(() => {
    if (!process) return null;

    switch (tab) {
      case "Overview":
        return (
          <section className={styles.section}>
            <div className={styles.badges}>
              <SeverityBadge severity={process.criticality} />
              <StatusBadge label={process.status} tone={statusTone(process.status)} />
              <SeverityBadge severity={process.riskLevel} />
            </div>
            <dl className={styles.metaGrid}>
              <div>
                <dt>Process ID</dt>
                <dd>{process.id}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{process.owner}</dd>
              </div>
              <div>
                <dt>Business Unit</dt>
                <dd>{process.businessUnit}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{process.department}</dd>
              </div>
              <div>
                <dt>Recovery Team</dt>
                <dd>{process.recoveryTeam}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{process.version}</dd>
              </div>
              <div>
                <dt>Risk score</dt>
                <dd>{process.riskScore.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Last test</dt>
                <dd>{process.lastTest || "—"}</dd>
              </div>
              <div>
                <dt>Next test</dt>
                <dd>{process.nextTest || "—"}</dd>
              </div>
              <div>
                <dt>Next review</dt>
                <dd>{process.nextReview || "—"}</dd>
              </div>
            </dl>
            <h4 className={styles.subHeading}>Recovery checklist</h4>
            <ul className={styles.checklist}>
              {process.checklist.map((item) => (
                <li key={item.id} className={item.done ? styles.done : undefined}>
                  <span
                    className={item.done ? styles.checkOn : styles.checkOff}
                    aria-hidden
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </section>
        );
      case "Business Impact Analysis":
        return (
          <section className={styles.section}>
            <dl className={styles.stackList}>
              <div>
                <dt>Financial impact</dt>
                <dd>{process.bia.financialImpact}</dd>
              </div>
              <div>
                <dt>Operational impact</dt>
                <dd>{process.bia.operationalImpact}</dd>
              </div>
              <div>
                <dt>Regulatory impact</dt>
                <dd>{process.bia.regulatoryImpact}</dd>
              </div>
              <div>
                <dt>Reputational impact</dt>
                <dd>{process.bia.reputationalImpact}</dd>
              </div>
              <div>
                <dt>Peak dependency</dt>
                <dd>{process.bia.peakDependency}</dd>
              </div>
              <div>
                <dt>Downtime cost / hour</dt>
                <dd>
                  {process.bia.downtimeCostPerHour
                    ? `$${process.bia.downtimeCostPerHour.toLocaleString()}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Recovery priority</dt>
                <dd>{process.bia.recoveryPriority}</dd>
              </div>
              <div>
                <dt>Risk scenario</dt>
                <dd>{process.bia.riskScenario}</dd>
              </div>
            </dl>
          </section>
        );
      case "Recovery Objectives":
        return (
          <section className={styles.section}>
            <div className={styles.objGrid}>
              <div>
                <span>RTO</span>
                <strong>{process.rto || "—"}</strong>
              </div>
              <div>
                <span>RPO</span>
                <strong>{process.rpo || "—"}</strong>
              </div>
              <div>
                <span>MAO</span>
                <strong>{process.mao || "—"}</strong>
              </div>
            </div>
            <p className={styles.note}>
              Business impact: <strong>{process.businessImpact}</strong>. Strategy:{" "}
              <strong>{process.recoveryStrategy}</strong>.
            </p>
          </section>
        );
      case "Recovery Plan":
        return (
          <section className={styles.section}>
            <dl className={styles.metaGrid}>
              <div>
                <dt>Primary site</dt>
                <dd>{process.recoveryPlan.primarySite || "—"}</dd>
              </div>
              <div>
                <dt>DR site</dt>
                <dd>{process.recoveryPlan.drSite || "—"}</dd>
              </div>
              <div>
                <dt>Backup type</dt>
                <dd>{process.recoveryPlan.backupType || "—"}</dd>
              </div>
              <div>
                <dt>Backup frequency</dt>
                <dd>{process.recoveryPlan.backupFrequency || "—"}</dd>
              </div>
              <div>
                <dt>Recovery method</dt>
                <dd>{process.recoveryPlan.recoveryMethod || "—"}</dd>
              </div>
              <div>
                <dt>Alternate service</dt>
                <dd>{process.recoveryPlan.alternateService || "—"}</dd>
              </div>
              <div>
                <dt>Runbook</dt>
                <dd>{process.recoveryPlan.runbookRef || "—"}</dd>
              </div>
            </dl>
            <h4 className={styles.subHeading}>Recovery steps</h4>
            <ol className={styles.ordered}>
              {process.recoveryPlan.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        );
      case "Dependencies":
        return (
          <section className={styles.section}>
            <ul className={styles.list}>
              {process.dependencies.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        );
      case "Recovery Team":
        return (
          <section className={styles.section}>
            <dl className={styles.stackList}>
              <div>
                <dt>Primary recovery team</dt>
                <dd>{process.recoveryTeam}</dd>
              </div>
              <div>
                <dt>Process owner</dt>
                <dd>{process.owner}</dd>
              </div>
              <div>
                <dt>Escalation path</dt>
                <dd>{process.communicationPlan.escalationPath.join(" → ") || "—"}</dd>
              </div>
            </dl>
          </section>
        );
      case "Communication Plan":
        return (
          <section className={styles.section}>
            <h4 className={styles.subHeading}>Internal contacts</h4>
            <ul className={styles.list}>
              {process.communicationPlan.internalContacts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <h4 className={styles.subHeading}>External contacts</h4>
            <ul className={styles.list}>
              {process.communicationPlan.externalContacts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <h4 className={styles.subHeading}>Channels</h4>
            <ul className={styles.list}>
              {process.communicationPlan.channels.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <h4 className={styles.subHeading}>Templates</h4>
            <ul className={styles.list}>
              {process.communicationPlan.templates.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        );
      case "Evidence":
        return (
          <section className={styles.section}>
            <ul className={styles.cardList}>
              {process.evidence.map((item) => (
                <li key={item.id}>
                  <div className={styles.cardListMain}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.type} · {item.date} · {item.owner}
                    </span>
                  </div>
                  <StatusBadge label={item.status} tone={evidenceTone(item.status)} />
                </li>
              ))}
            </ul>
          </section>
        );
      case "Attachments":
        return (
          <section className={styles.section}>
            <ul className={styles.cardList}>
              {process.attachments.map((item) => (
                <li key={item.id}>
                  <div className={styles.cardListMain}>
                    <strong>{item.name}</strong>
                    <span>
                      {item.size} · {item.uploadedBy} · {item.uploadedAt}
                    </span>
                  </div>
                </li>
              ))}
              {process.documents.map((doc) => (
                <li key={doc}>
                  <div className={styles.cardListMain}>
                    <strong>{doc}</strong>
                    <span>Document library reference</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      case "Test History":
        return (
          <section className={styles.section}>
            <ul className={styles.cardList}>
              {process.testHistory.map((item) => (
                <li key={item.id}>
                  <div className={styles.cardListMain}>
                    <strong>
                      {item.date} · {item.type}
                    </strong>
                    <span>
                      {item.scenario} · Target {item.targetRto} / Actual {item.actualRto}
                    </span>
                    <span>{item.observations}</span>
                  </div>
                  <StatusBadge label={item.result} tone={testTone(item.result)} />
                </li>
              ))}
            </ul>
          </section>
        );
      case "Audit History":
        return (
          <section className={styles.section}>
            <ul className={styles.cardList}>
              {process.auditHistory.map((item) => (
                <li key={item.id}>
                  <div className={styles.cardListMain}>
                    <strong>
                      {item.action} · {item.date}
                    </strong>
                    <span>
                      {item.actor} — {item.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      case "Lessons Learned":
        return (
          <section className={styles.section}>
            <ul className={styles.cardList}>
              {process.lessonsLearned.map((item) => (
                <li key={item.id}>
                  <div className={styles.cardListMain}>
                    <strong>
                      {item.source} · {item.date}
                    </strong>
                    <span>{item.finding}</span>
                    <span>
                      Action: {item.action} ({item.owner})
                    </span>
                  </div>
                  <StatusBadge
                    label={item.status}
                    tone={
                      item.status === "Closed"
                        ? "success"
                        : item.status === "Open"
                          ? "danger"
                          : "info"
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      case "Timeline":
        return (
          <section className={styles.section}>
            <ol className={styles.timeline}>
              {process.timeline.map((event, index) => (
                <li key={event.id}>
                  <span
                    className={`${styles.dot} ${event.complete ? styles.dotDone : styles.dotPending}`}
                    aria-hidden
                  />
                  {index < process.timeline.length - 1 ? (
                    <span className={styles.line} aria-hidden />
                  ) : null}
                  <div>
                    <div className={styles.timelineHead}>
                      <strong>{event.title}</strong>
                      <time>{event.date}</time>
                    </div>
                    <p>{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      case "Comments":
        return (
          <section className={styles.section}>
            <ul className={styles.cardList}>
              {process.comments.map((item) => (
                <li key={item.id}>
                  <div className={styles.cardListMain}>
                    <strong>
                      {item.author} · {item.date}
                    </strong>
                    <span>{item.body}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      case "Version History":
        return (
          <section className={styles.section}>
            <ul className={styles.cardList}>
              {process.versionHistory.map((item) => (
                <li key={item.id}>
                  <div className={styles.cardListMain}>
                    <strong>
                      v{item.version} · {item.date}
                    </strong>
                    <span>
                      {item.author} — {item.changeSummary}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      default:
        return null;
    }
  }, [process, tab]);

  if (!open || !process) return null;

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
            <p className={styles.eyebrow}>{process.id}</p>
            <h2 id={titleId} className={styles.title}>
              {process.name}
            </h2>
            <p className={styles.sub}>
              {process.businessUnit} · {process.department}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close process details"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Process detail sections">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`${styles.tab} ${tab === item ? styles.tabActive : ""}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className={styles.body} role="tabpanel" aria-label={tab}>
          {panel}
        </div>
      </aside>
    </div>
  );
}

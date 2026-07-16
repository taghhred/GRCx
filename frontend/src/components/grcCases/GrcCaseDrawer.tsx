import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import type {
  SoarGrcCase,
  SoarGrcCaseStatus,
} from "../../mocks/types/grcCases";
import { CURRENT_USER, shareGrcCase } from "../../mocks/services/collaborationService";
import { listSharableSpecialists } from "../../mocks/services/soarCaseAssignment";
import styles from "./GrcCaseDrawer.module.css";

type TabId =
  | "overview"
  | "evidence"
  | "risk"
  | "compliance"
  | "remediation"
  | "activity";

type Props = {
  caseItem: SoarGrcCase | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (next: SoarGrcCase) => void;
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "Evidence" },
  { id: "risk", label: "Risk Assessment" },
  { id: "compliance", label: "Compliance" },
  { id: "remediation", label: "Remediation" },
  { id: "activity", label: "Activity Log" },
];

function nowLabel(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusTone(
  status: SoarGrcCaseStatus
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Closed" || status === "Resolved") return "success";
  if (status === "Rejected") return "danger";
  if (status === "Pending Evidence" || status === "Pending Approval") return "warning";
  if (status === "In Progress" || status === "Assigned") return "info";
  return "neutral";
}

function appendActivity(
  item: SoarGrcCase,
  action: string,
  detail?: string
): SoarGrcCase {
  return {
    ...item,
    updatedAt: nowLabel(),
    activityLog: [
      {
        id: `act-${Date.now()}`,
        at: nowLabel(),
        actor: CURRENT_USER.name,
        action,
        detail,
      },
      ...item.activityLog,
    ],
  };
}

export default function GrcCaseDrawer({ caseItem, open, onClose, onUpdate }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [note, setNote] = useState("");
  const [shareQuery, setShareQuery] = useState("");
  const [selectedShare, setSelectedShare] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState<SoarGrcCaseStatus | "">("");

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const invitees = useMemo(() => {
    if (!caseItem) return [];
    const q = shareQuery.trim().toLowerCase();
    return listSharableSpecialists(caseItem.owner).filter(
      (a) =>
        !caseItem.collaborators.includes(a.name) &&
        (q.length === 0 ||
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q))
    );
  }, [caseItem, shareQuery]);

  if (!open || !caseItem) return null;

  const isOwner =
    caseItem.owner === CURRENT_USER.name ||
    caseItem.assignedTo === CURRENT_USER.name;

  const patch = (updater: (c: SoarGrcCase) => SoarGrcCase) => {
    onUpdate(updater(caseItem));
  };

  const startWorking = () => {
    patch((c) =>
      appendActivity(
        { ...c, status: "In Progress" },
        "Status changed",
        `${c.status} → In Progress`
      )
    );
  };

  const requestEvidence = () => {
    patch((c) =>
      appendActivity(
        { ...c, status: "Pending Evidence" },
        "Requested more evidence"
      )
    );
  };

  const closeCase = () => {
    patch((c) => appendActivity({ ...c, status: "Closed" }, "Closed"));
  };

  const rejectCase = () => {
    patch((c) => appendActivity({ ...c, status: "Rejected" }, "Rejected"));
  };

  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    patch((c) =>
      appendActivity(
        { ...c, internalNotes: [text, ...c.internalNotes] },
        "Comment added",
        text
      )
    );
    setNote("");
  };

  const addRemediationTask = () => {
    patch((c) => {
      const id = `rt-${Date.now()}`;
      return appendActivity(
        {
          ...c,
          remediationTasks: [
            {
              id,
              title: "New remediation task",
              owner: c.assignedTo === "Unassigned" ? CURRENT_USER.name : c.assignedTo,
              dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
              status: "Open",
              comments: "",
              completed: false,
            },
            ...c.remediationTasks,
          ],
        },
        "Remediation task created"
      );
    });
  };

  const applyStatus = () => {
    if (!statusDraft) return;
    patch((c) =>
      appendActivity(
        { ...c, status: statusDraft },
        "Status changed",
        `${c.status} → ${statusDraft}`
      )
    );
    setStatusDraft("");
  };

  const toggleShare = (id: string) => {
    setSelectedShare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const share = () => {
    if (selectedShare.length === 0) return;
    const { collaboratorNames } = shareGrcCase({
      caseId: caseItem.caseId,
      caseTitle: caseItem.title,
      ownerName: caseItem.owner,
      collaboratorIds: selectedShare,
    });
    patch((c) =>
      appendActivity(
        {
          ...c,
          collaborators: Array.from(new Set([...c.collaborators, ...collaboratorNames])),
        },
        `Shared with ${collaboratorNames.join(", ")}`
      )
    );
    setSelectedShare([]);
    setShareQuery("");
  };

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
            <p className={styles.eyebrow}>SOAR → GRCx Case</p>
            <h2 id={titleId} className={styles.title}>
              {caseItem.caseId} · {caseItem.title}
            </h2>
            <p className={styles.sub}>
              {caseItem.framework} · {caseItem.control}
            </p>
            <div className={styles.badges}>
              <SeverityBadge severity={caseItem.severity} />
              <StatusBadge label={caseItem.status} tone={statusTone(caseItem.status)} />
              <StatusBadge
                label={`SLA ${caseItem.slaState}`}
                tone={
                  caseItem.slaState === "Breached"
                    ? "danger"
                    : caseItem.slaState === "At Risk"
                      ? "warning"
                      : "success"
                }
              />
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close case details"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        {isOwner ? (
          <div className={styles.actionBar} aria-label="Case actions">
            <button type="button" className={styles.primaryAction} onClick={startWorking}>
              Start Working
            </button>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <select
                aria-label="Change status"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as SoarGrcCaseStatus)}
                style={{ minHeight: 34, borderRadius: 8, padding: "0 8px" }}
              >
                <option value="">Change Status…</option>
                {(
                  [
                    "New",
                    "Assigned",
                    "In Progress",
                    "Pending Evidence",
                    "Pending Approval",
                    "Resolved",
                    "Closed",
                    "Rejected",
                  ] as SoarGrcCaseStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" onClick={applyStatus} disabled={!statusDraft}>
                Apply
              </button>
            </label>
            <button type="button" onClick={requestEvidence}>
              Request More Evidence
            </button>
            <button type="button" onClick={addRemediationTask}>
              Create Remediation Task
            </button>
            <button type="button" onClick={closeCase}>
              Close Case
            </button>
            <button type="button" className={styles.dangerAction} onClick={rejectCase}>
              Reject Case
            </button>
          </div>
        ) : null}

        <div className={styles.tabs} role="tablist" aria-label="Case sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`${styles.tab} ${tab === item.id ? styles.tabActive : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {tab === "overview" ? (
            <>
              <section className={styles.section}>
                <h3>Description from SOAR</h3>
                <p className={styles.prose}>{caseItem.description}</p>
              </section>
              <section className={styles.section}>
                <h3>Violation summary</h3>
                <p className={styles.prose}>{caseItem.violationSummary}</p>
              </section>
              <section className={styles.section}>
                <h3>Case details</h3>
                <dl className={styles.meta}>
                  <div>
                    <dt>Affected asset</dt>
                    <dd>{caseItem.affectedAsset}</dd>
                  </div>
                  <div>
                    <dt>Severity</dt>
                    <dd>{caseItem.severity}</dd>
                  </div>
                  <div>
                    <dt>Department</dt>
                    <dd>{caseItem.department}</dd>
                  </div>
                  <div>
                    <dt>Framework</dt>
                    <dd>{caseItem.framework}</dd>
                  </div>
                  <div>
                    <dt>Control</dt>
                    <dd>{caseItem.control}</dd>
                  </div>
                  <div>
                    <dt>Detection time</dt>
                    <dd>{caseItem.detectionTime}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{caseItem.source}</dd>
                  </div>
                  <div>
                    <dt>Specialization</dt>
                    <dd>{caseItem.specialization}</dd>
                  </div>
                </dl>
              </section>
              <section className={styles.section}>
                <h3>Ownership & collaboration</h3>
                <div className={styles.ownerLine}>
                  <div>
                    <span>Owner </span>
                    <strong>{caseItem.owner}</strong>
                  </div>
                  <div>
                    <span>Assigned To </span>
                    <strong>{caseItem.assignedTo}</strong>
                  </div>
                  <div>
                    <span>Collaborators </span>
                    <strong>
                      {caseItem.collaborators.length
                        ? caseItem.collaborators.join(", ")
                        : "None"}
                    </strong>
                  </div>
                </div>
              </section>
              {isOwner ? (
                <section className={styles.section}>
                  <h3>Share Case</h3>
                  <div className={styles.shareBox}>
                    <input
                      type="search"
                      placeholder="Search GRC specialist…"
                      value={shareQuery}
                      onChange={(e) => setShareQuery(e.target.value)}
                      aria-label="Search specialist"
                    />
                    <div className={styles.chipRow}>
                      {invitees.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`${styles.chip} ${
                            selectedShare.includes(a.id) ? styles.chipOn : ""
                          }`}
                          onClick={() => toggleShare(a.id)}
                        >
                          {a.name} · {a.role}
                        </button>
                      ))}
                      {invitees.length === 0 ? (
                        <span className={styles.prose}>No matching specialists.</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={styles.primaryAction}
                      onClick={share}
                      disabled={selectedShare.length === 0}
                      style={{ alignSelf: "flex-start", minHeight: 36, padding: "0 14px" }}
                    >
                      Share Case
                    </button>
                  </div>
                </section>
              ) : null}
              <section className={styles.section}>
                <h3>Add internal note</h3>
                <div className={styles.noteField}>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Internal note for the GRC team…"
                    aria-label="Internal note"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={!note.trim()}
                    style={{
                      alignSelf: "flex-start",
                      minHeight: 36,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      cursor: "pointer",
                    }}
                  >
                    Add Internal Note
                  </button>
                </div>
                {caseItem.internalNotes.length > 0 ? (
                  <ul className={styles.list} style={{ marginTop: 12 }}>
                    {caseItem.internalNotes.map((n, i) => (
                      <li key={`${i}-${n.slice(0, 12)}`} className={styles.listItem}>
                        <p>{n}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </>
          ) : null}

          {tab === "evidence" ? (
            <section className={styles.section}>
              <h3>Evidence from SOAR</h3>
              {caseItem.evidence.length === 0 ? (
                <p className={styles.prose}>No evidence attached yet.</p>
              ) : (
                <ul className={styles.list}>
                  {caseItem.evidence.map((item) => (
                    <li key={item.id} className={styles.listItem}>
                      <strong>
                        {item.type} · {item.name}
                      </strong>
                      <p>{item.detail}</p>
                      <span>
                        {item.addedAt}
                        {item.hash ? ` · ${item.hash}` : ""}
                        {item.url ? " · link available" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.prose} style={{ marginTop: 12 }}>
                Attach Files is available after backend storage is enabled. Prototype
                accepts notes via Overview.
              </p>
            </section>
          ) : null}

          {tab === "risk" ? (
            <section className={styles.section}>
              <h3>Risk assessment</h3>
              <dl className={styles.meta}>
                <div>
                  <dt>Likelihood</dt>
                  <dd>{caseItem.risk.likelihood}</dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>{caseItem.risk.impact}</dd>
                </div>
                <div>
                  <dt>Risk score</dt>
                  <dd>{caseItem.risk.riskScore}</dd>
                </div>
                <div>
                  <dt>Residual risk</dt>
                  <dd>{caseItem.risk.residualRisk}</dd>
                </div>
                <div>
                  <dt>Risk owner</dt>
                  <dd>{caseItem.risk.riskOwner}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {tab === "compliance" ? (
            <section className={styles.section}>
              <h3>Compliance mapping</h3>
              <dl className={styles.meta}>
                <div>
                  <dt>Mapped framework</dt>
                  <dd>{caseItem.compliance.framework}</dd>
                </div>
                <div>
                  <dt>Control number</dt>
                  <dd>{caseItem.compliance.controlNumber}</dd>
                </div>
                <div>
                  <dt>Compliance status</dt>
                  <dd>{caseItem.compliance.complianceStatus}</dd>
                </div>
                <div>
                  <dt>Control description</dt>
                  <dd>{caseItem.compliance.controlDescription}</dd>
                </div>
              </dl>
              <h3 style={{ marginTop: 16 }}>Gap explanation</h3>
              <p className={styles.prose}>{caseItem.compliance.gapExplanation}</p>
            </section>
          ) : null}

          {tab === "remediation" ? (
            <section className={styles.section}>
              <h3>Remediation tasks</h3>
              {caseItem.remediationTasks.length === 0 ? (
                <p className={styles.prose}>No remediation tasks yet.</p>
              ) : (
                <ul className={styles.list}>
                  {caseItem.remediationTasks.map((task) => (
                    <li key={task.id} className={styles.listItem}>
                      <strong>{task.title}</strong>
                      <span>
                        Owner {task.owner} · Due {task.dueDate} · {task.status}
                        {task.completed ? " · Completed" : ""}
                      </span>
                      {task.comments ? <p>{task.comments}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "activity" ? (
            <section className={styles.section}>
              <h3>Activity log</h3>
              <ol className={styles.timeline}>
                {caseItem.activityLog.map((entry) => (
                  <li key={entry.id}>
                    <time dateTime={entry.at}>{entry.at}</time>
                    <strong>
                      {entry.actor} — {entry.action}
                    </strong>
                    {entry.detail ? <p className={styles.prose}>{entry.detail}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

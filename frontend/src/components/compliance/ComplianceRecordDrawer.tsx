import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useComplianceModule } from "../../services/compliance/ComplianceModuleContext";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import {
  asSeverity,
  complianceStatusTone,
  formatDate,
  fmtScore,
} from "./sections/complianceSectionUtils";
import styles from "./ComplianceRecordDrawer.module.css";

const TABS = [
  "Overview",
  "Assessment",
  "Evidence",
  "History",
  "Related Risks",
  "Attachments",
  "Timeline",
  "Comments",
  "Approval",
] as const;

type TabId = (typeof TABS)[number];

interface ComplianceRecordDrawerProps {
  open: boolean;
  onClose: () => void;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export default function ComplianceRecordDrawer({ open, onClose }: ComplianceRecordDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tabState, setTabState] = useState<{ recordId: string; tab: TabId }>({
    recordId: "",
    tab: "Overview",
  });
  const {
    selectedId,
    selectedType,
    register,
    assessments,
    evidence,
    findings,
    frameworks,
  } = useComplianceModule();

  const tab =
    tabState.recordId === (selectedId ?? "") ? tabState.tab : "Overview";

  function setTab(next: TabId) {
    setTabState({ recordId: selectedId ?? "", tab: next });
  }

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
  }, [open, onClose, selectedId]);

  const registerItem = useMemo(() => {
    if (!selectedId) return null;
    if (selectedType === "register" || selectedType == null) {
      return register.find((r) => r.complianceId === selectedId) ?? null;
    }
    if (selectedType === "finding") {
      const finding = findings.find((f) => f.findingId === selectedId);
      return finding
        ? register.find((r) => r.complianceId === finding.complianceId) ?? null
        : null;
    }
    if (selectedType === "assessment") {
      const asm = assessments.find((a) => a.assessmentId === selectedId);
      return asm ? register.find((r) => r.complianceId === asm.complianceId) ?? null : null;
    }
    if (selectedType === "evidence") {
      const ev = evidence.find((e) => e.evidenceId === selectedId);
      return ev ? register.find((r) => r.complianceId === ev.complianceId) ?? null : null;
    }
    return null;
  }, [selectedId, selectedType, register, findings, assessments, evidence]);

  const assessmentItem = useMemo(() => {
    if (selectedType === "assessment" && selectedId) {
      return assessments.find((a) => a.assessmentId === selectedId) ?? null;
    }
    const complianceId =
      registerItem?.complianceId ||
      (selectedType === "register" ? selectedId : null);
    if (!complianceId) return null;
    return (
      assessments.find((a) => a.complianceId === complianceId) ||
      assessments.find(
        (a) =>
          a.framework === registerItem?.framework &&
          a.controlId === registerItem?.controlId
      ) ||
      null
    );
  }, [selectedType, selectedId, assessments, registerItem]);

  const relatedAssessments = useMemo(() => {
    if (!registerItem) {
      return assessmentItem ? [assessmentItem] : [];
    }
    return assessments.filter(
      (a) =>
        a.complianceId === registerItem.complianceId ||
        (a.framework === registerItem.framework && a.controlId === registerItem.controlId) ||
        (a.framework === registerItem.framework && a.department === registerItem.department)
    );
  }, [assessments, registerItem, assessmentItem]);

  const relatedEvidence = useMemo(() => {
    if (!registerItem) {
      if (selectedType === "evidence" && selectedId) {
        return evidence.filter((e) => e.evidenceId === selectedId);
      }
      return [];
    }
    return evidence.filter(
      (e) =>
        e.complianceId === registerItem.complianceId ||
        (e.framework === registerItem.framework && e.controlId === registerItem.controlId) ||
        (e.framework === registerItem.framework && e.department === registerItem.department)
    );
  }, [evidence, registerItem, selectedType, selectedId]);

  const relatedFindings = useMemo(() => {
    if (!registerItem) {
      if (selectedType === "finding" && selectedId) {
        return findings.filter((f) => f.findingId === selectedId);
      }
      return [];
    }
    return findings.filter(
      (f) =>
        f.complianceId === registerItem.complianceId ||
        (f.framework === registerItem.framework && f.controlId === registerItem.controlId)
    );
  }, [findings, registerItem, selectedType, selectedId]);

  const frameworkSummary = useMemo(() => {
    if (selectedType === "framework" && selectedId) {
      return frameworks.find((f) => f.id === selectedId || f.name === selectedId) ?? null;
    }
    const name = registerItem?.framework || assessmentItem?.framework;
    return name ? frameworks.find((f) => f.name === name) ?? null : null;
  }, [selectedType, selectedId, frameworks, registerItem, assessmentItem]);

  const evidenceItem = useMemo(() => {
    if (selectedType === "evidence" && selectedId) {
      return evidence.find((e) => e.evidenceId === selectedId) ?? null;
    }
    return relatedEvidence[0] ?? null;
  }, [selectedType, selectedId, evidence, relatedEvidence]);

  const findingItem = useMemo(() => {
    if (selectedType === "finding" && selectedId) {
      return findings.find((f) => f.findingId === selectedId) ?? null;
    }
    return relatedFindings[0] ?? null;
  }, [selectedType, selectedId, findings, relatedFindings]);

  if (!open || !selectedId) return null;

  const title =
    registerItem?.controlName ||
    assessmentItem?.assessmentId ||
    evidenceItem?.evidenceName ||
    findingItem?.controlName ||
    frameworkSummary?.name ||
    selectedId;

  const eyebrow =
    registerItem?.complianceId ||
    assessmentItem?.assessmentId ||
    evidenceItem?.evidenceId ||
    findingItem?.findingId ||
    frameworkSummary?.name ||
    selectedId;

  const status =
    registerItem?.status ||
    assessmentItem?.result ||
    evidenceItem?.reviewStatus ||
    findingItem?.status ||
    "—";

  const riskLevel =
    registerItem?.riskLevel || findingItem?.severity || "Medium";

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
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <p className={styles.sub}>
              {[
                registerItem?.framework || assessmentItem?.framework || evidenceItem?.framework,
                registerItem?.department || assessmentItem?.department || evidenceItem?.department,
              ]
                .filter(Boolean)
                .join(" · ") || "Compliance record"}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close compliance details"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className={styles.tabs}>
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.tab} ${tab === item ? styles.tabActive : ""}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {tab === "Overview" ? (
            <section className={styles.section}>
              <h3>Overview</h3>
              <div className={styles.badges}>
                <StatusBadge label={status} tone={complianceStatusTone(status)} />
                <SeverityBadge severity={asSeverity(riskLevel)} />
              </div>
              <dl className={styles.meta}>
                <Meta label="Compliance ID" value={registerItem?.complianceId || "—"} />
                <Meta label="Control ID" value={registerItem?.controlId || assessmentItem?.controlId || evidenceItem?.controlId || "—"} />
                <Meta label="Framework" value={registerItem?.framework || assessmentItem?.framework || evidenceItem?.framework || "—"} />
                <Meta label="Owner" value={registerItem?.owner || evidenceItem?.owner || "—"} />
                <Meta label="Department" value={registerItem?.department || assessmentItem?.department || evidenceItem?.department || "—"} />
                <Meta label="Business Unit" value={registerItem?.businessUnit || "—"} />
                <Meta label="Score %" value={fmtScore(registerItem?.complianceScore ?? assessmentItem?.compliancePercent)} />
                <Meta label="Priority" value={registerItem?.priority || "—"} />
                <Meta label="Next Review" value={formatDate(registerItem?.nextReview)} />
                <Meta label="Due Date" value={formatDate(registerItem?.dueDate)} />
              </dl>
              {registerItem?.notes ? <p className={styles.paragraph}>{registerItem.notes}</p> : null}
              {frameworkSummary ? (
                <p className={styles.paragraph}>
                  Framework posture: {frameworkSummary.compliancePercent}% ·{" "}
                  {frameworkSummary.mappedControls} mapped controls ·{" "}
                  {frameworkSummary.findingsCount} findings
                </p>
              ) : null}
            </section>
          ) : null}

          {tab === "Assessment" ? (
            <section className={styles.section}>
              <h3>Assessment</h3>
              {relatedAssessments.length === 0 ? (
                <p className={styles.paragraph}>No linked assessments for this record.</p>
              ) : (
                <ul className={styles.historyList}>
                  {relatedAssessments.map((a) => (
                    <li key={a.assessmentId}>
                      <strong>
                        {a.assessmentId} · {a.result || "—"}
                      </strong>
                      <span>
                        {formatDate(a.assessmentDate)} · {a.assessor || "Unassigned"} ·{" "}
                        {fmtScore(a.compliancePercent)}%
                      </span>
                      {a.gap ? <em>{a.gap}</em> : null}
                      {a.recommendation ? <em>{a.recommendation}</em> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "Evidence" || tab === "Attachments" ? (
            <section className={styles.section}>
              <h3>{tab}</h3>
              {relatedEvidence.length === 0 ? (
                <p className={styles.paragraph}>No evidence linked yet.</p>
              ) : (
                <ul className={styles.evidenceList}>
                  {relatedEvidence.map((e) => (
                    <li key={e.evidenceId}>
                      <div>
                        <strong>{e.evidenceName || e.fileName || e.evidenceId}</strong>
                        <span>
                          {e.evidenceType || "File"} · v{e.version || "—"} ·{" "}
                          {formatDate(e.uploadDate)}
                        </span>
                      </div>
                      <StatusBadge
                        label={e.reviewStatus || "Pending"}
                        tone={complianceStatusTone(e.reviewStatus || "")}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "History" || tab === "Timeline" ? (
            <section className={styles.section}>
              <h3>{tab}</h3>
              <ul className={styles.historyList}>
                {registerItem?.lastAssessment ? (
                  <li>
                    <strong>Last assessment</strong>
                    <span>{formatDate(registerItem.lastAssessment)}</span>
                  </li>
                ) : null}
                {relatedAssessments.map((a) => (
                  <li key={`tl-${a.assessmentId}`}>
                    <strong>Assessment {a.assessmentId}</strong>
                    <span>
                      {formatDate(a.assessmentDate)} · {a.result}
                    </span>
                  </li>
                ))}
                {relatedEvidence.map((e) => (
                  <li key={`tl-${e.evidenceId}`}>
                    <strong>Evidence uploaded</strong>
                    <span>
                      {formatDate(e.uploadDate)} · {e.uploadedBy}
                    </span>
                  </li>
                ))}
                {!registerItem?.lastAssessment &&
                relatedAssessments.length === 0 &&
                relatedEvidence.length === 0 ? (
                  <li>
                    <strong>No history events</strong>
                    <span>Import assessments or evidence to build a timeline.</span>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {tab === "Related Risks" ? (
            <section className={styles.section}>
              <h3>Related Risks</h3>
              {relatedFindings.length === 0 ? (
                <p className={styles.paragraph}>
                  No related findings. Linkage is based on framework / control / department.
                </p>
              ) : (
                <ul className={styles.historyList}>
                  {relatedFindings.map((f) => (
                    <li key={f.findingId}>
                      <strong>
                        {f.findingId} · {f.severity}
                      </strong>
                      <span>
                        {f.description || "—"} · {f.department || "—"}
                      </span>
                      {f.riskLink ? <em>Risk level: {f.riskLink}</em> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "Comments" ? (
            <section className={styles.section}>
              <h3>Comments</h3>
              <ul className={styles.historyList}>
                {registerItem?.notes ? (
                  <li>
                    <strong>Register notes</strong>
                    <span>{registerItem.notes}</span>
                  </li>
                ) : null}
                {relatedAssessments
                  .filter((a) => a.comments)
                  .map((a) => (
                    <li key={`c-${a.assessmentId}`}>
                      <strong>{a.assessor || a.assessmentId}</strong>
                      <span>{a.comments}</span>
                    </li>
                  ))}
                {relatedEvidence
                  .filter((e) => e.comments)
                  .map((e) => (
                    <li key={`c-${e.evidenceId}`}>
                      <strong>{e.uploadedBy || e.evidenceId}</strong>
                      <span>{e.comments}</span>
                    </li>
                  ))}
                {!registerItem?.notes &&
                relatedAssessments.every((a) => !a.comments) &&
                relatedEvidence.every((e) => !e.comments) ? (
                  <li>
                    <strong>No comments</strong>
                    <span>Comments from Excel imports will appear here.</span>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {tab === "Approval" ? (
            <section className={styles.section}>
              <h3>Approval</h3>
              {relatedAssessments.length === 0 ? (
                <p className={styles.paragraph}>No approval records available.</p>
              ) : (
                <ul className={styles.historyList}>
                  {relatedAssessments.map((a) => (
                    <li key={`ap-${a.assessmentId}`}>
                      <strong>
                        {a.assessmentId} · {a.approvalStatus || "Pending"}
                      </strong>
                      <span>
                        Approved by {a.approvedBy || "—"} · Target{" "}
                        {formatDate(a.targetCompletion)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

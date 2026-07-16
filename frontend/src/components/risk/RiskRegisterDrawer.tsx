import { useEffect, useId, useRef } from "react";
import { Copy, History, Pencil, Trash2, UploadCloud, X } from "lucide-react";
import type { RiskRegisterItem } from "../../mocks/types/riskRegister";
import type { Severity } from "../../mocks/types/dashboard";
import type { RiskLevel as MatrixRiskLevel } from "../../mocks/types/risk";
import { riskSourceDownloadUrl } from "../../services/api/riskApi";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import RiskMatrix from "./RiskMatrix";
import styles from "./RiskRegisterDrawer.module.css";

interface RiskRegisterDrawerProps {
  risk: RiskRegisterItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (risk: RiskRegisterItem) => void;
  onDuplicate: (risk: RiskRegisterItem) => void;
  onArchive: (risk: RiskRegisterItem) => void;
  onUploadEvidence: (risk: RiskRegisterItem, files: FileList) => void;
}

const VALID_LEVELS = new Set(["Low", "Medium", "High", "Critical"]);

function asSeverity(level: string | null | undefined): Severity {
  return (VALID_LEVELS.has(level ?? "") ? level : "Medium") as Severity;
}

function asMatrixLevel(level: string | null | undefined): MatrixRiskLevel {
  return (VALID_LEVELS.has(level ?? "") ? level : "Medium") as MatrixRiskLevel;
}

function statusTone(
  status: string
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Closed" || status === "Accepted") return "success";
  if (status === "Remediation in Progress" || status === "In Progress")
    return "warning";
  if (status === "Under Assessment" || status === "Pending Approval")
    return "info";
  if (status === "Archived") return "neutral";
  return "danger";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}

export default function RiskRegisterDrawer({
  risk,
  open,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  onUploadEvidence,
}: RiskRegisterDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

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

  if (!open || !risk) {
    return null;
  }

  const hasFullMatrix =
    risk.inherentLikelihood != null &&
    risk.inherentImpact != null &&
    risk.residualLikelihood != null &&
    risk.residualImpact != null;

  const sortedHistory = [...risk.history].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

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
            <p className={styles.eyebrow}>{risk.riskId}</p>
            <h2 id={titleId} className={styles.title}>
              {risk.title}
            </h2>
            <p className={styles.sub}>
              {risk.department || "Unassigned department"} · {risk.category}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close risk details"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className={styles.actionsRow}>
          <button type="button" className={styles.actionBtn} onClick={() => onEdit(risk)}>
            <Pencil size={15} aria-hidden />
            Edit
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onDuplicate(risk)}
          >
            <Copy size={15} aria-hidden />
            Duplicate
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => evidenceInputRef.current?.click()}
          >
            <UploadCloud size={15} aria-hidden />
            Upload Evidence
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionDanger}`}
            onClick={() => onArchive(risk)}
          >
            <Trash2 size={15} aria-hidden />
            Archive
          </button>
          <input
            ref={evidenceInputRef}
            type="file"
            multiple
            className={styles.hiddenInput}
            onChange={(event) => {
              if (event.target.files && event.target.files.length > 0) {
                onUploadEvidence(risk, event.target.files);
              }
              event.target.value = "";
            }}
          />
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>General</h3>
            <div className={styles.badges}>
              <StatusBadge label={risk.status} tone={statusTone(risk.status)} />
              <SeverityBadge severity={asSeverity(risk.residualLevel)} />
            </div>
            <dl className={styles.meta}>
              <div>
                <dt>Business Unit</dt>
                <dd>{risk.businessUnit || "—"}</dd>
              </div>
              <div>
                <dt>Vendor</dt>
                <dd>{risk.vendor || "—"}</dd>
              </div>
              <div>
                <dt>Affected Asset</dt>
                <dd>{risk.affectedAsset || "—"}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{risk.owner || "Unassigned"}</dd>
              </div>
              <div>
                <dt>Source File</dt>
                <dd>
                  {risk.sourceFileId ? (
                    <a
                      href={riskSourceDownloadUrl(risk.sourceFileId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {risk.sourceFilename || "Download source file"}
                    </a>
                  ) : (
                    risk.sourceFilename || "Manual Entry"
                  )}
                </dd>
              </div>
              <div>
                <dt>Treatment</dt>
                <dd>{risk.treatment || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Description</h3>
            <p className={styles.paragraph}>
              {risk.description || "No description provided."}
            </p>
          </section>

          <section className={styles.section}>
            <h3>Business Impact</h3>
            <p className={styles.paragraph}>
              {risk.description
                ? `Impact on ${risk.affectedAsset || "the affected asset"} (${risk.businessUnit || "business unit"}): ${risk.description}`
                : "No business impact narrative provided."}
            </p>
          </section>

          <section className={styles.section}>
            <h3>Likelihood / Impact / Score</h3>
            <div className={styles.scoreGrid}>
              <div className={styles.scoreCard}>
                <span>Inherent</span>
                <strong>{risk.inherentScore ?? "—"}</strong>
                <p>
                  L{risk.inherentLikelihood ?? "—"} × I{risk.inherentImpact ?? "—"}
                </p>
                <SeverityBadge severity={asSeverity(risk.inherentLevel)} />
              </div>
              <div className={styles.scoreCard}>
                <span>Residual</span>
                <strong>{risk.residualScore ?? "—"}</strong>
                <p>
                  L{risk.residualLikelihood ?? "—"} × I{risk.residualImpact ?? "—"}
                </p>
                <SeverityBadge severity={asSeverity(risk.residualLevel)} />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Risk Matrix</h3>
            {hasFullMatrix ? (
              <RiskMatrix
                inherentLikelihood={risk.inherentLikelihood as number}
                inherentImpact={risk.inherentImpact as number}
                residualLikelihood={risk.residualLikelihood as number}
                residualImpact={risk.residualImpact as number}
                inherentLevel={asMatrixLevel(risk.inherentLevel)}
                residualLevel={asMatrixLevel(risk.residualLevel)}
                inherentScore={risk.inherentScore ?? 0}
                residualScore={risk.residualScore ?? 0}
              />
            ) : (
              <div className={styles.fallbackMatrix}>
                <div>
                  <span>Inherent</span>
                  <strong>{risk.inherentLevel || "—"}</strong>
                  <p>Score: {risk.inherentScore ?? "—"}</p>
                </div>
                <div>
                  <span>Residual</span>
                  <strong>{risk.residualLevel || "—"}</strong>
                  <p>Score: {risk.residualScore ?? "—"}</p>
                </div>
                <p className={styles.empty}>
                  Full 5×5 matrix requires both likelihood and impact values for
                  inherent and residual assessments.
                </p>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3>Treatment</h3>
            <dl className={styles.meta}>
              <div>
                <dt>Treatment Decision</dt>
                <dd>{risk.treatment || "—"}</dd>
              </div>
              <div>
                <dt>Planned Controls</dt>
                <dd>{risk.plannedControls || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Controls</h3>
            <dl className={styles.meta}>
              <div>
                <dt>Framework</dt>
                <dd>{risk.framework || "—"}</dd>
              </div>
              <div>
                <dt>Control Reference</dt>
                <dd>{risk.frameworkControlRef || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Owner</h3>
            <p className={styles.paragraph}>
              {risk.owner || "Unassigned"} — {risk.department || "Unassigned department"}
            </p>
          </section>

          <section className={styles.section}>
            <h3>Review</h3>
            <dl className={styles.meta}>
              <div>
                <dt>Date Identified</dt>
                <dd>{formatDate(risk.dateIdentified)}</dd>
              </div>
              <div>
                <dt>Next Review Date</dt>
                <dd>{formatDate(risk.nextReviewDate)}</dd>
              </div>
              <div>
                <dt>Last Updated</dt>
                <dd>{formatDate(risk.lastUpdated)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(risk.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section}>
            <h3>Evidence</h3>
            {risk.evidence.length === 0 ? (
              <p className={styles.empty}>No evidence attached yet.</p>
            ) : (
              <ul className={styles.list}>
                {risk.evidence.map((item) => (
                  <li key={item.id}>
                    <strong>{item.filename}</strong>
                    <span>
                      {item.fileType || "file"} · {item.uploadedBy || "Unknown"} ·{" "}
                      {item.uploadedAt ? item.uploadedAt.slice(0, 10) : "—"}
                    </span>
                    {item.description ? <p>{item.description}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3>Framework</h3>
            <p className={styles.paragraph}>
              {risk.framework
                ? `${risk.framework}${risk.frameworkControlRef ? ` — ${risk.frameworkControlRef}` : ""}`
                : "No framework mapped."}
            </p>
          </section>

          <section className={styles.section}>
            <h3>Notes</h3>
            <p className={styles.paragraph}>{risk.notes || "No additional notes."}</p>
          </section>

          <section className={styles.section}>
            <h3>
              <History size={15} aria-hidden /> Timeline / Activity
            </h3>
            {sortedHistory.length === 0 ? (
              <p className={styles.empty}>No activity recorded.</p>
            ) : (
              <ul className={styles.timeline}>
                {sortedHistory.map((entry) => (
                  <li key={entry.id}>
                    <div className={styles.timelineDot} aria-hidden />
                    <div>
                      <strong>{entry.action}</strong>
                      <span className={styles.timelineMeta}>
                        {entry.actor || "System"} ·{" "}
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                      {entry.detail ? <p>{entry.detail}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

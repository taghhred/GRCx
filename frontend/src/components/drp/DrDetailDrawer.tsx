import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { DrDrawerContent } from "../../mocks/types/drp";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import styles from "./DrDetailDrawer.module.css";

interface DrDetailDrawerProps {
  content: DrDrawerContent | null;
  open: boolean;
  onClose: () => void;
}

export default function DrDetailDrawer({
  content,
  open,
  onClose,
}: DrDetailDrawerProps) {
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

  if (!open || !content) {
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
            <p className={styles.eyebrow}>{content.kind}</p>
            <h2 id={titleId} className={styles.title}>
              {content.title}
            </h2>
            <p className={styles.sub}>{content.subtitle}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close details"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>Overview</h3>
            <div className={styles.badges}>
              {content.priority ? (
                <SeverityBadge severity={content.priority} />
              ) : null}
              {content.statusLabel ? (
                <StatusBadge label={content.statusLabel} tone="info" />
              ) : null}
            </div>
            <dl className={styles.meta}>
              <div>
                <dt>Responsible owner</dt>
                <dd>{content.owner}</dd>
              </div>
            </dl>
          </section>

          {content.objectives ? (
            <section className={styles.section}>
              <h3>Recovery objectives</h3>
              <div className={styles.objGrid}>
                <div>
                  <span>RTO</span>
                  <strong>{content.objectives.rto}</strong>
                </div>
                <div>
                  <span>RPO</span>
                  <strong>{content.objectives.rpo}</strong>
                </div>
                <div>
                  <span>MAO</span>
                  <strong>{content.objectives.mao}</strong>
                </div>
              </div>
            </section>
          ) : null}

          <section className={styles.section}>
            <h3>Recovery checklist</h3>
            <ul className={styles.checklist}>
              {content.checklist.map((item) => (
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

          <section className={styles.section}>
            <h3>Dependencies</h3>
            <ul className={styles.list}>
              {content.dependencies.map((dep) => (
                <li key={dep}>{dep}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Related documents</h3>
            <ul className={styles.list}>
              {content.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>Recovery logs</h3>
            <ul className={styles.list}>
              {content.logs.map((log) => (
                <li key={log}>{log}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3>AI recommendations</h3>
            <ul className={styles.aiList}>
              {content.aiRecommendations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}

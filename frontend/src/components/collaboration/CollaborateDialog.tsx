import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Users, X } from "lucide-react";
import type { CollaborationType } from "../../mocks/types/collaboration";
import {
  createCollaborationRequest,
  listInviteableAnalysts,
} from "../../mocks/services/collaborationService";
import Button from "../common/Button";
import styles from "./CollaborateDialog.module.css";

const TYPES: CollaborationType[] = [
  "Request Review",
  "Request Evidence",
  "Request Compliance Mapping",
  "Request Risk Assessment",
  "Request Validation",
  "General Assistance",
];

interface CollaborateDialogProps {
  open: boolean;
  caseId: string;
  caseLabel: string;
  caseTitle: string;
  ownerName: string;
  onClose: () => void;
  onSubmitted: (timelineDetails: string[]) => void;
}

export default function CollaborateDialog({
  open,
  caseId,
  caseLabel,
  caseTitle,
  ownerName,
  onClose,
  onSubmitted,
}: CollaborateDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const analysts = listInviteableAnalysts(ownerName);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<CollaborationType>("Request Review");
  const [error, setError] = useState<string | null>(null);

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

  if (!open || typeof document === "undefined") return null;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const submit = () => {
    if (selected.length === 0) {
      setError("Select at least one GRC analyst.");
      return;
    }
    if (!message.trim()) {
      setError("Add a short collaboration message.");
      return;
    }
    const { timelineDetails } = createCollaborationRequest({
      caseId,
      caseLabel,
      caseTitle,
      ownerName,
      collaboratorIds: selected,
      type,
      message,
    });
    onSubmitted(timelineDetails);
    onClose();
  };

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Case collaboration</p>
            <h2 id={titleId}>Collaborate</h2>
            <p className={styles.sub}>
              Invite analysts to assist on {caseLabel}. Ownership stays with{" "}
              {ownerName}.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close collaborate dialog"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          <fieldset className={styles.fieldset}>
            <legend>Select GRC analysts</legend>
            <div className={styles.analystList}>
              {analysts.map((analyst) => (
                <label key={analyst.id} className={styles.analyst}>
                  <input
                    type="checkbox"
                    checked={selected.includes(analyst.id)}
                    onChange={() => toggle(analyst.id)}
                  />
                  <span className={styles.avatar} aria-hidden>
                    {analyst.initials}
                  </span>
                  <span>
                    <strong>{analyst.name}</strong>
                    <em>
                      {analyst.role} · {analyst.department}
                    </em>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className={styles.field}>
            <span>Collaboration type</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as CollaborationType)
              }
            >
              {TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Collaboration message</span>
            <textarea
              rows={4}
              maxLength={500}
              value={message}
              placeholder="Describe what help you need…"
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            <Users size={16} aria-hidden />
            Send collaboration request
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

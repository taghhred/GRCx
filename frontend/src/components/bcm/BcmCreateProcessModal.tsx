import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../common/Button";
import type {
  BcmBusinessImpact,
  BcmCriticality,
  BcmProcessStatus,
  CriticalBusinessProcess,
} from "../../mocks/types/bcm";
import { bcmBuildNew } from "../../services/excel/adapters/bcmAdapters";
import styles from "./BcmCreateProcessModal.module.css";

interface BcmCreateProcessModalProps {
  open: boolean;
  existingIds: Set<string>;
  onClose: () => void;
  onCreate: (process: CriticalBusinessProcess) => void;
}

const CRITICALITY: BcmCriticality[] = ["Critical", "High", "Medium", "Low"];
const IMPACT: BcmBusinessImpact[] = ["Severe", "Major", "Moderate", "Minor"];
const STATUS: BcmProcessStatus[] = ["Ready", "Testing", "At Risk", "Draft", "Review"];
const STRATEGIES = [
  "Failover",
  "Active-Standby",
  "Replication",
  "Restore Backup",
  "HA Cluster",
  "Secondary Site",
  "Manual Workaround",
];

export default function BcmCreateProcessModal({
  open,
  existingIds,
  onClose,
  onCreate,
}: BcmCreateProcessModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    businessUnit: "",
    department: "",
    owner: "",
    criticality: "High" as BcmCriticality,
    businessImpact: "Major" as BcmBusinessImpact,
    rto: "",
    rpo: "",
    mao: "",
    recoveryStrategy: "Failover",
    recoveryTeam: "",
    status: "Draft" as BcmProcessStatus,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const id = form.id.trim();
    if (!id || !form.name.trim() || !form.department.trim()) {
      setError("Process ID, Business Process, and Department are required.");
      return;
    }
    if (existingIds.has(id)) {
      setError("Process ID already exists. Duplicate IDs are not allowed.");
      return;
    }
    const process = bcmBuildNew({
      id,
      name: form.name.trim(),
      businessUnit: form.businessUnit.trim(),
      department: form.department.trim(),
      owner: form.owner.trim() || "Unassigned",
      criticality: form.criticality,
      businessImpact: form.businessImpact,
      rto: form.rto.trim(),
      rpo: form.rpo.trim(),
      mao: form.mao.trim(),
      recoveryStrategy: form.recoveryStrategy,
      recoveryTeam: form.recoveryTeam.trim() || "Unassigned",
      status: form.status,
      version: "1.0",
      lastTest: "",
      nextTest: "",
      nextReview: "",
      dependencies: "",
      riskLevel: form.criticality,
    });
    onCreate(process);
    onClose();
  };

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id={titleId}>Create Business Process</h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close create process dialog"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <form className={styles.body} onSubmit={submit}>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.grid}>
            <label>
              Process ID *
              <input value={form.id} onChange={set("id")} maxLength={64} required />
            </label>
            <label>
              Business Process *
              <input value={form.name} onChange={set("name")} maxLength={160} required />
            </label>
            <label>
              Business Unit
              <input value={form.businessUnit} onChange={set("businessUnit")} maxLength={80} />
            </label>
            <label>
              Department *
              <input
                value={form.department}
                onChange={set("department")}
                maxLength={80}
                required
              />
            </label>
            <label>
              Owner
              <input value={form.owner} onChange={set("owner")} maxLength={80} />
            </label>
            <label>
              Recovery Team
              <input
                value={form.recoveryTeam}
                onChange={set("recoveryTeam")}
                maxLength={80}
              />
            </label>
            <label>
              Criticality
              <select value={form.criticality} onChange={set("criticality")}>
                {CRITICALITY.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Business Impact
              <select value={form.businessImpact} onChange={set("businessImpact")}>
                {IMPACT.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              RTO
              <input value={form.rto} onChange={set("rto")} placeholder="e.g. 2 hrs" />
            </label>
            <label>
              RPO
              <input value={form.rpo} onChange={set("rpo")} placeholder="e.g. 30 min" />
            </label>
            <label>
              MAO
              <input value={form.mao} onChange={set("mao")} placeholder="e.g. 4 hrs" />
            </label>
            <label>
              Recovery Strategy
              <select value={form.recoveryStrategy} onChange={set("recoveryStrategy")}>
                {STRATEGIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={set("status")}>
                {STATUS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <footer className={styles.footer}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Process
            </Button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}

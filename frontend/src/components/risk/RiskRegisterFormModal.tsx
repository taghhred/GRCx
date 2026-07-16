import { useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { RiskRegisterItem } from "../../mocks/types/riskRegister";
import {
  RISK_LEVELS,
  RISK_STATUSES,
  RISK_TREATMENTS,
} from "../../mocks/types/riskRegister";
import styles from "./RiskRegisterFormModal.module.css";

export interface RiskFormValues {
  riskId: string;
  title: string;
  category: string;
  affectedAsset: string;
  businessUnit: string;
  department: string;
  vendor: string;
  owner: string;
  description: string;
  inherentLikelihood: number | null;
  inherentImpact: number | null;
  inherentLevel: string;
  treatment: string;
  plannedControls: string;
  framework: string;
  frameworkControlRef: string;
  residualLikelihood: number | null;
  residualImpact: number | null;
  residualLevel: string;
  status: string;
  dateIdentified: string;
  nextReviewDate: string;
  notes: string;
}

interface RiskRegisterFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initial: RiskFormValues | null;
  risks: RiskRegisterItem[];
  onCancel: () => void;
  onSave: (values: RiskFormValues, closeAfter: boolean) => Promise<void>;
}

const LEVEL_SCALE = [1, 2, 3, 4, 5];

function levelFromScore(score: number | null): string {
  if (score == null) return "Medium";
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

function emptyValues(): RiskFormValues {
  const now = new Date().toISOString().slice(0, 10);
  return {
    riskId: `RISK-${Date.now().toString(36).toUpperCase()}`,
    title: "",
    category: "General",
    affectedAsset: "",
    businessUnit: "",
    department: "",
    vendor: "",
    owner: "",
    description: "",
    inherentLikelihood: null,
    inherentImpact: null,
    inherentLevel: "Medium",
    treatment: "Mitigate",
    plannedControls: "",
    framework: "",
    frameworkControlRef: "",
    residualLikelihood: null,
    residualImpact: null,
    residualLevel: "Medium",
    status: "Open",
    dateIdentified: now,
    nextReviewDate: "",
    notes: "",
  };
}

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort();
}

export default function RiskRegisterFormModal({
  open,
  mode,
  initial,
  risks,
  onCancel,
  onSave,
}: RiskRegisterFormModalProps) {
  const titleId = useId();
  const [values, setValues] = useState<RiskFormValues>(() => initial ?? emptyValues());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields whenever the modal opens
      setValues(initial ?? emptyValues());
      setError(null);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  const suggestions = useMemo(
    () => ({
      departments: uniqueSorted(risks.map((r) => r.department)),
      businessUnits: uniqueSorted(risks.map((r) => r.businessUnit)),
      vendors: uniqueSorted(risks.map((r) => r.vendor)),
      categories: uniqueSorted(risks.map((r) => r.category)),
      owners: uniqueSorted(risks.map((r) => r.owner)),
      frameworks: uniqueSorted(risks.map((r) => r.framework)),
    }),
    [risks]
  );

  if (!open) return null;

  const inherentScore =
    values.inherentLikelihood != null && values.inherentImpact != null
      ? values.inherentLikelihood * values.inherentImpact
      : null;
  const residualScore =
    values.residualLikelihood != null && values.residualImpact != null
      ? values.residualLikelihood * values.residualImpact
      : null;

  function update<K extends keyof RiskFormValues>(key: K, value: RiskFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateLikelihoodImpact(
    kind: "inherent" | "residual",
    field: "likelihood" | "impact",
    raw: string
  ) {
    const num = raw === "" ? null : Number(raw);
    setValues((prev) => {
      const next = { ...prev };
      if (kind === "inherent") {
        if (field === "likelihood") next.inherentLikelihood = num;
        else next.inherentImpact = num;
        const score =
          next.inherentLikelihood != null && next.inherentImpact != null
            ? next.inherentLikelihood * next.inherentImpact
            : null;
        next.inherentLevel = levelFromScore(score);
      } else {
        if (field === "likelihood") next.residualLikelihood = num;
        else next.residualImpact = num;
        const score =
          next.residualLikelihood != null && next.residualImpact != null
            ? next.residualLikelihood * next.residualImpact
            : null;
        next.residualLevel = levelFromScore(score);
      }
      return next;
    });
  }

  async function handleSubmit(closeAfter: boolean) {
    if (!values.riskId.trim() || !values.title.trim()) {
      setError("Risk ID and Title are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(values, closeAfter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save risk.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id={titleId}>{mode === "create" ? "New Risk" : `Edit ${values.riskId}`}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={onCancel}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <section className={styles.section}>
            <h3>General</h3>
            <div className={styles.grid}>
              <label>
                <span>Risk ID *</span>
                <input
                  value={values.riskId}
                  disabled={mode === "edit"}
                  onChange={(e) => update("riskId", e.target.value)}
                />
              </label>
              <label>
                <span>Title *</span>
                <input
                  value={values.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label>
                <span>Category</span>
                <input
                  list="risk-form-categories"
                  value={values.category}
                  onChange={(e) => update("category", e.target.value)}
                />
                <datalist id="risk-form-categories">
                  {suggestions.categories.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Affected Asset</span>
                <input
                  value={values.affectedAsset}
                  onChange={(e) => update("affectedAsset", e.target.value)}
                />
              </label>
              <label>
                <span>Business Unit</span>
                <input
                  list="risk-form-bu"
                  value={values.businessUnit}
                  onChange={(e) => update("businessUnit", e.target.value)}
                />
                <datalist id="risk-form-bu">
                  {suggestions.businessUnits.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Department</span>
                <input
                  list="risk-form-dept"
                  value={values.department}
                  onChange={(e) => update("department", e.target.value)}
                />
                <datalist id="risk-form-dept">
                  {suggestions.departments.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Vendor</span>
                <input
                  list="risk-form-vendor"
                  value={values.vendor}
                  onChange={(e) => update("vendor", e.target.value)}
                />
                <datalist id="risk-form-vendor">
                  {suggestions.vendors.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Owner</span>
                <input
                  list="risk-form-owner"
                  value={values.owner}
                  onChange={(e) => update("owner", e.target.value)}
                />
                <datalist id="risk-form-owner">
                  {suggestions.owners.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Status</span>
                <select value={values.status} onChange={(e) => update("status", e.target.value)}>
                  {RISK_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Description</h3>
            <label className={styles.fullWidth}>
              <span>Risk Scenario / Description</span>
              <textarea
                rows={3}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
          </section>

          <section className={styles.section}>
            <h3>Likelihood / Impact / Score</h3>
            <div className={styles.scoreGrid}>
              <div className={styles.scoreColumn}>
                <p className={styles.columnLabel}>Inherent</p>
                <label>
                  <span>Likelihood (1-5)</span>
                  <select
                    value={values.inherentLikelihood ?? ""}
                    onChange={(e) =>
                      updateLikelihoodImpact("inherent", "likelihood", e.target.value)
                    }
                  >
                    <option value="">—</option>
                    {LEVEL_SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Impact (1-5)</span>
                  <select
                    value={values.inherentImpact ?? ""}
                    onChange={(e) =>
                      updateLikelihoodImpact("inherent", "impact", e.target.value)
                    }
                  >
                    <option value="">—</option>
                    {LEVEL_SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Level</span>
                  <select
                    value={values.inherentLevel}
                    onChange={(e) => update("inherentLevel", e.target.value)}
                  >
                    {RISK_LEVELS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.scoreDisplay}>Score: {inherentScore ?? "—"}</p>
              </div>
              <div className={styles.scoreColumn}>
                <p className={styles.columnLabel}>Residual</p>
                <label>
                  <span>Likelihood (1-5)</span>
                  <select
                    value={values.residualLikelihood ?? ""}
                    onChange={(e) =>
                      updateLikelihoodImpact("residual", "likelihood", e.target.value)
                    }
                  >
                    <option value="">—</option>
                    {LEVEL_SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Impact (1-5)</span>
                  <select
                    value={values.residualImpact ?? ""}
                    onChange={(e) =>
                      updateLikelihoodImpact("residual", "impact", e.target.value)
                    }
                  >
                    <option value="">—</option>
                    {LEVEL_SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Level</span>
                  <select
                    value={values.residualLevel}
                    onChange={(e) => update("residualLevel", e.target.value)}
                  >
                    {RISK_LEVELS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.scoreDisplay}>Score: {residualScore ?? "—"}</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Treatment &amp; Controls</h3>
            <div className={styles.grid}>
              <label>
                <span>Treatment Decision</span>
                <select
                  value={values.treatment}
                  onChange={(e) => update("treatment", e.target.value)}
                >
                  {RISK_TREATMENTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Framework</span>
                <input
                  list="risk-form-framework"
                  value={values.framework}
                  onChange={(e) => update("framework", e.target.value)}
                />
                <datalist id="risk-form-framework">
                  {suggestions.frameworks.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Framework Control Reference</span>
                <input
                  value={values.frameworkControlRef}
                  onChange={(e) => update("frameworkControlRef", e.target.value)}
                />
              </label>
            </div>
            <label className={styles.fullWidth}>
              <span>Planned Controls</span>
              <textarea
                rows={2}
                value={values.plannedControls}
                onChange={(e) => update("plannedControls", e.target.value)}
              />
            </label>
          </section>

          <section className={styles.section}>
            <h3>Review</h3>
            <div className={styles.grid}>
              <label>
                <span>Date Identified</span>
                <input
                  type="date"
                  value={values.dateIdentified}
                  onChange={(e) => update("dateIdentified", e.target.value)}
                />
              </label>
              <label>
                <span>Next Review Date</span>
                <input
                  type="date"
                  value={values.nextReviewDate}
                  onChange={(e) => update("nextReviewDate", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Notes</h3>
            <label className={styles.fullWidth}>
              <span>Additional Notes</span>
              <textarea
                rows={2}
                value={values.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            Save
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => handleSubmit(true)}
            disabled={saving}
          >
            Save &amp; Close
          </button>
        </footer>
      </div>
    </div>
  );
}

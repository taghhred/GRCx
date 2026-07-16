import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useRiskModule } from "../../../services/risk/RiskModuleContext";
import {
  FRAMEWORK_CONTROLS,
  RISK_ASSETS,
  THREAT_LIBRARY,
  VULNERABILITY_LIBRARY,
} from "../../../mocks/data/riskCatalogs";
import { RISK_STATUSES, RISK_TREATMENTS } from "../../../mocks/types/riskRegister";
import type { RiskRegisterItem } from "../../../mocks/types/riskRegister";
import Button from "../../common/Button";
import SeverityBadge from "../../ui/SeverityBadge";
import { asSeverity, levelFromScoreWizard, uniqueSorted } from "./riskSectionUtils";
import styles from "../../../pages/Risk/RiskAssessment.module.css";

const STEP_LABELS = [
  "General",
  "Scope",
  "Assets",
  "Threat",
  "Vulnerabilities",
  "Existing Controls",
  "Likelihood",
  "Impact",
  "Auto Calculation",
  "Treatment",
  "Residual Risk",
  "Approval",
] as const;

const SCALE = [1, 2, 3, 4, 5] as const;
const DRAFT_KEY = "grcx.risk.wizard.draft";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateRiskId(): string {
  return `RISK-${Date.now().toString(36).toUpperCase()}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function RiskWizardSection() {
  const navigate = useNavigate();
  const { saveRisk, setSelectedRiskId } = useRiskModule();

  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [riskId] = useState(generateRiskId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState<"idle" | "saving" | "saved">("idle");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [businessUnit, setBusinessUnit] = useState("");
  const [department, setDepartment] = useState("");
  const [vendor, setVendor] = useState("");
  const [owner, setOwner] = useState("");

  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [threatSearch, setThreatSearch] = useState("");
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);

  const [vulnSearch, setVulnSearch] = useState("");
  const [selectedVulnIds, setSelectedVulnIds] = useState<string[]>([]);

  const [controlSearch, setControlSearch] = useState("");
  const [selectedControlIds, setSelectedControlIds] = useState<string[]>([]);

  const [inherentLikelihood, setInherentLikelihood] = useState<number | null>(null);
  const [inherentImpact, setInherentImpact] = useState<number | null>(null);

  const [treatment, setTreatment] = useState("");
  const [plannedControls, setPlannedControls] = useState("");

  const [residualLikelihood, setResidualLikelihood] = useState<number | null>(null);
  const [residualImpact, setResidualImpact] = useState<number | null>(null);
  const [dateIdentified, setDateIdentified] = useState(today);
  const [nextReviewDate, setNextReviewDate] = useState("");

  const [status, setStatus] = useState("Pending Approval");

  const selectedAsset = useMemo(
    () => RISK_ASSETS.find((a) => a.id === selectedAssetId) ?? null,
    [selectedAssetId]
  );
  const selectedThreat = useMemo(
    () => THREAT_LIBRARY.find((t) => t.id === selectedThreatId) ?? null,
    [selectedThreatId]
  );
  const selectedVulnerabilities = useMemo(
    () => VULNERABILITY_LIBRARY.filter((v) => selectedVulnIds.includes(v.id)),
    [selectedVulnIds]
  );
  const selectedControls = useMemo(
    () => FRAMEWORK_CONTROLS.filter((c) => selectedControlIds.includes(c.id)),
    [selectedControlIds]
  );

  const inherentScore =
    inherentLikelihood != null && inherentImpact != null ? inherentLikelihood * inherentImpact : null;
  const inherentLevel = levelFromScoreWizard(inherentScore);

  const residualScore =
    residualLikelihood != null && residualImpact != null ? residualLikelihood * residualImpact : null;
  const residualLevel = levelFromScoreWizard(residualScore);

  const completionPercent = useMemo(() => {
    let completedSteps = 0;
    for (let i = 0; i < STEP_LABELS.length; i++) {
      if (isStepValidInternal(i)) completedSteps += 1;
    }
    return Math.round((completedSteps / STEP_LABELS.length) * 100);

    function isStepValidInternal(index: number): boolean {
      switch (index) {
        case 0:
          return title.trim().length > 0 && category.trim().length > 0;
        case 1:
          return businessUnit.trim().length > 0 && department.trim().length > 0 && owner.trim().length > 0;
        case 2:
          return selectedAsset != null;
        case 3:
          return selectedThreat != null;
        case 4:
          return selectedVulnerabilities.length > 0;
        case 5:
          return true;
        case 6:
          return inherentLikelihood != null;
        case 7:
          return inherentImpact != null;
        case 8:
          return inherentScore != null;
        case 9:
          return treatment.trim().length > 0;
        case 10:
          return residualLikelihood != null && residualImpact != null && nextReviewDate.trim().length > 0;
        case 11:
          return status.trim().length > 0;
        default:
          return false;
      }
    }
  }, [
    title,
    category,
    businessUnit,
    department,
    owner,
    selectedAsset,
    selectedThreat,
    selectedVulnerabilities,
    inherentLikelihood,
    inherentImpact,
    inherentScore,
    treatment,
    residualLikelihood,
    residualImpact,
    nextReviewDate,
    status,
  ]);

  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    if (!q) return RISK_ASSETS;
    return RISK_ASSETS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.businessService.toLowerCase().includes(q)
    );
  }, [assetSearch]);

  const filteredThreats = useMemo(() => {
    const q = threatSearch.trim().toLowerCase();
    if (!q) return THREAT_LIBRARY;
    return THREAT_LIBRARY.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [threatSearch]);

  const filteredVulns = useMemo(() => {
    const q = vulnSearch.trim().toLowerCase();
    if (!q) return VULNERABILITY_LIBRARY;
    return VULNERABILITY_LIBRARY.filter(
      (v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)
    );
  }, [vulnSearch]);

  const filteredControls = useMemo(() => {
    const q = controlSearch.trim().toLowerCase();
    if (!q) return FRAMEWORK_CONTROLS;
    return FRAMEWORK_CONTROLS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.framework.toLowerCase().includes(q) ||
        c.controlId.toLowerCase().includes(q)
    );
  }, [controlSearch]);

  function isStepValid(index: number): boolean {
    switch (index) {
      case 0:
        return title.trim().length > 0 && category.trim().length > 0;
      case 1:
        return businessUnit.trim().length > 0 && department.trim().length > 0 && owner.trim().length > 0;
      case 2:
        return selectedAsset != null;
      case 3:
        return selectedThreat != null;
      case 4:
        return selectedVulnerabilities.length > 0;
      case 5:
        return true;
      case 6:
        return inherentLikelihood != null;
      case 7:
        return inherentImpact != null;
      case 8:
        return true;
      case 9:
        return treatment.trim().length > 0;
      case 10:
        return residualLikelihood != null && residualImpact != null && nextReviewDate.trim().length > 0;
      case 11:
        return status.trim().length > 0;
      default:
        return false;
    }
  }

  const persistDraft = useCallback(() => {
    const payload = {
      riskId,
      step,
      maxStepReached,
      title,
      category,
      description,
      businessUnit,
      department,
      vendor,
      owner,
      selectedAssetId,
      selectedThreatId,
      selectedVulnIds,
      selectedControlIds,
      inherentLikelihood,
      inherentImpact,
      treatment,
      plannedControls,
      residualLikelihood,
      residualImpact,
      dateIdentified,
      nextReviewDate,
      status,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setDraftSavedAt(payload.savedAt);
      setSaveFlash("saved");
    } catch {
      /* ignore quota */
    }
  }, [
    riskId,
    step,
    maxStepReached,
    title,
    category,
    description,
    businessUnit,
    department,
    vendor,
    owner,
    selectedAssetId,
    selectedThreatId,
    selectedVulnIds,
    selectedControlIds,
    inherentLikelihood,
    inherentImpact,
    treatment,
    plannedControls,
    residualLikelihood,
    residualImpact,
    dateIdentified,
    nextReviewDate,
    status,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSaveFlash("saving");
      persistDraft();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [persistDraft]);

  function goToStep(index: number) {
    if (index <= maxStepReached) setStep(index);
  }

  function handleNext() {
    if (!isStepValid(step)) return;
    const next = Math.min(step + 1, STEP_LABELS.length - 1);
    setStep(next);
    setMaxStepReached((m) => Math.max(m, next));
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleSaveDraft() {
    setSaveFlash("saving");
    persistDraft();
  }

  function toggleVuln(id: string) {
    setSelectedVulnIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function toggleControl(id: string) {
    setSelectedControlIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function prefillPlannedControls() {
    setPlannedControls(
      selectedControls.length > 0
        ? selectedControls.map((c) => `${c.framework} ${c.controlId} — ${c.name}`).join("; ")
        : ""
    );
  }

  async function handleApprove() {
    if (!isStepValid(11)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const composedDescription = [
        description.trim(),
        selectedThreat ? `Threat scenario: ${selectedThreat.name} — ${selectedThreat.description}` : "",
        selectedVulnerabilities.length > 0
          ? `Vulnerabilities exploited: ${selectedVulnerabilities.map((v) => v.name).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const composedNotes =
        selectedControls.length > 0
          ? `Existing controls reviewed: ${selectedControls
              .map((c) => `${c.framework} ${c.controlId} — ${c.name} (${c.status})`)
              .join("; ")}`
          : "";

      const payload: Partial<RiskRegisterItem> & { riskId: string; title: string } = {
        riskId,
        title: title.trim(),
        category: category.trim() || "General",
        affectedAsset: selectedAsset?.name ?? "",
        businessUnit: businessUnit.trim(),
        department: department.trim(),
        vendor: vendor.trim(),
        owner: owner.trim() || "Unassigned",
        description: composedDescription,
        inherentLikelihood,
        inherentImpact,
        inherentScore,
        inherentLevel,
        treatment,
        plannedControls,
        framework: uniqueSorted(selectedControls.map((c) => c.framework)).join(", "),
        frameworkControlRef: selectedControls.map((c) => c.controlId).join(", "),
        residualLikelihood,
        residualImpact,
        residualScore,
        residualLevel,
        status,
        dateIdentified,
        nextReviewDate,
        notes: composedNotes,
      };

      await saveRisk(payload, "create");
      setSelectedRiskId(riskId);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      navigate("/risk/register");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create the risk.");
    } finally {
      setSubmitting(false);
    }
  }

  const canProceed = isStepValid(step);
  const isLastStep = step === STEP_LABELS.length - 1;
  const fieldError = !canProceed ? "Complete the required fields on this step to continue." : null;

  const controlsForUi = filteredControls;

  return (
    <div className={styles.wizardPage}>
      <header className={styles.wizardStickyHeader}>
        <div className={styles.wizardHeaderText}>
          <h1 className={styles.wizardPageTitle}>Risk Assessment</h1>
          <p className={styles.wizardPageDesc}>
            Create a structured risk assessment with scored likelihood, impact, treatment, and residual risk.
          </p>
        </div>
        <div className={styles.wizardHeaderMeta}>
          <div className={styles.wizardMetaBlock}>
            <span className={styles.wizardMetaLabel}>Current step</span>
            <span className={styles.wizardMetaValue}>
              {step + 1}/{STEP_LABELS.length} · {STEP_LABELS[step]}
            </span>
          </div>
          <div className={styles.wizardMetaBlock}>
            <span className={styles.wizardMetaLabel}>Save status</span>
            <span className={styles.wizardMetaValue} aria-live="polite">
              {saveFlash === "saving" ? "Saving draft…" : draftSavedAt ? `Draft saved ${formatTime(draftSavedAt)}` : "Not saved"}
            </span>
          </div>
        </div>
      </header>

      <nav className={styles.progressStepper} aria-label="Assessment progress">
        <ol className={styles.progressList}>
          {STEP_LABELS.map((label, index) => {
            const done = index < step;
            const current = index === step;
            const reachable = index <= maxStepReached;
            return (
              <li key={label} className={styles.progressItem}>
                <button
                  type="button"
                  className={`${styles.progressBtn} ${done ? styles.progressDone : ""} ${
                    current ? styles.progressCurrent : ""
                  } ${!done && !current ? styles.progressUpcoming : ""}`}
                  onClick={() => goToStep(index)}
                  disabled={!reachable}
                  aria-current={current ? "step" : undefined}
                  aria-label={`${label}${done ? ", completed" : current ? ", current" : ""}`}
                >
                  <span className={styles.progressDot} aria-hidden>
                    {done ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className={styles.progressLabel}>{label}</span>
                </button>
                {index < STEP_LABELS.length - 1 ? <span className={styles.progressConnector} aria-hidden /> : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className={styles.wizardBody}>
        <div className={styles.wizardMain}>
          <div className={`${styles.wizardCard} ${styles.wizardCardEnter}`} key={step}>
            <h2 className={styles.wizardCardTitle}>{STEP_LABELS[step]}</h2>
            <p className={styles.wizardCardSub}>Risk ID: {riskId}</p>

            {step === 0 ? (
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Risk Title *</span>
                  <input
                    className={styles.control}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Unauthorized access to customer data"
                    aria-required
                  />
                  <span className={styles.helperText}>Concise name used across register, reports, and heat maps.</span>
                  {!title.trim() ? <span className={styles.validationMsg}>Title is required.</span> : null}
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Category *</span>
                  <input
                    className={styles.control}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Cybersecurity, Operational, Third Party"
                    aria-required
                  />
                  <span className={styles.helperText}>Aligns reporting by risk domain.</span>
                  {!category.trim() ? <span className={styles.validationMsg}>Category is required.</span> : null}
                </label>
                <label className={`${styles.field} ${styles.formFull}`}>
                  <span className={styles.fieldLabel}>Risk Scenario / Description</span>
                  <textarea
                    className={styles.control}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the scenario, context, and potential business impact…"
                  />
                  <span className={styles.helperText}>Optional narrative that becomes part of the risk record.</span>
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Business Unit *</span>
                  <input
                    className={styles.control}
                    value={businessUnit}
                    onChange={(e) => setBusinessUnit(e.target.value)}
                    placeholder="e.g. Corporate IT"
                    aria-required
                  />
                  <span className={styles.helperText}>Owning organizational unit.</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Department *</span>
                  <input
                    className={styles.control}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Security Operations"
                    aria-required
                  />
                  <span className={styles.helperText}>Sub-unit responsible for day-to-day oversight.</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Vendor / Third Party</span>
                  <input
                    className={styles.control}
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Optional vendor name"
                  />
                  <span className={styles.helperText}>Leave blank if this is an internal risk.</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Risk Owner *</span>
                  <input
                    className={styles.control}
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Accountable person"
                    aria-required
                  />
                  <span className={styles.helperText}>Primary accountable owner for treatment.</span>
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.pickerWrap}>
                <div className={styles.pickerSearchRow}>
                  <Search size={16} aria-hidden />
                  <input
                    className={styles.control}
                    placeholder="Search assets by name, type, or business service…"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    aria-label="Search assets"
                  />
                </div>
                {selectedAsset ? (
                  <div className={styles.selectedTagRow}>
                    <span className={styles.selectedTag}>
                      {selectedAsset.name}
                      <button type="button" className={styles.chipClear} onClick={() => setSelectedAssetId(null)} aria-label="Clear asset">
                        <X size={12} aria-hidden />
                      </button>
                    </span>
                  </div>
                ) : (
                  <span className={styles.helperText}>Select one primary affected asset.</span>
                )}
                <div className={styles.pickerList} role="listbox" aria-label="Assets">
                  {filteredAssets.length === 0 ? (
                    <p className={styles.pickerEmpty}>No matching assets.</p>
                  ) : (
                    filteredAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        role="option"
                        aria-selected={asset.id === selectedAssetId}
                        className={`${styles.pickerItem} ${asset.id === selectedAssetId ? styles.pickerItemActive : ""}`}
                        onClick={() => setSelectedAssetId(asset.id)}
                      >
                        <span className={styles.pickerItemTitle}>{asset.name}</span>
                        <span className={styles.pickerItemMeta}>
                          {asset.type} · {asset.businessService} · Criticality: {asset.criticality} · Owner:{" "}
                          {asset.owner}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.pickerWrap}>
                <div className={styles.pickerSearchRow}>
                  <Search size={16} aria-hidden />
                  <input
                    className={styles.control}
                    placeholder="Search threats by name or category…"
                    value={threatSearch}
                    onChange={(e) => setThreatSearch(e.target.value)}
                    aria-label="Search threats"
                  />
                </div>
                {selectedThreat ? (
                  <div className={styles.selectedTagRow}>
                    <span className={styles.selectedTag}>
                      {selectedThreat.name}
                      <button type="button" className={styles.chipClear} onClick={() => setSelectedThreatId(null)} aria-label="Clear threat">
                        <X size={12} aria-hidden />
                      </button>
                    </span>
                  </div>
                ) : (
                  <span className={styles.helperText}>Select the primary threat scenario.</span>
                )}
                <div className={styles.pickerList} role="listbox" aria-label="Threats">
                  {filteredThreats.length === 0 ? (
                    <p className={styles.pickerEmpty}>No matching threats.</p>
                  ) : (
                    filteredThreats.map((threat) => (
                      <button
                        key={threat.id}
                        type="button"
                        role="option"
                        aria-selected={threat.id === selectedThreatId}
                        className={`${styles.pickerItem} ${threat.id === selectedThreatId ? styles.pickerItemActive : ""}`}
                        onClick={() => setSelectedThreatId(threat.id)}
                      >
                        <span className={styles.pickerItemTitle}>{threat.name}</span>
                        <span className={styles.pickerItemMeta}>
                          {threat.category} · {threat.description}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className={styles.pickerWrap}>
                <div className={styles.pickerSearchRow}>
                  <Search size={16} aria-hidden />
                  <input
                    className={styles.control}
                    placeholder="Search vulnerabilities by name or category…"
                    value={vulnSearch}
                    onChange={(e) => setVulnSearch(e.target.value)}
                    aria-label="Search vulnerabilities"
                  />
                </div>
                {selectedVulnerabilities.length > 0 ? (
                  <div className={styles.selectedTagRow}>
                    {selectedVulnerabilities.map((v) => (
                      <span key={v.id} className={styles.selectedTag}>
                        {v.name}
                        <button type="button" className={styles.chipClear} onClick={() => toggleVuln(v.id)} aria-label={`Remove ${v.name}`}>
                          <X size={12} aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.helperText}>Select one or more applicable vulnerabilities.</span>
                )}
                <div className={styles.pickerList} role="listbox" aria-label="Vulnerabilities" aria-multiselectable>
                  {filteredVulns.length === 0 ? (
                    <p className={styles.pickerEmpty}>No matching vulnerabilities.</p>
                  ) : (
                    filteredVulns.map((vuln) => (
                      <button
                        key={vuln.id}
                        type="button"
                        role="option"
                        aria-selected={selectedVulnIds.includes(vuln.id)}
                        className={`${styles.pickerItem} ${
                          selectedVulnIds.includes(vuln.id) ? styles.pickerItemActive : ""
                        }`}
                        onClick={() => toggleVuln(vuln.id)}
                      >
                        <span className={styles.pickerItemTitle}>{vuln.name}</span>
                        <span className={styles.pickerItemMeta}>
                          {vuln.category} · {vuln.description}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className={styles.pickerWrap}>
                <div className={styles.pickerSearchRow}>
                  <Search size={16} aria-hidden />
                  <input
                    className={styles.control}
                    placeholder="Search existing controls by framework, control ID, or name…"
                    value={controlSearch}
                    onChange={(e) => setControlSearch(e.target.value)}
                    aria-label="Search controls"
                  />
                </div>
                <span className={styles.helperText}>Optional — review controls already in place.</span>
                {selectedControls.length > 0 ? (
                  <div className={styles.selectedTagRow}>
                    {selectedControls.map((c) => (
                      <span key={c.id} className={styles.selectedTag}>
                        {c.framework} {c.controlId}
                        <button type="button" className={styles.chipClear} onClick={() => toggleControl(c.id)} aria-label={`Remove ${c.controlId}`}>
                          <X size={12} aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className={styles.pickerList} role="listbox" aria-label="Existing controls" aria-multiselectable>
                  {controlsForUi.length === 0 ? (
                    <p className={styles.pickerEmpty}>No matching controls.</p>
                  ) : (
                    controlsForUi.map((control) => (
                      <button
                        key={control.id}
                        type="button"
                        role="option"
                        aria-selected={selectedControlIds.includes(control.id)}
                        className={`${styles.pickerItem} ${
                          selectedControlIds.includes(control.id) ? styles.pickerItemActive : ""
                        }`}
                        onClick={() => toggleControl(control.id)}
                      >
                        <span className={styles.pickerItemTitle}>
                          {control.framework} {control.controlId} — {control.name}
                        </span>
                        <span className={styles.pickerItemMeta}>
                          Status: {control.status} · Effectiveness: {control.effectivenessPercent}% · Owner:{" "}
                          {control.owner}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {step === 6 ? (
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Inherent Likelihood (1–5) *</span>
                  <select
                    className={styles.control}
                    value={inherentLikelihood ?? ""}
                    onChange={(e) => setInherentLikelihood(e.target.value === "" ? null : Number(e.target.value))}
                    aria-required
                  >
                    <option value="">Select likelihood…</option>
                    {SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className={styles.helperText}>Probability before applying new treatment.</span>
                </label>
                {selectedThreat ? (
                  <p className={styles.helperText} style={{ gridColumn: "1 / -1" }}>
                    Typical likelihood for {selectedThreat.name}: {selectedThreat.typicalLikelihood}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 7 ? (
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Inherent Impact (1–5) *</span>
                  <select
                    className={styles.control}
                    value={inherentImpact ?? ""}
                    onChange={(e) => setInherentImpact(e.target.value === "" ? null : Number(e.target.value))}
                    aria-required
                  >
                    <option value="">Select impact…</option>
                    {SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className={styles.helperText}>Business impact before treatment.</span>
                </label>
                {selectedVulnerabilities.length > 0 ? (
                  <p className={styles.helperText} style={{ gridColumn: "1 / -1" }}>
                    Typical impact from selected vulnerabilities:{" "}
                    {selectedVulnerabilities.map((v) => v.typicalImpact).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 8 ? (
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Likelihood</span>
                  <span className={styles.summaryValue}>{inherentLikelihood ?? "—"}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Impact</span>
                  <span className={styles.summaryValue}>{inherentImpact ?? "—"}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Inherent Score</span>
                  <span className={styles.summaryValue}>{inherentScore ?? "—"} / 25</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Inherent Level</span>
                  <SeverityBadge severity={asSeverity(inherentLevel)} />
                </div>
                <p className={styles.helperText} style={{ gridColumn: "1 / -1" }}>
                  Auto-calculated using score bands: 1–4 Low · 5–9 Medium · 10–15 High · 16–25 Critical.
                </p>
              </div>
            ) : null}

            {step === 9 ? (
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Treatment Decision *</span>
                  <select className={styles.control} value={treatment} onChange={(e) => setTreatment(e.target.value)} aria-required>
                    <option value="">Select treatment…</option>
                    {RISK_TREATMENTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className={styles.helperText}>Mitigate, transfer, accept, or avoid.</span>
                </label>
                <div />
                <label className={`${styles.field} ${styles.formFull}`}>
                  <span className={styles.fieldLabel}>Planned Controls</span>
                  <textarea
                    className={styles.control}
                    rows={3}
                    value={plannedControls}
                    onChange={(e) => setPlannedControls(e.target.value)}
                    placeholder="Document planned control activities…"
                  />
                  <span className={styles.helperText}>Controls you intend to implement as part of treatment.</span>
                </label>
                {selectedControls.length > 0 ? (
                  <div className={styles.formFull}>
                    <Button variant="ghost" onClick={prefillPlannedControls}>
                      Prefill from selected controls
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 10 ? (
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Residual Likelihood (1–5) *</span>
                  <select
                    className={styles.control}
                    value={residualLikelihood ?? ""}
                    onChange={(e) => setResidualLikelihood(e.target.value === "" ? null : Number(e.target.value))}
                    aria-required
                  >
                    <option value="">Select likelihood…</option>
                    {SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className={styles.helperText}>Likelihood after planned treatment.</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Residual Impact (1–5) *</span>
                  <select
                    className={styles.control}
                    value={residualImpact ?? ""}
                    onChange={(e) => setResidualImpact(e.target.value === "" ? null : Number(e.target.value))}
                    aria-required
                  >
                    <option value="">Select impact…</option>
                    {SCALE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className={styles.helperText}>Impact after planned treatment.</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Date Identified</span>
                  <input
                    type="date"
                    className={styles.control}
                    value={dateIdentified}
                    onChange={(e) => setDateIdentified(e.target.value)}
                  />
                  <span className={styles.helperText}>When this risk was first recorded.</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Next Review Date *</span>
                  <input
                    type="date"
                    className={styles.control}
                    value={nextReviewDate}
                    onChange={(e) => setNextReviewDate(e.target.value)}
                    aria-required
                  />
                  <span className={styles.helperText}>Scheduled residual review date.</span>
                </label>
                <div className={styles.formFull} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className={styles.summaryLabel}>Residual Score</span>
                  <span className={styles.summaryValue}>{residualScore ?? "—"} / 25</span>
                  <SeverityBadge severity={asSeverity(residualLevel)} />
                </div>
              </div>
            ) : null}

            {step === 11 ? (
              <>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Workflow Status *</span>
                    <select className={styles.control} value={status} onChange={(e) => setStatus(e.target.value)} aria-required>
                      {RISK_STATUSES.filter((s) => s !== "Archived").map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <span className={styles.helperText}>Initial workflow state after submission.</span>
                  </label>
                </div>

                <div className={styles.summaryGrid} style={{ marginTop: 16 }}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Risk</span>
                    <span className={styles.summaryValue}>
                      {riskId} — {title || "Untitled"}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Category</span>
                    <span className={styles.summaryValue}>{category || "—"}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Asset</span>
                    <span className={styles.summaryValue}>{selectedAsset?.name ?? "—"}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Threat</span>
                    <span className={styles.summaryValue}>{selectedThreat?.name ?? "—"}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Vulnerabilities</span>
                    <span className={styles.summaryValue}>
                      {selectedVulnerabilities.map((v) => v.name).join(", ") || "—"}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Business Unit / Department</span>
                    <span className={styles.summaryValue}>
                      {businessUnit || "—"} / {department || "—"}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Owner</span>
                    <span className={styles.summaryValue}>{owner || "—"}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Inherent</span>
                    <span className={styles.summaryValue}>
                      L{inherentLikelihood ?? "—"} × I{inherentImpact ?? "—"} = {inherentScore ?? "—"} (
                      {inherentLevel})
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Treatment</span>
                    <span className={styles.summaryValue}>{treatment || "—"}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Residual</span>
                    <span className={styles.summaryValue}>
                      L{residualLikelihood ?? "—"} × I{residualImpact ?? "—"} = {residualScore ?? "—"} (
                      {residualLevel})
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Next Review</span>
                    <span className={styles.summaryValue}>{nextReviewDate || "—"}</span>
                  </div>
                </div>

                {submitError ? <p className={styles.validationMsg}>{submitError}</p> : null}
              </>
            ) : null}

            {fieldError && !isLastStep ? <p className={styles.validationMsg}>{fieldError}</p> : null}
          </div>
        </div>

        <aside className={styles.wizardSummary} aria-label="Live assessment summary">
          <h2 className={styles.wizardSummaryTitle}>Live summary</h2>
          <dl className={styles.wizardSummaryList}>
            <div>
              <dt>Current risk score</dt>
              <dd>{residualScore ?? inherentScore ?? "—"}</dd>
            </div>
            <div>
              <dt>Likelihood</dt>
              <dd>{residualLikelihood ?? inherentLikelihood ?? "—"}</dd>
            </div>
            <div>
              <dt>Impact</dt>
              <dd>{residualImpact ?? inherentImpact ?? "—"}</dd>
            </div>
            <div>
              <dt>Calculated risk</dt>
              <dd>
                {inherentScore != null ? (
                  <>
                    {inherentScore} <SeverityBadge severity={asSeverity(inherentLevel)} />
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Residual risk</dt>
              <dd>
                {residualScore != null ? (
                  <>
                    {residualScore} <SeverityBadge severity={asSeverity(residualLevel)} />
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Treatment status</dt>
              <dd>{treatment || "Not set"}</dd>
            </div>
            <div>
              <dt>Completion</dt>
              <dd>
                <div className={styles.completionBar} role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${completionPercent}%` }} />
                </div>
                <span>{completionPercent}%</span>
              </dd>
            </div>
            <div>
              <dt>Draft saved</dt>
              <dd>{draftSavedAt ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Last auto save</dt>
              <dd>{formatTime(draftSavedAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <footer className={styles.wizardActionBar}>
        <div className={styles.wizardActionLeft}>
          <Button variant="secondary" onClick={handleSaveDraft}>
            Save Draft
          </Button>
        </div>
        <div className={styles.wizardActionCenter} aria-live="polite">
          {saveFlash === "saving" ? "Auto-saving…" : draftSavedAt ? `Last saved ${formatTime(draftSavedAt)}` : "Draft not saved yet"}
        </div>
        <div className={styles.wizardActionRight}>
          <Button variant="ghost" onClick={handleBack} disabled={step === 0}>
            <ChevronLeft size={16} aria-hidden />
            Back
          </Button>
          {isLastStep ? (
            <Button variant="primary" onClick={handleApprove} disabled={!canProceed || submitting}>
              <Check size={16} aria-hidden />
              {submitting ? "Submitting…" : "Submit Assessment"}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight size={16} aria-hidden />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

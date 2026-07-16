import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type {
  GenerationPhase,
  Report,
  ReportCategory,
  ReportDraftInput,
  ReportMetadata,
  ReportPeriod,
  ReportScope,
  ReportSectionId,
  ReportWatermark,
} from "../../mocks/types/reports";
import { aggregateReportContent } from "../../mocks/services/reportAggregation";
import {
  defaultWatermark,
  generateReport,
} from "../../mocks/services/reportService";
import Button from "../common/Button";
import ReportTypeSelector from "./ReportTypeSelector";
import ReportingPeriodSelector from "./ReportingPeriodSelector";
import { buildPeriodFromPreset } from "../../utils/reportPeriod";
import ReportScopeSelector from "./ReportScopeSelector";
import ReportContentsSelector from "./ReportContentsSelector";
import ReportMetadataForm from "./ReportMetadataForm";
import WatermarkSettings from "./WatermarkSettings";
import ReportPreview from "./ReportPreview";
import ReportGenerationProgress from "./ReportGenerationProgress";
import wizardStyles from "./WizardShared.module.css";
import styles from "./CreateReportWizard.module.css";

const EXECUTIVE_DEFAULT_SECTIONS: ReportSectionId[] = [
  "Executive Summary",
  "Compliance Overview",
  "Risk Overview",
  "Critical Violations",
  "Identity Risks",
  "Business Continuity Readiness",
  "Disaster Recovery Readiness",
  "Top Recommendations",
  "Charts",
  "Management Conclusion",
];

const DETAILED_DEFAULT_SECTIONS: ReportSectionId[] = [
  "Full Findings",
  "Asset Compliance Table",
  "Identity Monitoring Table",
  "Risk Cases",
  "Risk Assessment Calculations",
  "Evidence Register",
  "Control Mapping",
  "Remediation Plan",
  "BCM Details",
  "DR Details",
  "Activity Logs",
  "Auditor Notes",
  "Appendices",
];

const STEPS = [
  "Report Type",
  "Reporting Period",
  "Scope",
  "Report Contents",
  "Auditor and Metadata",
  "Watermark",
  "Preview",
  "Generate",
] as const;

interface CreateReportWizardProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (report: Report) => void;
}

function todayIso(): string {
  return "2026-07-14";
}

function defaultMetadata(category: ReportCategory): ReportMetadata {
  return {
    title:
      category === "Executive"
        ? "GRCx Monthly Executive Report"
        : "GRCx Detailed Compliance & Risk Report",
    description:
      category === "Executive"
        ? "Concise executive briefing across compliance, risk, and resilience."
        : "Comprehensive auditor pack with evidence, controls, and findings.",
    issueDate: todayIso(),
    auditorName: "Mohammed",
    auditorRole: "Internal Auditor",
    preparedBy: "GRCx Platform",
    approvedBy: "",
    organizationName: "GRCx Financial Group",
    classification: "Confidential",
  };
}

function defaultScope(): ReportScope {
  return {
    modules: [
      "Dashboard Overview",
      "Compliance",
      "Risk Assessment",
      "Identity & Access",
    ],
    frameworks: ["All Frameworks"],
    departments: ["All Departments"],
  };
}

export default function CreateReportWizard({
  open,
  onClose,
  onGenerated,
}: CreateReportWizardProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>(() =>
    buildPeriodFromPreset("Last 30 Days")
  );
  const [scope, setScope] = useState<ReportScope>(defaultScope);
  const [sections, setSections] = useState<ReportSectionId[]>([]);
  const [metadata, setMetadata] = useState<ReportMetadata>(() =>
    defaultMetadata("Executive")
  );
  const [watermark, setWatermark] = useState<ReportWatermark>(defaultWatermark);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GenerationPhase>("Preparing Data");
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, generating]);

  const draftPreview = useMemo((): Report | null => {
    if (!category) return null;
    const draft: ReportDraftInput = {
      category,
      period,
      scope,
      sections,
      metadata,
      watermark,
    };
    const content = aggregateReportContent(draft);
    return {
      id: "draft-preview",
      reportId: "RPT-DRAFT",
      name: metadata.title,
      category,
      reportType:
        category === "Executive" ? "Executive Report" : "Technical Report",
      reportingPeriod: period.label,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      issueDate: metadata.issueDate,
      createdAt: todayIso(),
      generatedBy: metadata.preparedBy,
      userPosition: metadata.auditorRole || "Analyst",
      department: metadata.department || "Enterprise GRC",
      organizationName: metadata.organizationName,
      generatedTime: "00:00:00",
      dayOfWeek: "Tuesday",
      version: "0.9-draft",
      auditor: metadata.auditorName,
      auditorRole: metadata.auditorRole,
      frameworks: scope.frameworks,
      status: "Draft",
      pages: content.pageCount,
      scope,
      sections,
      metadata,
      watermark,
      content,
      approvalStatus: "Draft",
      watermarkEnabled: watermark.enabled,
      classification: metadata.classification,
    };
  }, [category, period, scope, sections, metadata, watermark]);

  if (!open || typeof document === "undefined") return null;

  const validateStep = (): boolean => {
    if (step === 0 && !category) {
      setError("Select Executive or Detailed report type to continue.");
      return false;
    }
    if (step === 2 && scope.modules.length === 0) {
      setError("Select at least one module.");
      return false;
    }
    if (step === 3 && sections.length === 0) {
      setError("Select at least one report section.");
      return false;
    }
    if (step === 4) {
      if (!metadata.title.trim()) {
        setError("Report title is required.");
        return false;
      }
      if (!metadata.auditorName.trim()) {
        setError("Auditor name is required.");
        return false;
      }
      if (!metadata.issueDate) {
        setError("Issue date is required.");
        return false;
      }
    }
    if (
      step === 1 &&
      period.startDate &&
      period.endDate &&
      period.startDate > period.endDate
    ) {
      setError("Start date must be on or before end date.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleGenerate = async () => {
    if (!category) {
      setError("Select a report type before generating.");
      setStep(0);
      return;
    }
    setGenerating(true);
    setStep(7);
    setPhase("Preparing Data");
    setProgress(0);
    try {
      const report = await generateReport(
        {
          category,
          period,
          scope,
          sections,
          metadata,
          watermark,
        },
        (nextPhase, nextProgress) => {
          setPhase(nextPhase);
          setProgress(nextProgress);
        }
      );
      onGenerated(report);
      onClose();
    } catch {
      setError("Report generation failed in the local prototype.");
      setGenerating(false);
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!generating) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Create Report</p>
            <h2 id={titleId}>{STEPS[step]}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close create report wizard"
            disabled={generating}
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <ol className={styles.steps} aria-label="Wizard steps">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={`${styles.step} ${index === step ? styles.stepActive : ""} ${index < step ? styles.stepDone : ""}`}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        <div className={styles.body}>
          {step === 0 ? (
            <ReportTypeSelector
              value={category}
              onChange={(next) => {
                setCategory(next);
                setSections(
                  next === "Executive"
                    ? [...EXECUTIVE_DEFAULT_SECTIONS]
                    : [...DETAILED_DEFAULT_SECTIONS]
                );
                setMetadata(defaultMetadata(next));
              }}
            />
          ) : null}
          {step === 1 ? (
            <ReportingPeriodSelector value={period} onChange={setPeriod} />
          ) : null}
          {step === 2 ? (
            <ReportScopeSelector value={scope} onChange={setScope} />
          ) : null}
          {step === 3 && category ? (
            <ReportContentsSelector
              category={category}
              value={sections}
              onChange={setSections}
            />
          ) : null}
          {step === 4 ? (
            <ReportMetadataForm value={metadata} onChange={setMetadata} />
          ) : null}
          {step === 5 ? (
            <WatermarkSettings value={watermark} onChange={setWatermark} />
          ) : null}
          {step === 6 && draftPreview ? (
            <ReportPreview
              report={draftPreview}
              onBackToEdit={() => setStep(4)}
              showGenerate
              onGenerate={() => {
                void handleGenerate();
              }}
            />
          ) : null}
          {step === 7 ? (
            <ReportGenerationProgress phase={phase} progress={progress} />
          ) : null}

          {error ? <p className={wizardStyles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <Button variant="ghost" disabled={generating} onClick={onClose}>
            Cancel
          </Button>
          <div className={styles.footerRight}>
            <Button
              variant="secondary"
              disabled={step === 0 || generating}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
            >
              Back
            </Button>
            {step < 6 ? (
              <Button
                variant="primary"
                onClick={() => {
                  if (!validateStep()) return;
                  setStep((value) => value + 1);
                }}
              >
                Continue
              </Button>
            ) : null}
            {step === 6 ? (
              <Button
                variant="primary"
                onClick={() => {
                  void handleGenerate();
                }}
              >
                Generate Report
              </Button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

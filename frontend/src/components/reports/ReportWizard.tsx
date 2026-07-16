import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  ListChecks,
} from "lucide-react";
import type {
  EnterpriseReportType,
  ReportBuilderState,
  ReportClassification,
  ReportSectionToggles,
} from "../../mocks/types/reports";
import {
  REPORT_CLASSIFICATIONS,
  SECTION_TOGGLE_LABELS,
  WIZARD_REPORT_TYPES,
} from "../../mocks/types/reports";
import {
  defaultIncludesForType,
  defaultSectionTogglesForType,
} from "../../services/reportBuilderMapper";
import Button from "../common/Button";
import styles from "./ReportWizard.module.css";

interface ReportWizardProps {
  value: ReportBuilderState;
  onChange: (next: ReportBuilderState) => void;
  generating: boolean;
  onGenerate: () => void;
  onPreview: () => void;
}

const DEPARTMENTS = [
  "All",
  "IT",
  "Information Security",
  "Finance",
  "Operations",
  "Human Resources",
  "Risk",
  "Compliance",
  "Infrastructure",
];

const BUSINESS_UNITS = [
  "All",
  "Retail Banking",
  "Treasury",
  "Technology",
  "Corporate",
  "Cyber Defense",
];

const FRAMEWORKS = ["All", "NCA ECC", "SAMA CSF", "PCI DSS", "ISO 27001"];
const STATUSES = ["All", "Ready", "Draft", "Approved", "At Risk", "Open"];
const RISK_LEVELS = ["All", "Critical", "High", "Medium", "Low"];
const COMPLIANCE_STATUSES = ["All", "Compliant", "Partial", "Non-Compliant"];

const STEPS = [
  { id: 1, label: "Report Type", icon: FileText },
  { id: 2, label: "Report Scope", icon: Layers },
  { id: 3, label: "Included Sections", icon: ListChecks },
] as const;

export function createDefaultBuilderState(): ReportBuilderState {
  const reportType: EnterpriseReportType = "Executive Report";
  return {
    reportType,
    filters: {
      department: "All",
      businessUnit: "All",
      framework: "All",
      status: "All",
      riskLevel: "All",
      complianceStatus: "All",
      owner: "All",
      dateFrom: "",
      dateTo: "",
    },
    includes: defaultIncludesForType(reportType),
    sectionToggles: defaultSectionTogglesForType(reportType),
    classification: "Confidential",
  };
}

function isExecutiveType(type: EnterpriseReportType): boolean {
  return type === "Executive Report" || type === "Governance Report";
}

export default function ReportWizard({
  value,
  onChange,
  generating,
  onGenerate,
  onPreview,
}: ReportWizardProps) {
  const [step, setStep] = useState(1);

  const patch = (partial: Partial<ReportBuilderState>) =>
    onChange({ ...value, ...partial });

  const patchFilters = (partial: Partial<ReportBuilderState["filters"]>) =>
    patch({ filters: { ...value.filters, ...partial } });

  const executiveMode = isExecutiveType(value.reportType);

  const visibleToggles = useMemo(
    () =>
      SECTION_TOGGLE_LABELS.filter((item) => {
        if (executiveMode && item.technicalOnly) return false;
        if (!executiveMode && item.executiveOnly) return false;
        return true;
      }),
    [executiveMode]
  );

  const selectType = (type: EnterpriseReportType) => {
    onChange({
      ...value,
      reportType: type,
      includes: defaultIncludesForType(type),
      sectionToggles: defaultSectionTogglesForType(type),
    });
  };

  const toggleSection = (key: keyof ReportSectionToggles) => {
    const next = { ...value.sectionToggles, [key]: !value.sectionToggles[key] };
    patch({
      sectionToggles: next,
      includes: {
        charts: next.charts || next.heatMaps,
        kpis: next.kpiSummary,
        recommendations: next.recommendations,
        evidence: next.evidence,
        attachments: next.attachments,
        auditTrail: next.auditTrail,
      },
    });
  };

  const canNext =
    step === 1
      ? Boolean(value.reportType)
      : step === 2
        ? true
        : Object.values(value.sectionToggles).some(Boolean);

  return (
    <section className={styles.wizard} aria-label="Report generation wizard">
      <header className={styles.head}>
        <div>
          <h2>Generate Report</h2>
          <p>Configure type, scope, and sections — then preview or export a read-only PDF.</p>
        </div>
        <ol className={styles.steps} aria-label="Wizard progress">
          {STEPS.map((item) => {
            const Icon = item.icon;
            const active = step === item.id;
            const done = step > item.id;
            return (
              <li
                key={item.id}
                className={`${styles.step} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`}
                aria-current={active ? "step" : undefined}
              >
                <span className={styles.stepNum}>
                  {done ? <Check size={12} aria-hidden /> : item.id}
                </span>
                <Icon size={14} aria-hidden />
                {item.label}
              </li>
            );
          })}
        </ol>
      </header>

      <div className={styles.body}>
        {step === 1 ? (
          <div className={styles.panel}>
            <h3>Choose Report Type</h3>
            <div className={styles.typeGrid} role="radiogroup" aria-label="Report type">
              {WIZARD_REPORT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={value.reportType === type}
                  className={`${styles.typeCard} ${value.reportType === type ? styles.typeCardActive : ""}`}
                  onClick={() => selectType(type)}
                >
                  <strong>{type}</strong>
                  <span>
                    {isExecutiveType(type)
                      ? "Visual executive briefing for leadership"
                      : "Detailed operational and audit content"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.panel}>
            <h3>Choose Report Scope</h3>
            <div className={styles.filterGrid}>
              <label>
                Department
                <select
                  value={value.filters.department}
                  onChange={(e) => patchFilters({ department: e.target.value })}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Business Unit
                <select
                  value={value.filters.businessUnit}
                  onChange={(e) => patchFilters({ businessUnit: e.target.value })}
                >
                  {BUSINESS_UNITS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Framework
                <select
                  value={value.filters.framework}
                  onChange={(e) => patchFilters({ framework: e.target.value })}
                >
                  {FRAMEWORKS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date From
                <input
                  type="date"
                  value={value.filters.dateFrom}
                  onChange={(e) => patchFilters({ dateFrom: e.target.value })}
                />
              </label>
              <label>
                Date To
                <input
                  type="date"
                  value={value.filters.dateTo}
                  onChange={(e) => patchFilters({ dateTo: e.target.value })}
                />
              </label>
              <label>
                Risk Level
                <select
                  value={value.filters.riskLevel}
                  onChange={(e) => patchFilters({ riskLevel: e.target.value })}
                >
                  {RISK_LEVELS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={value.filters.status}
                  onChange={(e) => patchFilters({ status: e.target.value })}
                >
                  {STATUSES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Classification
                <select
                  value={value.classification}
                  onChange={(e) =>
                    patch({
                      classification: e.target.value as ReportClassification,
                    })
                  }
                >
                  {REPORT_CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Compliance Status
                <select
                  value={value.filters.complianceStatus}
                  onChange={(e) =>
                    patchFilters({ complianceStatus: e.target.value })
                  }
                >
                  {COMPLIANCE_STATUSES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className={styles.panel}>
            <h3>Choose Included Sections</h3>
            {executiveMode ? (
              <p className={styles.hint}>
                Executive reports are visual and concise — technical tables and raw
                evidence are excluded automatically.
              </p>
            ) : (
              <p className={styles.hint}>
                Technical reports include full operational detail. Enable every section
                required for audit and remediation workflows.
              </p>
            )}
            <div className={styles.sectionGrid}>
              {visibleToggles.map((item) => (
                <label key={item.key} className={styles.checkCard}>
                  <input
                    type="checkbox"
                    checked={value.sectionToggles[item.key]}
                    onChange={() => toggleSection(item.key)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          {step > 1 ? (
            <Button
              variant="ghost"
              disabled={generating}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft size={16} aria-hidden />
              Back
            </Button>
          ) : null}
        </div>
        <div className={styles.footerRight}>
          {step < 3 ? (
            <Button
              variant="secondary"
              disabled={!canNext || generating}
              onClick={() => setStep((s) => Math.min(3, s + 1))}
            >
              Next
              <ChevronRight size={16} aria-hidden />
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={generating || !canNext}
                onClick={onPreview}
              >
                Preview
              </Button>
              <Button
                variant="primary"
                disabled={generating || !canNext}
                onClick={onGenerate}
              >
                {generating ? "Generating…" : "Generate PDF"}
              </Button>
            </>
          )}
        </div>
      </footer>
    </section>
  );
}

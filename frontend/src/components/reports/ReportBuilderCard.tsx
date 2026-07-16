import type {
  EnterpriseReportType,
  ReportBuilderState,
  ReportClassification,
  ReportIncludeOptions,
} from "../../mocks/types/reports";
import {
  ENTERPRISE_REPORT_TYPES,
  REPORT_CLASSIFICATIONS,
} from "../../mocks/types/reports";
import { defaultIncludesForType, defaultSectionTogglesForType } from "../../services/reportBuilderMapper";
import Button from "../common/Button";
import styles from "./ReportBuilderCard.module.css";

interface ReportBuilderCardProps {
  value: ReportBuilderState;
  onChange: (next: ReportBuilderState) => void;
  generating: boolean;
  onGenerate: () => void;
  onPreview: () => void;
  onClear: () => void;
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
const COMPLIANCE_STATUSES = [
  "All",
  "Compliant",
  "Partial",
  "Non-Compliant",
];
const OWNERS = ["All", "Sara", "Ahmed", "Noura", "Khalid", "Mohammed", "Lama"];

const INCLUDE_KEYS: Array<{ key: keyof ReportIncludeOptions; label: string }> = [
  { key: "charts", label: "Include Charts" },
  { key: "kpis", label: "Include KPIs" },
  { key: "recommendations", label: "Include Recommendations" },
  { key: "evidence", label: "Include Evidence" },
  { key: "attachments", label: "Include Attachments" },
  { key: "auditTrail", label: "Include Audit Trail" },
];

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

export default function ReportBuilderCard({
  value,
  onChange,
  generating,
  onGenerate,
  onPreview,
  onClear,
}: ReportBuilderCardProps) {
  const patch = (partial: Partial<ReportBuilderState>) =>
    onChange({ ...value, ...partial });

  const setReportType = (reportType: EnterpriseReportType) => {
    onChange({
      ...value,
      reportType,
      includes: defaultIncludesForType(reportType),
    });
  };

  return (
    <section className={styles.card} aria-labelledby="report-builder-title">
      <div className={styles.head}>
        <div>
          <h2 id="report-builder-title">Report Builder</h2>
          <p>Configure an enterprise PDF package — preview stays on this page.</p>
        </div>
      </div>

      <div className={styles.block}>
        <h3>Report Type</h3>
        <div className={styles.typeGrid} role="radiogroup" aria-label="Report type">
          {ENTERPRISE_REPORT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={value.reportType === type}
              className={`${styles.typeChip} ${
                value.reportType === type ? styles.typeChipActive : ""
              }`}
              onClick={() => setReportType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <h3>Filters</h3>
        <div className={styles.filterGrid}>
          <label>
            <span>Department</span>
            <select
              value={value.filters.department}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, department: e.target.value },
                })
              }
            >
              {DEPARTMENTS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All departments" : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Business Unit</span>
            <select
              value={value.filters.businessUnit}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, businessUnit: e.target.value },
                })
              }
            >
              {BUSINESS_UNITS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All business units" : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Framework</span>
            <select
              value={value.filters.framework}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, framework: e.target.value },
                })
              }
            >
              {FRAMEWORKS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All frameworks" : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              value={value.filters.status}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, status: e.target.value },
                })
              }
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All statuses" : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Risk Level</span>
            <select
              value={value.filters.riskLevel}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, riskLevel: e.target.value },
                })
              }
            >
              {RISK_LEVELS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All risk levels" : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Compliance Status</span>
            <select
              value={value.filters.complianceStatus}
              onChange={(e) =>
                patch({
                  filters: {
                    ...value.filters,
                    complianceStatus: e.target.value,
                  },
                })
              }
            >
              {COMPLIANCE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All compliance statuses" : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Owner</span>
            <select
              value={value.filters.owner}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, owner: e.target.value },
                })
              }
            >
              {OWNERS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All owners" : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Date From</span>
            <input
              type="date"
              value={value.filters.dateFrom}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, dateFrom: e.target.value },
                })
              }
            />
          </label>
          <label>
            <span>Date To</span>
            <input
              type="date"
              value={value.filters.dateTo}
              onChange={(e) =>
                patch({
                  filters: { ...value.filters, dateTo: e.target.value },
                })
              }
            />
          </label>
        </div>
      </div>

      <div className={styles.block}>
        <h3>Content Options</h3>
        <div className={styles.includeGrid}>
          {INCLUDE_KEYS.map((item) => (
            <label key={item.key} className={styles.check}>
              <input
                type="checkbox"
                checked={value.includes[item.key]}
                onChange={(e) =>
                  patch({
                    includes: {
                      ...value.includes,
                      [item.key]: e.target.checked,
                    },
                  })
                }
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <h3>Report Classification</h3>
        <div className={styles.classRow} role="radiogroup" aria-label="Classification">
          {REPORT_CLASSIFICATIONS.map((item) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={value.classification === item}
              className={`${styles.classChip} ${
                value.classification === item ? styles.classChipActive : ""
              }`}
              data-level={item}
              onClick={() =>
                patch({ classification: item as ReportClassification })
              }
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" onClick={onGenerate} disabled={generating}>
          {generating ? "Generating…" : "Generate PDF"}
        </Button>
        <Button variant="secondary" onClick={onPreview} disabled={generating}>
          Preview
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={generating}>
          Clear
        </Button>
      </div>
    </section>
  );
}

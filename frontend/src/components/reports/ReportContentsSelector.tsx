import type {
  DetailedSectionId,
  ExecutiveSectionId,
  ReportCategory,
  ReportSectionId,
} from "../../mocks/types/reports";
import styles from "./WizardShared.module.css";

const EXECUTIVE_SECTIONS: Array<{
  id: ExecutiveSectionId;
  label: string;
}> = [
  { id: "Executive Summary", label: "Executive Summary" },
  { id: "Compliance Overview", label: "Compliance Overview" },
  { id: "Risk Overview", label: "Risk Overview" },
  { id: "Critical Violations", label: "Critical Violations" },
  { id: "Identity Risks", label: "Identity Risks" },
  { id: "Business Continuity Readiness", label: "BCM Readiness" },
  { id: "Disaster Recovery Readiness", label: "DR Readiness" },
  { id: "Top Recommendations", label: "Top Recommendations" },
  { id: "Charts", label: "Charts" },
  { id: "Management Conclusion", label: "Management Conclusion" },
];

const DETAILED_SECTIONS: Array<{
  id: DetailedSectionId;
  label: string;
}> = [
  { id: "Full Findings", label: "Full Findings" },
  { id: "Asset Compliance Table", label: "Asset Compliance" },
  { id: "Identity Monitoring Table", label: "Identity Monitoring Records" },
  { id: "Risk Cases", label: "Risk Cases" },
  { id: "Risk Assessment Calculations", label: "Risk Calculations" },
  { id: "Evidence Register", label: "Evidence Register" },
  { id: "Control Mapping", label: "Control Mapping" },
  { id: "Remediation Plan", label: "Remediation Actions" },
  { id: "BCM Details", label: "BCM Details" },
  { id: "DR Details", label: "DR Details" },
  { id: "Activity Logs", label: "Activity Logs" },
  { id: "Auditor Notes", label: "Auditor Notes" },
  { id: "Appendices", label: "Appendices" },
];

interface ReportContentsSelectorProps {
  category: ReportCategory;
  value: ReportSectionId[];
  onChange: (value: ReportSectionId[]) => void;
}

export default function ReportContentsSelector({
  category,
  value,
  onChange,
}: ReportContentsSelectorProps) {
  const options =
    category === "Executive" ? EXECUTIVE_SECTIONS : DETAILED_SECTIONS;

  return (
    <fieldset className={styles.fieldset}>
      <legend>
        {category === "Executive" ? "Executive contents" : "Detailed contents"}
      </legend>
      <div className={styles.checkGrid}>
        {options.map((item) => (
          <label key={item.id} className={styles.check}>
            <input
              type="checkbox"
              checked={value.includes(item.id)}
              onChange={() => {
                onChange(
                  value.includes(item.id)
                    ? value.filter((entry) => entry !== item.id)
                    : [...value, item.id]
                );
              }}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

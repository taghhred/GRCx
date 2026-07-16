import type {
  ReportDepartment,
  ReportFramework,
  ReportModuleScope,
  ReportScope,
} from "../../mocks/types/reports";
import styles from "./WizardShared.module.css";

const MODULES: ReportModuleScope[] = [
  "Dashboard Overview",
  "Identity & Access",
  "Security Operations",
  "Compliance",
  "Risk Assessment",
  "Business Continuity",
  "Disaster Recovery",
  "AI Advisor Insights",
];

const FRAMEWORKS: ReportFramework[] = [
  "NCA ECC",
  "SAMA CSF",
  "PCI DSS",
  "ISO 27001",
  "All Frameworks",
];

const DEPARTMENTS: ReportDepartment[] = [
  "All Departments",
  "IT",
  "Information Security",
  "Finance",
  "Operations",
  "Human Resources",
  "Risk",
  "Compliance",
  "Infrastructure",
];

interface ReportScopeSelectorProps {
  value: ReportScope;
  onChange: (value: ReportScope) => void;
}

function toggleValue<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export default function ReportScopeSelector({
  value,
  onChange,
}: ReportScopeSelectorProps) {
  return (
    <div className={styles.stack}>
      <fieldset className={styles.fieldset}>
        <legend>Modules</legend>
        <div className={styles.checkGrid}>
          {MODULES.map((item) => (
            <label key={item} className={styles.check}>
              <input
                type="checkbox"
                checked={value.modules.includes(item)}
                onChange={() =>
                  onChange({
                    ...value,
                    modules: toggleValue(value.modules, item),
                  })
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Frameworks</legend>
        <div className={styles.checkGrid}>
          {FRAMEWORKS.map((item) => (
            <label key={item} className={styles.check}>
              <input
                type="checkbox"
                checked={value.frameworks.includes(item)}
                onChange={() =>
                  onChange({
                    ...value,
                    frameworks: toggleValue(value.frameworks, item),
                  })
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Departments</legend>
        <div className={styles.checkGrid}>
          {DEPARTMENTS.map((item) => (
            <label key={item} className={styles.check}>
              <input
                type="checkbox"
                checked={value.departments.includes(item)}
                onChange={() =>
                  onChange({
                    ...value,
                    departments: toggleValue(value.departments, item),
                  })
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

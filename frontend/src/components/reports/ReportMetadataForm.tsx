import type {
  ReportClassification,
  ReportMetadata,
} from "../../mocks/types/reports";
import styles from "./WizardShared.module.css";

interface ReportMetadataFormProps {
  value: ReportMetadata;
  onChange: (value: ReportMetadata) => void;
}

const CLASSIFICATIONS: ReportClassification[] = [
  "Internal",
  "Confidential",
  "Restricted",
  "Top Secret",
];

export default function ReportMetadataForm({
  value,
  onChange,
}: ReportMetadataFormProps) {
  const patch = (partial: Partial<ReportMetadata>) =>
    onChange({ ...value, ...partial });

  return (
    <div className={styles.formGrid}>
      <label className={`${styles.field} ${styles.full}`}>
        <span>Report Title</span>
        <input
          type="text"
          value={value.title}
          maxLength={160}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </label>
      <label className={`${styles.field} ${styles.full}`}>
        <span>Report Description</span>
        <textarea
          value={value.description}
          maxLength={500}
          rows={3}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </label>
      <label className={styles.field}>
        <span>Issue Date</span>
        <input
          type="date"
          value={value.issueDate}
          onChange={(event) => patch({ issueDate: event.target.value })}
        />
      </label>
      <label className={styles.field}>
        <span>Classification</span>
        <select
          value={value.classification}
          onChange={(event) =>
            patch({
              classification: event.target.value as ReportClassification,
            })
          }
        >
          {CLASSIFICATIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>Auditor Name</span>
        <input
          type="text"
          value={value.auditorName}
          maxLength={80}
          onChange={(event) => patch({ auditorName: event.target.value })}
        />
      </label>
      <label className={styles.field}>
        <span>Auditor Role</span>
        <input
          type="text"
          value={value.auditorRole}
          maxLength={80}
          onChange={(event) => patch({ auditorRole: event.target.value })}
        />
      </label>
      <label className={styles.field}>
        <span>Prepared By</span>
        <input
          type="text"
          value={value.preparedBy}
          maxLength={80}
          onChange={(event) => patch({ preparedBy: event.target.value })}
        />
      </label>
      <label className={styles.field}>
        <span>Approved By</span>
        <input
          type="text"
          value={value.approvedBy}
          maxLength={80}
          onChange={(event) => patch({ approvedBy: event.target.value })}
        />
      </label>
      <label className={`${styles.field} ${styles.full}`}>
        <span>Organization Name</span>
        <input
          type="text"
          value={value.organizationName}
          maxLength={120}
          onChange={(event) => patch({ organizationName: event.target.value })}
        />
      </label>
    </div>
  );
}

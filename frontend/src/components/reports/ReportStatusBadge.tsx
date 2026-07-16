import type { ReportStatus } from "../../mocks/types/reports";
import styles from "./ReportStatusBadge.module.css";

const TONE: Record<ReportStatus, string> = {
  Draft: styles.draft,
  Generating: styles.generating,
  Ready: styles.ready,
  Approved: styles.approved,
  Archived: styles.archived,
  Failed: styles.failed,
};

interface ReportStatusBadgeProps {
  status: ReportStatus;
}

export default function ReportStatusBadge({ status }: ReportStatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${TONE[status]}`}>
      <span className={styles.dot} aria-hidden />
      {status}
    </span>
  );
}

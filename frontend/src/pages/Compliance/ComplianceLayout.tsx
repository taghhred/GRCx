import { Outlet } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import ErrorState from "../../components/ui/ErrorState";
import { useComplianceModule } from "../../services/compliance/ComplianceModuleContext";
import styles from "../../components/compliance/Compliance.module.css";

/**
 * Shared layout for all /compliance/* routes.
 * Section navigation is handled by the sidebar (React Router) — no in-page tabs.
 */
export default function ComplianceLayout() {
  const { notice, setNotice, loading, error, reload, register, assessments, evidence } =
    useComplianceModule();

  const hasData =
    register.length > 0 || assessments.length > 0 || evidence.length > 0;

  return (
    <DashboardLayout>
      <div className={styles.shell}>
        {notice ? (
          <div className={styles.notice} role="status">
            <span>{notice}</span>
            <button
              type="button"
              className={styles.noticeDismiss}
              aria-label="Dismiss notice"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {loading && !hasData ? (
          <LoadingSkeleton rows={4} height={72} />
        ) : error && !hasData ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <Outlet />
        )}
      </div>
    </DashboardLayout>
  );
}

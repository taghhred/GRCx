import { Outlet } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import ErrorState from "../../components/ui/ErrorState";
import { useRiskModule } from "../../services/risk/RiskModuleContext";
import styles from "./RiskAssessment.module.css";

/**
 * Shared layout for all /risk/* routes.
 * Section navigation is handled by the sidebar (React Router) — no in-page tabs.
 */
export default function RiskAssessmentLayout() {
  const { notice, setNotice, loading, error, reload, risks } = useRiskModule();

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

        {loading && risks.length === 0 ? (
          <LoadingSkeleton rows={4} height={72} />
        ) : error && risks.length === 0 ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <Outlet />
        )}
      </div>
    </DashboardLayout>
  );
}

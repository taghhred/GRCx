import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { buildLoginRedirect } from "../../auth/safeReturnPath";
import styles from "./RequireAuth.module.css";

export default function RequireAuth() {
  const { status, isAuthenticated, isDemoMode, enterDemoSession } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden />
        <p>
          {isDemoMode
            ? "Preparing secure demo session…"
            : "Verifying session…"}
        </p>
      </div>
    );
  }

  if (status === "demo_error" && isDemoMode) {
    return (
      <div className={styles.loading} role="alert">
        <p>Could not start the secure demo session.</p>
        <button
          type="button"
          onClick={() => {
            void enterDemoSession().catch(() => undefined);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Demo mode: send to /login which shows retry (never a credential form).
    return (
      <Navigate
        to={buildLoginRedirect(location.pathname, location.search)}
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

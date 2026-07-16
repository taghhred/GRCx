import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { buildLoginRedirect } from "../../auth/safeReturnPath";
import styles from "./RequireAuth.module.css";

export default function RequireAuth() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden />
        <p>Verifying session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
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

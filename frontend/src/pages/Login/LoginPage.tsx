import { type FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import BrandLogo from "../../components/common/BrandLogo";
import { useAuth } from "../../auth/useAuth";
import { sanitizeReturnPath } from "../../auth/safeReturnPath";
import { ApiError } from "../../services/api/client";
import styles from "./LoginPage.module.css";

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "network" || err.status === 0) {
      return "Cannot connect to GRCx server.";
    }
    if (err.code === "database") {
      return "Database connection unavailable.";
    }
    if (err.status === 401 || err.status === 403) {
      return "Invalid email or password.";
    }
    if (err.code === "server" || err.status >= 500) {
      return "Unexpected server error.";
    }
    return err.message || "Unexpected server error.";
  }
  return "Cannot connect to GRCx server.";
}

export default function LoginPage() {
  const {
    status,
    isAuthenticated,
    isDemoMode,
    login,
    enterDemoSession,
  } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = useMemo(
    () => sanitizeReturnPath(params.get("next")),
    [params]
  );

  const formId = useId();
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();
  const errorId = useId();

  const [email, setEmail] = useState(() =>
    import.meta.env.DEV ? "test@grcx.local" : ""
  );
  const [password, setPassword] = useState(() =>
    import.meta.env.DEV ? "123456" : ""
  );
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [forgotHint, setForgotHint] = useState(false);
  const [demoRetrying, setDemoRetrying] = useState(false);

  useEffect(() => {
    if (!shakeError) return;
    const timer = window.setTimeout(() => setShakeError(false), 320);
    return () => window.clearTimeout(timer);
  }, [shakeError]);

  // Demo mode: never show the credential form.
  if (isDemoMode) {
    if (isAuthenticated) {
      const dest = returnTo === "/login" ? "/dashboard" : returnTo;
      return <Navigate to={dest} replace />;
    }
    if (status === "loading") {
      return (
        <div className={styles.page} aria-busy="true">
          <div className={styles.loadingCard} role="status">
            Preparing secure demo session…
          </div>
        </div>
      );
    }
    if (status === "demo_error") {
      return (
        <div className={styles.page}>
          <div className={styles.ambiance} aria-hidden />
          <main className={styles.main}>
            <div className={styles.brandBlock}>
              <BrandLogo variant="login" interactive={false} />
            </div>
            <section className={styles.card} aria-labelledby="demo-error-heading">
              <header className={styles.cardHeader}>
                <h1 id="demo-error-heading" className={styles.title}>
                  Demo unavailable
                </h1>
              </header>
              <p className={styles.error} role="alert">
                Could not start the secure demo session. Please retry.
              </p>
              <button
                type="button"
                className={styles.submit}
                disabled={demoRetrying}
                aria-busy={demoRetrying}
                onClick={() => {
                  setDemoRetrying(true);
                  void enterDemoSession()
                    .then(() => navigate("/dashboard", { replace: true }))
                    .catch(() => undefined)
                    .finally(() => setDemoRetrying(false));
                }}
              >
                {demoRetrying ? (
                  <>
                    <span className={styles.spinner} aria-hidden />
                    <span>Retrying…</span>
                  </>
                ) : (
                  "Retry demo session"
                )}
              </button>
            </section>
          </main>
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (status === "loading") {
    return (
      <div className={styles.page} aria-busy="true">
        <div className={styles.loadingCard} role="status">
          Verifying session…
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const triggerError = (message: string) => {
    setError(message);
    setShakeError(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setForgotHint(false);

    if (!email.trim() || !password) {
      triggerError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      navigate(returnTo, { replace: true });
    } catch (err) {
      triggerError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.ambiance} aria-hidden />

      <main className={styles.main}>
        <div className={styles.brandBlock}>
          <BrandLogo variant="login" interactive={false} />
        </div>

        <section
          className={`${styles.card} ${shakeError ? styles.cardShake : ""}`}
          aria-labelledby="login-heading"
        >
          <header className={styles.cardHeader}>
            <h1 id="login-heading" className={styles.title}>
              Sign In
            </h1>
          </header>

          <form
            id={formId}
            className={styles.form}
            onSubmit={onSubmit}
            noValidate
            aria-describedby={error ? errorId : undefined}
          >
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor={emailId}>
                Email
              </label>
              <div className={styles.field}>
                <Mail size={18} className={styles.fieldIcon} aria-hidden />
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  disabled={submitting}
                  required
                  autoFocus
                  aria-invalid={error ? true : undefined}
                  aria-required="true"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor={passwordId}>
                Password
              </label>
              <div className={styles.field}>
                <Lock size={18} className={styles.fieldIcon} aria-hidden />
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  disabled={submitting}
                  required
                  aria-invalid={error ? true : undefined}
                  aria-required="true"
                />
                <button
                  type="button"
                  className={styles.reveal}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden />
                  ) : (
                    <Eye size={18} aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <div className={styles.row}>
              <label className={styles.remember} htmlFor={rememberId}>
                <input
                  id={rememberId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={submitting}
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                className={styles.forgot}
                onClick={() => setForgotHint(true)}
                aria-label="Forgot password"
              >
                Forgot Password?
              </button>
            </div>

            {forgotHint ? (
              <p className={styles.hint} role="status">
                Password resets are handled by your GRCx administrator.
                Self-service registration is not available.
              </p>
            ) : null}

            {error ? (
              <p
                id={errorId}
                className={`${styles.error} ${shakeError ? styles.errorShake : ""}`}
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className={styles.submit}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} aria-hidden />
                  <span>Signing in…</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </section>

        <p className={styles.footer}>
          Restricted Information System.
          <br />
          Unauthorized access is prohibited.
        </p>
      </main>
    </div>
  );
}

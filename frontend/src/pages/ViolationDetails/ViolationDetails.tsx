import DashboardLayout from "../../layouts/DashboardLayout";
import {
  ShieldAlert,
  User,
  Building2,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import styles from "./ViolationDetails.module.css";

/** Accept only safe path/id tokens (alphanumeric, hyphen, underscore). */
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export default function ViolationDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  if (!id || !SAFE_ID_PATTERN.test(id)) {
    return <Navigate to="/violations" replace />;
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>

        {/* Header */}

        <section className={styles.header}>

          <div>

            <div className={styles.badge}>
              <ShieldAlert size={15} />
              Critical
            </div>

            <h1>Excessive Privileged Access</h1>

            <p>
              Detected on May 24, 2026 • Identity ID #EMP-10241
            </p>

          </div>

          <div className={styles.riskCard}>
            <span>Risk Score</span>
            <h2>96</h2>
            <small>AI Confidence 98%</small>
          </div>

        </section>

        {/* Employee + Summary */}

        <section className={styles.grid}>

          <div className={styles.card}>

            <h3>Employee Information</h3>

            <div className={styles.identity}>

              <div className={styles.avatar}>
                <User size={22} />
              </div>

              <div>

                <h4>Rayan</h4>

                <span>
                  <Building2 size={14} />
                  Finance Department
                </span>

              </div>

            </div>

          </div>

          <div className={styles.card}>

            <h3>Violation Summary</h3>

            <p className={styles.summary}>
              The employee was transferred from the Finance department
              to Operations, however privileged permissions remained
              active in Active Directory, creating an excessive access
              risk that violates multiple compliance controls.
            </p>

          </div>

        </section>

        {/* Permissions */}

        <section className={styles.card}>

          <h3>Affected Permissions</h3>

          <div className={styles.tags}>

            <span>Domain Admin</span>
            <span>SWIFT Operator</span>
            <span>Finance Approval</span>

          </div>

        </section>

        {/* Frameworks */}

        <section className={styles.card}>

          <h3>Affected Frameworks</h3>

          <div className={styles.frameworks}>

            <div className={styles.framework}>
              <ShieldCheck size={18} />
              SAMA CSF
            </div>

            <div className={styles.framework}>
              <ShieldCheck size={18} />
              NCA ECC
            </div>

            <div className={styles.framework}>
              <ShieldCheck size={18} />
              ISO 27001
            </div>

          </div>

        </section>

        {/* Review CTA */}

        <section className={styles.aiCard}>

          <div>

            <div className={styles.aiTitle}>

              <Sparkles size={18} />

              Review AI Recommendation

            </div>

            <p>
              GRCx has already analyzed this violation and prepared a
              complete remediation recommendation, including the
              affected regulations, security impact, and suggested
              actions. Review the recommendation before applying it.
            </p>

          </div>

          <button
            className={styles.actionButton}
            onClick={() => navigate("/analysis")}
          >
            Review Recommendation
            <ChevronRight size={18} />
          </button>

        </section>

      </div>
    </DashboardLayout>
  );
}
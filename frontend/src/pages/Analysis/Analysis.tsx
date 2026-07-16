import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  UserCog,
  BellRing,
  FileCheck2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import styles from "./Analysis.module.css";

export default function Analysis() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <DashboardLayout>
      <div className={styles.container}>

        {/* Header */}

        <header className={styles.header}>

          <div>

            <span className={styles.label}>
              AI ANALYSIS
            </span>

            <h1>
              Compliance Analysis Complete
            </h1>

            <p>
              GRCx analyzed the identity, permissions,
              organizational context, historical identity
              events and mapped the detected violation
              against applicable regulatory frameworks.
            </p>

          </div>

          <div className={styles.score}>

            <span>Confidence</span>

            <h2>98%</h2>

          </div>

        </header>

        {/* AI Reasoning */}

        <section className={styles.card}>

          <div className={styles.title}>

            <BrainCircuit size={20} />

            AI Reasoning

          </div>

          <p>

            The employee changed departments while
            privileged financial permissions remained
            active. Identity lifecycle records indicate
            that access rights were never recalculated,
            creating a high probability of unauthorized
            financial operations.

          </p>

        </section>

        {/* Regulations + Findings */}

        <section className={styles.grid}>

          <div className={styles.card}>

            <div className={styles.title}>

              <ShieldCheck size={18} />

              Applicable Regulations

            </div>

            <ul>

              <li>SAMA CSF IAM-3</li>

              <li>NCA ECC IAM-2</li>

              <li>ISO 27001 A.5</li>

            </ul>

          </div>

          <div className={styles.card}>

            <div className={styles.title}>

              <Sparkles size={18} />

              AI Findings

            </div>

            <ul>

              <li>Role mismatch detected</li>

              <li>Privilege escalation risk</li>

              <li>Identity lifecycle not updated</li>

              <li>Access review overdue</li>

            </ul>

          </div>

        </section>

        {/* Remediation Plan */}

        <section className={styles.plan}>

          <div className={styles.planHeader}>

            <div>

              <h2>
                Recommended Remediation Plan
              </h2>

              <p>
                Based on the detected violation, GRCx generated
                the following remediation workflow.
              </p>

            </div>

            <div className={styles.riskReduction}>

              <span>Expected Risk Reduction</span>

              <h3>96 → 18</h3>

            </div>

          </div>

          <div className={styles.timeline}>

            <div className={styles.step}>

              <CheckCircle2 size={20} />

              <div>

                <h4>Remove Excessive Privileges</h4>

                <p>
                  Remove Domain Admin and SWIFT Operator access.
                </p>

              </div>

            </div>

            <div className={styles.step}>

              <UserCog size={20} />

              <div>

                <h4>Review Identity Role</h4>

                <p>
                  Recalculate permissions based on the employee's current role.
                </p>

              </div>

            </div>

            <div className={styles.step}>

              <BellRing size={20} />

              <div>

                <h4>Notify Security Team</h4>

                <p>
                  Automatically create a remediation task and notify the team.
                </p>

              </div>

            </div>

            <div className={styles.step}>

              <FileCheck2 size={20} />

              <div>

                <h4>Compliance Verification</h4>

                <p>
                  Validate SAMA, NCA and ISO controls before closing the incident.
                </p>

              </div>

            </div>

          </div>

          <div className={styles.actions}>

            <button
              className={styles.nextButton}
              onClick={() => setShowConfirm(true)}
            >

              Apply Remediation

              <ChevronRight size={18} />

            </button>

          </div>

        </section>

        {/* Confirmation Modal */}

        {showConfirm && (

          <div className={styles.overlay}>

            <div className={styles.modal}>

              <div className={styles.modalHeader}>

                <ShieldCheck size={24} />

                <div className={styles.modalTitle}>

                  <h3>
                    Apply AI Recommendation?
                  </h3>

                  <p>
                    This action will automatically perform the following tasks.
                  </p>

                </div>

              </div>

              <div className={styles.modalList}>

                <div className={styles.modalItem}>
                  <CheckCircle2 size={18}/>
                  Remove excessive privileges
                </div>

                <div className={styles.modalItem}>
                  <CheckCircle2 size={18}/>
                  Create remediation task
                </div>

                <div className={styles.modalItem}>
                  <CheckCircle2 size={18}/>
                  Notify security team
                </div>

                <div className={styles.modalItem}>
                  <CheckCircle2 size={18}/>
                  Update compliance audit trail
                </div>

              </div>

              <div className={styles.modalActions}>

                <button
                  className={styles.cancelButton}
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>

                <button
                  className={styles.applyButton}
                  onClick={() => navigate("/success")}
                >

                  Apply

                  <ChevronRight size={16}/>

                </button>

              </div>

            </div>

          </div>

        )}

      </div>
    </DashboardLayout>
  );
}
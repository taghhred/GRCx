import DashboardLayout from "../../layouts/DashboardLayout";
import {
  CheckCircle2,
  ShieldCheck,
  UserCog,
  BellRing,
  FileCheck2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import styles from "./Remediation.module.css";

export default function Remediation() {

  const navigate = useNavigate();

  return (

    <DashboardLayout>

      <div className={styles.container}>

        {/* Header */}

        <header className={styles.header}>

          <div>

            <span className={styles.badge}>
              READY TO EXECUTE
            </span>

            <h1>
              Review Remediation Plan
            </h1>

            <p>
              Review the AI-generated remediation workflow before
              applying the recommended actions across your identity
              and compliance environment.
            </p>

          </div>

        </header>

        {/* Timeline */}

        <section className={styles.timeline}>

          <div className={styles.step}>

            <CheckCircle2 size={20}/>

            <div>

              <h3>Remove Excessive Privileges</h3>

              <p>
                Remove Domain Admin and SWIFT Operator access from
                the affected identity.
              </p>

            </div>

          </div>

          <div className={styles.step}>

            <UserCog size={20}/>

            <div>

              <h3>Recalculate Identity Role</h3>

              <p>
                Rebuild permissions using the employee's current
                organizational assignment.
              </p>

            </div>

          </div>

          <div className={styles.step}>

            <BellRing size={20}/>

            <div>

              <h3>Create Security Task</h3>

              <p>
                Notify the Identity Governance team and assign
                remediation ownership automatically.
              </p>

            </div>

          </div>

          <div className={styles.step}>

            <FileCheck2 size={20}/>

            <div>

              <h3>Verify Compliance Controls</h3>

              <p>
                Validate mapped SAMA, NCA and ISO controls before
                closing the incident.
              </p>

            </div>

          </div>

        </section>

        {/* Summary */}

        <section className={styles.summary}>

          <div>

            <ShieldCheck size={22}/>

            <div>

              <h3>Expected Result</h3>

              <p>
                Estimated Risk Reduction
              </p>

            </div>

          </div>

          <h2>96 → 18</h2>

        </section>

        {/* Execute */}

        <button
          className={styles.button}
          onClick={() => navigate("/success")}
        >

          Apply Remediation Plan

          <ChevronRight size={18}/>

        </button>

      </div>

    </DashboardLayout>

  );

}
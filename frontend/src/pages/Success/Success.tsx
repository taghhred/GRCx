import DashboardLayout from "../../layouts/DashboardLayout";
import {
  CircleCheckBig,
  Ticket,
  Bell,
  Clock3,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import styles from "./Success.module.css";

export default function Success() {

    const navigate = useNavigate();

    return (

        <DashboardLayout>

            <div className={styles.container}>

                <div className={styles.hero}>

                    <div className={styles.successIcon}>
                        <CircleCheckBig size={56}/>
                    </div>

                    <h1>Remediation Successfully Applied</h1>

                    <p>
                        GRCx completed the remediation workflow,
                        created a governance task and updated the
                        compliance audit trail automatically.
                    </p>

                </div>

                <section className={styles.grid}>

                    <div className={styles.card}>

                        <Ticket size={22}/>

                        <span>Ticket ID</span>

                        <h3>#GRCX-2026-0187</h3>

                    </div>

                    <div className={styles.card}>

                        <ShieldCheck size={22}/>

                        <span>Status</span>

                        <h3>In Progress</h3>

                    </div>

                    <div className={styles.card}>

                        <Bell size={22}/>

                        <span>Notifications</span>

                        <h3>3 Sent</h3>

                    </div>

                    <div className={styles.card}>

                        <Clock3 size={22}/>

                        <span>ETA</span>

                        <h3>2 Hours</h3>

                    </div>

                </section>

                <section className={styles.timeline}>

                    <h2>Automation Summary</h2>

                    <div className={styles.item}>

                        <CircleCheckBig size={18}/>

                        <span>
                            Privileged access removed successfully.
                        </span>

                    </div>

                    <div className={styles.item}>

                        <CircleCheckBig size={18}/>

                        <span>
                            Identity Governance team notified.
                        </span>

                    </div>

                    <div className={styles.item}>

                        <CircleCheckBig size={18}/>

                        <span>
                            SAMA & NCA mapping updated.
                        </span>

                    </div>

                    <div className={styles.item}>

                        <CircleCheckBig size={18}/>

                        <span>
                            Audit trail stored successfully.
                        </span>

                    </div>

                </section>

                <button

                    className={styles.button}

                    onClick={()=>navigate("/dashboard")}

                >

                    <LayoutDashboard size={18}/>

                    Return to Dashboard

                </button>

            </div>

        </DashboardLayout>

    );

}
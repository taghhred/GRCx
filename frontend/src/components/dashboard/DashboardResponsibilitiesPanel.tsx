import { useEffect, useState } from "react";
import {
  DASHBOARD_RESPONSIBILITIES,
  type ResponsibilityRow,
} from "../../mocks/data/dashboardOrgData";
import { fetchOrganization } from "../../services/api/dashboardApi";
import { displayFirstName } from "../../utils/reportDisplay";
import styles from "./DashboardResponsibilitiesPanel.module.css";

export default function DashboardResponsibilitiesPanel() {
  const [rows, setRows] = useState<ResponsibilityRow[]>(DASHBOARD_RESPONSIBILITIES);

  useEffect(() => {
    let cancelled = false;
    void fetchOrganization().then((data) => {
      if (cancelled) return;
      if (data.responsibilities?.length) {
        setRows(data.responsibilities as ResponsibilityRow[]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.panel} aria-label="Responsibilities">
      <h2 className={styles.heading}>Responsibilities</h2>
      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Responsibilities</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{displayFirstName(row.name)}</strong>
                  </td>
                  <td>{row.role}</td>
                  <td>{row.department}</td>
                  <td>{row.responsibilities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

import { Navigate } from "react-router-dom";

/** Risk analytics moved to the main Dashboard. Reports generation lives at /reports. */
export default function RiskReportsPage() {
  return <Navigate to="/reports" replace />;
}

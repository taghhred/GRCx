import { Navigate } from "react-router-dom";

/** Legacy entry — unified Reports lives at /reports. */
export default function ExecutiveReports() {
  return <Navigate to="/reports" replace />;
}

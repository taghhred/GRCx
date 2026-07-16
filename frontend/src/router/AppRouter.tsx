import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "../pages/Dashboard/Dashboard";
import NotFound from "../pages/NotFound/NotFound";
import ModulePlaceholder from "../pages/Placeholder/ModulePlaceholder";
import AiAdvisorRedirect from "../pages/AiAdvisor/AiAdvisorRedirect";
import BusinessContinuity from "../pages/BusinessContinuity/BusinessContinuity";
import DisasterRecovery from "../pages/DisasterRecovery/DisasterRecovery";
import IdentityAccessMonitoring from "../pages/IdentityAccess/IdentityAccessMonitoring";
import AssetCompliance from "../pages/Compliance/AssetCompliance";
import RiskManagement from "../pages/Risk/RiskManagement";
import RiskDashboardPage from "../pages/Risk/RiskDashboardPage";
import RiskRegisterPage from "../pages/Risk/RiskRegisterPage";
import RiskNewPage from "../pages/Risk/RiskNewPage";
import RiskHeatmapsPage from "../pages/Risk/RiskHeatmapsPage";
import RiskTreatmentPage from "../pages/Risk/RiskTreatmentPage";
import RiskReportsPage from "../pages/Risk/RiskReportsPage";
import ReportsPage from "../pages/Reports/ReportsPage";
import OpenGrcCases from "../pages/GrcCases/OpenGrcCases";
import Governance from "../pages/Governance/Governance";
import LoginPage from "../pages/Login/LoginPage";
import RequireAuth from "../components/auth/RequireAuth";

function Shell({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <ModulePlaceholder title={title} description={description} />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Identity & Access — single monitoring page */}
        <Route path="/identities" element={<IdentityAccessMonitoring />} />
        <Route
          path="/identities/:identityId"
          element={<Navigate to="/identities" replace />}
        />
        <Route path="/access-review" element={<Navigate to="/identities" replace />} />
        <Route path="/access-reviews" element={<Navigate to="/identities" replace />} />
        <Route
          path="/access-reviews/:reviewId"
          element={<Navigate to="/identities" replace />}
        />
        <Route
          path="/privileged-access"
          element={<Navigate to="/identities" replace />}
        />
        <Route
          path="/user-lifecycle"
          element={<Navigate to="/identities" replace />}
        />

        {/* SOAR Queue — unified SOAR-ingested GRC case management */}
        <Route path="/grc-cases" element={<OpenGrcCases />} />

        {/* Governance — policies + KPIs workspace */}
        <Route path="/governance" element={<Governance />} />
        <Route path="/violations" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/violations/:id" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/analysis" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/remediation" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/success" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/incident-timeline" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/evidence" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/tasks" element={<Navigate to="/grc-cases" replace />} />
        <Route path="/tasks/:taskId" element={<Navigate to="/grc-cases" replace />} />

        {/* Compliance — single Asset Compliance page */}
        <Route path="/compliance" element={<AssetCompliance />} />
        <Route
          path="/regulatory-mapping"
          element={<Navigate to="/compliance" replace />}
        />
        <Route
          path="/regulatory-mapping/:frameworkId"
          element={<Navigate to="/compliance" replace />}
        />
        <Route
          path="/regulatory-mapping/:frameworkId/:controlId"
          element={<Navigate to="/compliance" replace />}
        />
        <Route
          path="/compliance/controls"
          element={<Navigate to="/compliance" replace />}
        />
        <Route
          path="/compliance/reports"
          element={<Navigate to="/compliance" replace />}
        />

        {/* Risk Assessment — routed sections (sidebar IA, no in-page tabs) */}
        <Route path="/risk" element={<RiskManagement />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<RiskDashboardPage />} />
          <Route path="register" element={<RiskRegisterPage />} />
          <Route path="new" element={<RiskNewPage />} />
          <Route path="heatmaps" element={<RiskHeatmapsPage />} />
          <Route path="treatment" element={<RiskTreatmentPage />} />
          <Route path="reports" element={<RiskReportsPage />} />
        </Route>
        <Route path="/risk-management" element={<Navigate to="/risk/dashboard" replace />} />
        <Route path="/risks" element={<Navigate to="/risk/register" replace />} />
        <Route path="/risks/:riskId" element={<Navigate to="/risk/register" replace />} />
        <Route path="/risk-register" element={<Navigate to="/risk/register" replace />} />
        <Route
          path="/risk-assessments"
          element={<Navigate to="/risk/register" replace />}
        />
        <Route path="/risk-heatmap" element={<Navigate to="/risk/heatmaps" replace />} />
        <Route path="/risk-controls" element={<Navigate to="/risk/treatment" replace />} />

        {/* Business Continuity — single dashboard */}
        <Route path="/bcm" element={<BusinessContinuity />} />
        <Route path="/bcm/bia" element={<Navigate to="/bcm" replace />} />
        <Route path="/bcm/processes" element={<Navigate to="/bcm" replace />} />
        <Route
          path="/bcm/processes/:processId"
          element={<Navigate to="/bcm" replace />}
        />
        <Route path="/bcm/plans" element={<Navigate to="/bcm" replace />} />
        <Route
          path="/bcm/recovery-objectives"
          element={<Navigate to="/bcm" replace />}
        />

        {/* Disaster Recovery — single dashboard */}
        <Route path="/drp" element={<DisasterRecovery />} />
        <Route path="/drp/plans" element={<Navigate to="/drp" replace />} />
        <Route
          path="/drp/plans/:planId"
          element={<Navigate to="/drp" replace />}
        />
        <Route path="/drp/tests" element={<Navigate to="/drp" replace />} />
        <Route path="/drp/reports" element={<Navigate to="/drp" replace />} />

        {/* Reports — unified workspace */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/reports/executive"
          element={<Navigate to="/reports" replace />}
        />
        <Route
          path="/reports/detailed"
          element={<Navigate to="/reports" replace />}
        />
        <Route
          path="/reports/compliance"
          element={<Navigate to="/reports" replace />}
        />
        <Route
          path="/reports/risk"
          element={<Navigate to="/reports" replace />}
        />
        <Route
          path="/reports/identity"
          element={<Navigate to="/reports" replace />}
        />
        <Route
          path="/reports/bcm"
          element={<Navigate to="/reports" replace />}
        />
        <Route path="/reports/dr" element={<Navigate to="/reports" replace />} />
        <Route path="/reports/new" element={<Navigate to="/reports" replace />} />
        <Route
          path="/reports/:reportId"
          element={<Navigate to="/reports" replace />}
        />

        {/* AI Advisor — floating widget only; route opens assistant then leaves */}
        <Route path="/ai-advisor" element={<AiAdvisorRedirect />} />
        <Route path="/ai-insights" element={<Navigate to="/ai-advisor" replace />} />
        <Route
          path="/ai/recommendations"
          element={<Navigate to="/ai-advisor" replace />}
        />
        <Route
          path="/ai/risk-explanation"
          element={<Navigate to="/ai-advisor" replace />}
        />
        <Route path="/copilot" element={<Navigate to="/ai-advisor" replace />} />

        {/* Administration */}
        <Route
          path="/settings"
          element={<Navigate to="/settings/users" replace />}
        />
        <Route
          path="/settings/users"
          element={
            <Shell
              title="Users"
              description="User administration placeholder. Authorization is presentation-only."
            />
          }
        />
        <Route
          path="/settings/roles"
          element={
            <Shell
              title="Roles"
              description="Role catalogue placeholder (not authoritative)."
            />
          }
        />
        <Route
          path="/settings/permissions"
          element={
            <Shell
              title="Permissions"
              description="Permission matrix placeholder. Client-side checks are not authorization."
            />
          }
        />
        <Route
          path="/settings/integrations"
          element={
            <Shell
              title="Integrations"
              description="SIEM and SOAR connection placeholders. No credentials are stored."
            />
          }
        />
        <Route
          path="/settings/api"
          element={
            <Shell
              title="API Settings"
              description="API configuration placeholder. Secrets must not be stored in the browser."
            />
          }
        />
        <Route
          path="/settings/audit-logs"
          element={
            <Shell
              title="Audit Logs"
              description="Local mock audit-log viewer."
            />
          }
        />
        <Route
          path="/settings/notifications"
          element={
            <Shell
              title="Notifications"
              description="Notification preference placeholders."
            />
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

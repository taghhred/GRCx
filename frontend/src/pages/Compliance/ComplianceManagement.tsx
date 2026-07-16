import { ComplianceModuleProvider } from "../../services/compliance/ComplianceModuleContext";
import ComplianceLayout from "./ComplianceLayout";

/** Provider wrapper used by the nested /compliance/* route tree. */
export default function ComplianceManagement() {
  return (
    <ComplianceModuleProvider>
      <ComplianceLayout />
    </ComplianceModuleProvider>
  );
}

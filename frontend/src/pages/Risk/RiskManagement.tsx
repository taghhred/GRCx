import { RiskModuleProvider } from "../../services/risk/RiskModuleContext";
import RiskAssessmentLayout from "./RiskAssessmentLayout";

/** Provider wrapper used by the nested /risk/* route tree. */
export default function RiskManagement() {
  return (
    <RiskModuleProvider>
      <RiskAssessmentLayout />
    </RiskModuleProvider>
  );
}

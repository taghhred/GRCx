import PageHeader from "../../components/ui/PageHeader";
import RiskTreatmentSection from "../../components/risk/sections/RiskTreatmentSection";

export default function RiskTreatmentPage() {
  return (
    <>
      <PageHeader
        title="Treatment & Mitigation"
        description="Track mitigation, transfer, acceptance, and avoidance decisions across the risk portfolio."
      />
      <RiskTreatmentSection />
    </>
  );
}

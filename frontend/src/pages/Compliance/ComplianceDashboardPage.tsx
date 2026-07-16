import PageHeader from "../../components/ui/PageHeader";
import ComplianceDashboardSection from "../../components/compliance/sections/ComplianceDashboardSection";

export default function ComplianceDashboardPage() {
  return (
    <>
      <PageHeader
        title="Compliance Management"
        description="Monitor control posture, findings, evidence, and assessments across the combined compliance portfolio."
      />
      <ComplianceDashboardSection />
    </>
  );
}

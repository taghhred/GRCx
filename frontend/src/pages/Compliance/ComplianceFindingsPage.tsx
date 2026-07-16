import PageHeader from "../../components/ui/PageHeader";
import ComplianceFindingsSection from "../../components/compliance/sections/ComplianceFindingsSection";

export default function ComplianceFindingsPage() {
  return (
    <>
      <PageHeader
        title="Compliance Findings"
        description="Review findings derived from non-compliant controls and assessment gaps."
      />
      <ComplianceFindingsSection />
    </>
  );
}

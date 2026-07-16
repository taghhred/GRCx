import PageHeader from "../../components/ui/PageHeader";
import ComplianceFrameworksSection from "../../components/compliance/sections/ComplianceFrameworksSection";

export default function ComplianceFrameworksPage() {
  return (
    <>
      <PageHeader
        title="Frameworks"
        description="Framework posture cards across ISO, NCA ECC, PCI DSS, SAMA CSF, NIST CSF, PDPL, and ISO 22301."
      />
      <ComplianceFrameworksSection />
    </>
  );
}

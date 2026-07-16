import PageHeader from "../../components/ui/PageHeader";
import ComplianceEvidenceSection from "../../components/compliance/sections/ComplianceEvidenceSection";

export default function ComplianceEvidencePage() {
  return (
    <>
      <PageHeader
        title="Compliance Evidence"
        description="Track evidence inventory, review status, versions, and expiry dates."
      />
      <ComplianceEvidenceSection />
    </>
  );
}

import PageHeader from "../../components/ui/PageHeader";
import ComplianceReportsSection from "../../components/compliance/sections/ComplianceReportsSection";

export default function ComplianceReportsPage() {
  return (
    <>
      <PageHeader
        title="Compliance Reports"
        description="Generate Excel report packs from the live compliance portfolio."
      />
      <ComplianceReportsSection />
    </>
  );
}

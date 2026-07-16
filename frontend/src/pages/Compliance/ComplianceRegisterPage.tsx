import PageHeader from "../../components/ui/PageHeader";
import ComplianceRegisterSection from "../../components/compliance/sections/ComplianceRegisterSection";

export default function ComplianceRegisterPage() {
  return (
    <>
      <PageHeader
        title="Compliance Register"
        description="Search, filter, and manage control compliance records. Import and export Excel workbooks without leaving this page."
      />
      <ComplianceRegisterSection />
    </>
  );
}

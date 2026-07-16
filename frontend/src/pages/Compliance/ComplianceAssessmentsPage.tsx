import PageHeader from "../../components/ui/PageHeader";
import ComplianceAssessmentsSection from "../../components/compliance/sections/ComplianceAssessmentsSection";

export default function ComplianceAssessmentsPage() {
  return (
    <>
      <PageHeader
        title="Compliance Assessments"
        description="Assessment results, gaps, recommendations, and approval workflow status."
      />
      <ComplianceAssessmentsSection />
    </>
  );
}

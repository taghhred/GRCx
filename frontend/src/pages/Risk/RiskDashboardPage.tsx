import PageHeader from "../../components/ui/PageHeader";
import RiskOverviewSection from "../../components/risk/sections/RiskOverviewSection";

export default function RiskDashboardPage() {
  return (
    <>
      <PageHeader
        title="Risk Overview"
        description="Identify, evaluate, prioritize, monitor, and treat organizational risks across all business units."
      />
      <RiskOverviewSection />
    </>
  );
}

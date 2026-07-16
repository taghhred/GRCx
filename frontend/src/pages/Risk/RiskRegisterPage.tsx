import PageHeader from "../../components/ui/PageHeader";
import RiskRegisterSection from "../../components/risk/sections/RiskRegisterSection";

export default function RiskRegisterPage() {
  return (
    <>
      <PageHeader
        title="Risk Register"
        description="Search, filter, and manage the enterprise risk inventory. Import and export Excel workbooks without leaving this page."
      />
      <RiskRegisterSection />
    </>
  );
}

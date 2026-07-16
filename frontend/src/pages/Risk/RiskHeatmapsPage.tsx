import PageHeader from "../../components/ui/PageHeader";
import RiskHeatmapSection from "../../components/risk/sections/RiskHeatmapSection";

export default function RiskHeatmapsPage() {
  return (
    <>
      <PageHeader
        title="Risk Heat Maps"
        description="Interactive residual risk matrix for scoring posture across likelihood and impact."
      />
      <RiskHeatmapSection />
    </>
  );
}

/**
 * AI Integration Layer — isolated abstraction for future GRCx AI wiring.
 * Do NOT call external AI providers from here.
 */

export interface RiskAiContext {
  riskId?: string;
  title?: string;
  category?: string;
  description?: string;
  framework?: string;
  controls?: string[];
  evidenceNames?: string[];
  incidents?: string[];
  policies?: string[];
  residualLevel?: string;
  treatment?: string;
}

export interface RiskAiRecommendation {
  summary: string;
  treatmentRecommendations: string[];
  controlGaps: string[];
  complianceMapping: string[];
  executiveBullets: string[];
  provider: "stub";
  prototype: true;
}

export interface RiskAiProvider {
  readonly name: string;
  analyzeRisk(context: RiskAiContext): Promise<RiskAiRecommendation>;
}

class StubRiskAiProvider implements RiskAiProvider {
  readonly name = "stub";

  async analyzeRisk(context: RiskAiContext): Promise<RiskAiRecommendation> {
    const title = context.title ?? "Selected risk";
    const level = context.residualLevel ?? "Medium";
    return {
      summary: `Prototype analysis for “${title}”. Residual posture appears ${level}. Connect a local AI provider to generate live advisory content.`,
      treatmentRecommendations: [
        "Prioritize control effectiveness testing for mapped frameworks.",
        "Confirm evidence freshness before residual score acceptance.",
        "Schedule owner review before the next review date.",
      ],
      controlGaps: [
        "Verify MFA / privileged access coverage on affected assets.",
        "Confirm monitoring use-cases exist for the stated threat scenario.",
      ],
      complianceMapping: context.framework
        ? [`Align remediations to ${context.framework} control statements.`]
        : ["Map the risk to ISO 27001 / NCA ECC control families."],
      executiveBullets: [
        `${title} remains under active Risk Assessment governance.`,
        "No external AI model was invoked — response is a local stub.",
      ],
      provider: "stub",
      prototype: true,
    };
  }
}

let activeProvider: RiskAiProvider = new StubRiskAiProvider();

/** Swap providers later (LocalAI, etc.) without touching UI modules. */
export function setRiskAiProvider(provider: RiskAiProvider): void {
  activeProvider = provider;
}

export function getRiskAiProvider(): RiskAiProvider {
  return activeProvider;
}

export async function analyzeRiskWithAi(
  context: RiskAiContext
): Promise<RiskAiRecommendation> {
  return activeProvider.analyzeRisk(context);
}

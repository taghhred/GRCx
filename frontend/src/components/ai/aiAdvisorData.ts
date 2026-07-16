export type ChatRole = "user" | "assistant" | "system";

export interface AdvisorSource {
  id: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Citation IDs from grounded advisor reply */
  sources?: AdvisorSource[];
  /** True when content is a local prototype stub (not live AI). */
  isPrototype?: boolean;
  /** True when this bubble is a safe user-facing error. */
  isError?: boolean;
  /** When set, UI may offer Retry for this failed turn. */
  canRetry?: boolean;
  /** Prompt that failed (used by Retry). */
  retryPrompt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
}

export const AI_QUICK_ACTIONS = [
  "Explain this violation",
  "Review current page",
  "Generate remediation steps",
  "Map to NCA ECC",
  "Summarize selected case",
  "Explain risk score",
] as const;

export const AI_CAPABILITIES = [
  "Explain a violation",
  "Review a GRC case",
  "Analyze a risk",
  "Map controls to NCA ECC",
  "Explain SAMA CSF requirements",
  "Suggest remediation",
  "Summarize compliance findings",
  "Review business continuity or disaster recovery information",
] as const;

export const DEMO_RECENT_CONVERSATIONS: ConversationSummary[] = [
  {
    id: "c1",
    title: "NCA ECC control mapping",
    updatedAt: "Today",
  },
  {
    id: "c2",
    title: "Privileged access review",
    updatedAt: "Yesterday",
  },
  {
    id: "c3",
    title: "Violation remediation draft",
    updatedAt: "Mon",
  },
];

export const DEMO_PINNED_PROMPTS = [
  "Map current controls to NCA ECC",
  "Draft executive risk summary",
  "Explain open critical violations",
] as const;

export const DEMO_ASSISTANT_REPLY =
  "This is a UI prototype only. No AI model is connected yet. Your message was captured in this browser session so the conversation layout can be reviewed. A secure advisory service will be wired here later, using the current page context.";

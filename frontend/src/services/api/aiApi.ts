import { apiRequest } from "./client";
import { isMocksEnabled } from "./config";

export interface AiChatPayload {
  messages: Array<{ role: string; content: string }>;
  page_context?: Record<string, string | null | undefined>;
  conversation_id?: string;
}

export interface AiChatResult {
  reply: string;
  provider: string;
  prototype: boolean;
}

/**
 * Sends chat to local FastAPI when mocks are disabled.
 * Returns null when mocks are on — caller should keep stub UI behavior.
 */
export interface AiAdvisorChatPayload {
  message: string;
  history?: Array<{ role: string; content: string }>;
  module?: string | null;
  lang?: string;
  page_context?: Record<string, string | null | undefined>;
}

export interface AiAdvisorChatResult {
  reply: string;
  sources: Array<{ id: string; title?: string }>;
  grounded: boolean;
  refused: boolean;
  model?: string | null;
  provider: string;
  prototype: boolean;
}

/**
 * Grounded GRC advisor — server-side LLM + legal corpus.
 */
export async function sendAdvisorChat(
  payload: AiAdvisorChatPayload
): Promise<AiAdvisorChatResult | null> {
  if (isMocksEnabled()) return null;
  return apiRequest<AiAdvisorChatResult>("/ai/advisor/chat", {
    method: "POST",
    body: {
      message: payload.message,
      history: payload.history ?? [],
      module: payload.module ?? payload.page_context?.moduleLabel ?? null,
      lang: payload.lang ?? "auto",
      page_context: payload.page_context ?? {},
    },
  });
}

/**
 * Legacy chat endpoint (kept for compatibility).
 */
export async function sendAiChat(
  payload: AiChatPayload
): Promise<AiChatResult | null> {
  if (isMocksEnabled()) return null;
  return apiRequest<AiChatResult>("/ai/chat", {
    method: "POST",
    body: {
      messages: payload.messages,
      page_context: payload.page_context ?? {},
      conversation_id: payload.conversation_id,
    },
  });
}

/* eslint-disable react-refresh/only-export-components -- provider + hook co-located */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { resolvePageTitle } from "../layout/Sidebar/navConfig";
import { CHAT_MESSAGE_MAX_LENGTH } from "../../utils/security";
import { isMocksEnabled } from "../../services/api/config";
import { ApiError } from "../../services/api/client";
import {
  DEMO_ASSISTANT_REPLY,
  type ChatMessage,
} from "./aiAdvisorData";
import {
  getAiSelection,
  subscribeAiSelection,
} from "./aiSelectionBridge";

/**
 * Session-only AI Advisor state.
 * Conversations, size, and position reset on full page refresh —
 * no localStorage for sensitive GRC chat content.
 * Messages persist across in-app navigation while the SPA session lives.
 */

/** minimized = avatar FAB (default); docked = Intercom-style peek */
export type AiAdvisorMode =
  | "minimized"
  | "docked"
  | "compact"
  | "expanded"
  | "popout";

export interface AiPanelSize {
  width: number;
  height: number;
}

/** Bottom-right offsets for panel (or avatar when docked). */
export interface AiPanelPosition {
  right: number;
  bottom: number;
}

export interface AiPageContext {
  pathname: string;
  moduleLabel: string;
  selectedCaseId?: string;
  selectedAssetId?: string;
  selectedRiskId?: string;
  selectedFramework?: string;
  assignedAuditor?: string;
  dateRangeLabel?: string;
  entityTitle?: string;
}

interface AiAdvisorContextValue {
  mode: AiAdvisorMode;
  isOpen: boolean;
  isMinimized: boolean;
  isDocked: boolean;
  isExpanded: boolean;
  isPopout: boolean;
  panelSize: AiPanelSize;
  panelPosition: AiPanelPosition;
  conversationId: string;
  messages: ChatMessage[];
  draftMessage: string;
  isTyping: boolean;
  unreadCount: number;
  pageContext: AiPageContext;
  setDraftMessage: (value: string) => void;
  setPanelSize: (size: AiPanelSize) => void;
  setPanelPosition: (pos: AiPanelPosition) => void;
  open: () => void;
  openCompact: () => void;
  expand: () => void;
  compact: () => void;
  minimize: () => void;
  dock: () => void;
  popOut: () => void;
  close: () => void;
  clearConversation: () => void;
  newConversation: () => void;
  sendMessage: (raw?: string) => void;
  retryLastFailed: () => void;
}

const DEFAULT_COMPACT: AiPanelSize = { width: 420, height: 580 };
const DEFAULT_POSITION: AiPanelPosition = { right: 24, bottom: 24 };

export const AI_PANEL_LIMITS = {
  minWidth: 360,
  minHeight: 420,
  maxWidth: 760,
  maxHeightVh: 0.85,
} as const;

const TYPING_DELAY_MS = 1800;
const SAFE_UNAVAILABLE =
  "The AI Advisor is temporarily unavailable. Please try again shortly.";
const SAFE_TIMEOUT =
  "The AI Advisor timed out. Please try again shortly.";
const SAFE_EMPTY = "Please enter a question for the AI Advisor.";

const AiAdvisorContext = createContext<AiAdvisorContextValue | null>(null);

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function clampSize(size: AiPanelSize): AiPanelSize {
  const maxH = Math.floor(window.innerHeight * AI_PANEL_LIMITS.maxHeightVh);
  const maxW = Math.min(AI_PANEL_LIMITS.maxWidth, window.innerWidth - 32);
  return {
    width: Math.min(maxW, Math.max(AI_PANEL_LIMITS.minWidth, size.width)),
    height: Math.min(maxH, Math.max(AI_PANEL_LIMITS.minHeight, size.height)),
  };
}

function clampPosition(
  pos: AiPanelPosition,
  size: AiPanelSize
): AiPanelPosition {
  const maxRight = Math.max(8, window.innerWidth - size.width - 8);
  const maxBottom = Math.max(8, window.innerHeight - size.height - 8);
  return {
    right: Math.min(maxRight, Math.max(8, pos.right)),
    bottom: Math.min(maxBottom, Math.max(8, pos.bottom)),
  };
}

function resolveModuleLabel(pathname: string): string {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/grc-cases")) return "SOAR Queue";
  if (pathname.startsWith("/identities")) return "Identity & Access";
  if (pathname.startsWith("/risk")) return "Risk Assessment";
  if (pathname.startsWith("/compliance")) return "Asset Compliance";
  if (pathname.startsWith("/bcm")) return "Business Continuity";
  if (pathname.startsWith("/drp")) return "Disaster Recovery";
  if (pathname.startsWith("/reports")) return "Reports";
  return resolvePageTitle(pathname) ?? "GRCx";
}

function riskIdFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search);
  const caseId = params.get("case");
  return caseId || undefined;
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 504) return SAFE_TIMEOUT;
    if (err.status === 0 || err.code === "network") return SAFE_UNAVAILABLE;
    if (typeof err.message === "string" && err.message.includes("unavailable")) {
      return SAFE_UNAVAILABLE;
    }
    if (err.status === 503 || err.status === 502) return SAFE_UNAVAILABLE;
  }
  return SAFE_UNAVAILABLE;
}

export function AiAdvisorProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const selection = useSyncExternalStore(
    subscribeAiSelection,
    getAiSelection,
    getAiSelection
  );

  const [mode, setMode] = useState<AiAdvisorMode>("minimized");
  const [panelSize, setPanelSizeState] = useState<AiPanelSize>(DEFAULT_COMPACT);
  const [panelPosition, setPanelPositionState] =
    useState<AiPanelPosition>(DEFAULT_POSITION);
  const [lastOpenSize, setLastOpenSize] = useState<AiPanelSize>(DEFAULT_COMPACT);
  const [conversationId, setConversationId] = useState(() => createId("conv"));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);
  const modeRef = useRef(mode);
  const messagesRef = useRef(messages);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const pageContext = useMemo<AiPageContext>(() => {
    const riskFromUrl = riskIdFromSearch(location.search);
    return {
      pathname: location.pathname,
      moduleLabel: resolveModuleLabel(location.pathname),
      selectedCaseId: selection.selectedCaseId,
      selectedAssetId: selection.selectedAssetId,
      selectedRiskId: selection.selectedRiskId ?? riskFromUrl,
      selectedFramework: selection.selectedFramework,
      assignedAuditor: selection.assignedAuditor,
      dateRangeLabel: selection.dateRangeLabel,
      entityTitle: selection.entityTitle,
    };
  }, [location.pathname, location.search, selection]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const setPanelSize = useCallback((size: AiPanelSize) => {
    const next = clampSize(size);
    setPanelSizeState(next);
    setLastOpenSize(next);
  }, []);

  const setPanelPosition = useCallback((pos: AiPanelPosition) => {
    setPanelPositionState(() => {
      const size =
        modeRef.current === "minimized" || modeRef.current === "docked"
          ? { width: 72, height: 72 }
          : panelSize;
      return clampPosition(pos, size);
    });
  }, [panelSize]);

  const openCompact = useCallback(() => {
    const size = clampSize(lastOpenSize.width >= 360 ? lastOpenSize : DEFAULT_COMPACT);
    setPanelSizeState(size);
    setPanelPositionState((prev) => clampPosition(prev, size));
    setMode("compact");
    setUnreadCount(0);
  }, [lastOpenSize]);

  const open = openCompact;

  const expand = useCallback(() => {
    const size = clampSize({
      width: 660,
      height: Math.round(window.innerHeight * 0.72),
    });
    setPanelSizeState(size);
    setLastOpenSize(size);
    setPanelPositionState((prev) => clampPosition(prev, size));
    setMode("expanded");
    setUnreadCount(0);
  }, []);

  const compact = useCallback(() => {
    const size = clampSize(DEFAULT_COMPACT);
    setPanelSizeState(size);
    setLastOpenSize(size);
    setMode("compact");
    setUnreadCount(0);
  }, []);

  const minimize = useCallback(() => {
    setMode("minimized");
    setPanelPositionState(DEFAULT_POSITION);
  }, []);

  const dock = useCallback(() => {
    setMode("docked");
    setPanelPositionState({ right: 0, bottom: 24 });
  }, []);

  const popOut = useCallback(() => {
    const size = clampSize({
      width: 720,
      height: Math.round(window.innerHeight * 0.8),
    });
    setPanelSizeState(size);
    setLastOpenSize(size);
    setPanelPositionState(
      clampPosition(
        {
          right: Math.max(24, Math.round((window.innerWidth - size.width) / 2)),
          bottom: Math.max(
            24,
            Math.round((window.innerHeight - size.height) / 2)
          ),
        },
        size
      )
    );
    setMode("popout");
    setUnreadCount(0);
  }, []);

  /** Close chat → Intercom-style partial hide */
  const close = useCallback(() => {
    setMode("docked");
    setPanelPositionState({ right: 0, bottom: 24 });
  }, []);

  const clearConversation = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    sendingRef.current = false;
    setMessages([]);
    setIsTyping(false);
    setDraftMessage("");
    setUnreadCount(0);
  }, []);

  const newConversation = useCallback(() => {
    clearConversation();
    setConversationId(createId("conv"));
  }, [clearConversation]);

  const sendMessage = useCallback(
    (raw?: string) => {
      const content = (raw ?? draftMessage).trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
      if (!content) {
        const notice: ChatMessage = {
          id: createId("assistant"),
          role: "assistant",
          content: SAFE_EMPTY,
          createdAt: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, notice]);
        return;
      }
      if (sendingRef.current || isTyping) return;

      const userMessage: ChatMessage = {
        id: createId("user"),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      const history = [...messagesRef.current, userMessage];
      messagesRef.current = history;
      sendingRef.current = true;
      setMessages(history);
      setDraftMessage("");
      setIsTyping(true);

      const finishOk = (
        reply: string,
        isPrototype: boolean,
        sources?: Array<{ id: string; title?: string }>
      ) => {
        const assistantMessage: ChatMessage = {
          id: createId("assistant"),
          role: "assistant",
          content: reply,
          createdAt: new Date().toISOString(),
          isPrototype,
          sources: sources?.length ? sources : undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        sendingRef.current = false;
        typingTimerRef.current = null;
        const m = modeRef.current;
        if (m === "minimized" || m === "docked") {
          setUnreadCount((n) => n + 1);
        }
      };

      const finishError = (text: string) => {
        const assistantMessage: ChatMessage = {
          id: createId("assistant"),
          role: "assistant",
          content: text,
          createdAt: new Date().toISOString(),
          isError: true,
          canRetry: true,
          retryPrompt: content,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        sendingRef.current = false;
        typingTimerRef.current = null;
      };

      void (async () => {
        // Prototype mocks path only
        if (isMocksEnabled()) {
          typingTimerRef.current = setTimeout(() => {
            finishOk(DEMO_ASSISTANT_REPLY, true);
          }, TYPING_DELAY_MS);
          return;
        }

        try {
          const { sendAdvisorChat } = await import("../../services/api/aiApi");
          const priorHistory = messagesRef.current.map((m) => ({
            role: m.role,
            content: m.content,
          }));
          const apiResult = await sendAdvisorChat({
            message: content,
            history: priorHistory,
            module: pageContext.moduleLabel,
            lang: "auto",
            page_context: {
              moduleLabel: pageContext.moduleLabel,
              selectedCaseId: pageContext.selectedCaseId ?? null,
              selectedRiskId: pageContext.selectedRiskId ?? null,
              selectedFramework: pageContext.selectedFramework ?? null,
              assignedAuditor: pageContext.assignedAuditor ?? null,
            },
          });
          if (apiResult?.reply?.trim()) {
            finishOk(
              apiResult.reply,
              Boolean(apiResult.prototype),
              apiResult.sources
            );
            return;
          }
          finishError(SAFE_UNAVAILABLE);
        } catch (err) {
          finishError(mapApiError(err));
        }
      })();
    },
    [draftMessage, isTyping, pageContext, conversationId]
  );

  const retryLastFailed = useCallback(() => {
    const failed = [...messages].reverse().find((m) => m.canRetry && m.retryPrompt);
    if (!failed?.retryPrompt || sendingRef.current || isTyping) return;
    // Drop the error bubble so retry does not stack noise
    setMessages((prev) => prev.filter((m) => m.id !== failed.id));
    sendMessage(failed.retryPrompt);
  }, [messages, isTyping, sendMessage]);

  const value = useMemo<AiAdvisorContextValue>(
    () => ({
      mode,
      isOpen: mode === "compact" || mode === "expanded" || mode === "popout",
      isMinimized: mode === "minimized",
      isDocked: mode === "docked",
      isExpanded: mode === "expanded" || mode === "popout",
      isPopout: mode === "popout",
      panelSize,
      panelPosition,
      conversationId,
      messages,
      draftMessage,
      isTyping,
      unreadCount,
      pageContext,
      setDraftMessage,
      setPanelSize,
      setPanelPosition,
      open,
      openCompact,
      expand,
      compact,
      minimize,
      dock,
      popOut,
      close,
      clearConversation,
      newConversation,
      sendMessage,
      retryLastFailed,
    }),
    [
      mode,
      panelSize,
      panelPosition,
      conversationId,
      messages,
      draftMessage,
      isTyping,
      unreadCount,
      pageContext,
      setPanelSize,
      setPanelPosition,
      open,
      openCompact,
      expand,
      compact,
      minimize,
      dock,
      popOut,
      close,
      clearConversation,
      newConversation,
      sendMessage,
      retryLastFailed,
    ]
  );

  return (
    <AiAdvisorContext.Provider value={value}>{children}</AiAdvisorContext.Provider>
  );
}

export function useAiAdvisor(): AiAdvisorContextValue {
  const ctx = useContext(AiAdvisorContext);
  if (!ctx) {
    throw new Error("useAiAdvisor must be used within AiAdvisorProvider");
  }
  return ctx;
}

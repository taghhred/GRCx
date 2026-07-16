import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  Minus,
  PanelRightClose,
  X,
} from "lucide-react";
import { AI_PANEL_LIMITS, useAiAdvisor } from "./AiAdvisorContext";
import { AI_CAPABILITIES } from "./aiAdvisorData";
import AiSuggestionChips from "./AiSuggestionChips";
import AiChatInput from "./AiChatInput";
import AiMessageList from "./AiMessageList";
import { SaudiAdvisorPortrait } from "./SaudiAdvisorPortrait";
import styles from "./AiAdvisorFloating.module.css";

type LocationAiState = { openAiAdvisor?: boolean };

export default function AiAdvisorFloating() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isOpen,
    isMinimized,
    isDocked,
    isExpanded,
    isPopout,
    panelSize,
    panelPosition,
    messages,
    draftMessage,
    isTyping,
    unreadCount,
    pageContext,
    setDraftMessage,
    setPanelSize,
    setPanelPosition,
    openCompact,
    expand,
    compact,
    minimize,
    dock,
    popOut,
    close,
    sendMessage,
    retryLastFailed,
  } = useAiAdvisor();

  const transcriptRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const draggingRef = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
  } | null>(null);

  useEffect(() => {
    const state = location.state as LocationAiState | null;
    if (!state?.openAiAdvisor) return;
    openCompact();
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location, navigate, openCompact]);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (resizingRef.current) {
        const start = resizingRef.current;
        const deltaX = start.startX - event.clientX;
        const deltaY = start.startY - event.clientY;
        setPanelSize({
          width: start.startW + deltaX,
          height: start.startH + deltaY,
        });
        return;
      }
      if (draggingRef.current) {
        const start = draggingRef.current;
        const deltaX = event.clientX - start.startX;
        const deltaY = event.clientY - start.startY;
        setPanelPosition({
          right: start.startRight - deltaX,
          bottom: start.startBottom - deltaY,
        });
      }
    };

    const onUp = () => {
      resizingRef.current = null;
      draggingRef.current = null;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setPanelSize, setPanelPosition]);

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    resizingRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startW: panelSize.width,
      startH: panelSize.height,
    };
    document.body.style.userSelect = "none";
  };

  const startDrag = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    draggingRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startRight: panelPosition.right,
      startBottom: panelPosition.bottom,
    };
    document.body.style.userSelect = "none";
  };

  const hasConversation = messages.length > 0 || isTyping;
  const showAvatar = isMinimized || isDocked;

  const contextLines = [
    `Current Module: ${pageContext.moduleLabel}`,
    pageContext.selectedRiskId || pageContext.selectedCaseId
      ? `Current Selected Case: ${pageContext.selectedRiskId ?? pageContext.selectedCaseId}`
      : null,
    pageContext.entityTitle ? `Title: ${pageContext.entityTitle}` : null,
    pageContext.selectedFramework
      ? `Framework: ${pageContext.selectedFramework}`
      : null,
    pageContext.assignedAuditor
      ? `Assigned Auditor: ${pageContext.assignedAuditor}`
      : null,
    pageContext.selectedAssetId
      ? `Selected Asset: ${pageContext.selectedAssetId}`
      : null,
    pageContext.dateRangeLabel
      ? `Date Range: ${pageContext.dateRangeLabel}`
      : null,
  ].filter(Boolean) as string[];

  const shellStyle: React.CSSProperties = {
    right: panelPosition.right,
    bottom: panelPosition.bottom,
  };

  return (
    <div className={styles.root} style={shellStyle}>
      {isOpen ? (
        <section
          className={`${styles.panel} ${isPopout ? styles.panelPopout : ""}`}
          style={{ width: panelSize.width, height: panelSize.height }}
          role="dialog"
          aria-label="GRCx AI Advisor"
        >
          <button
            type="button"
            className={styles.resizeHandle}
            aria-label={`Resize panel. Minimum ${AI_PANEL_LIMITS.minWidth} by ${AI_PANEL_LIMITS.minHeight} pixels`}
            onPointerDown={startResize}
          />

          <header className={styles.header} onPointerDown={startDrag}>
            <div className={styles.headerIdentity}>
              <div className={styles.headerAvatar} aria-hidden>
                <SaudiAdvisorPortrait />
              </div>
              <div className={styles.headerText}>
                <h2>GRCx AI Advisor</h2>
                <p>Governance, Risk &amp; Compliance Assistant</p>
                <div className={styles.contextStack}>
                  {contextLines.map((line) => (
                    <span key={line} className={styles.contextBadge}>
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Collapse to edge"
                title="Collapse"
                onClick={dock}
              >
                <PanelRightClose size={15} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={isExpanded && !isPopout ? "Compact view" : "Expand"}
                title={isExpanded && !isPopout ? "Compact" : "Expand"}
                onClick={() => (isExpanded && !isPopout ? compact() : expand())}
              >
                {isExpanded && !isPopout ? (
                  <Minimize2 size={15} aria-hidden />
                ) : (
                  <Maximize2 size={15} aria-hidden />
                )}
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Pop out"
                title="Pop-out"
                onClick={popOut}
              >
                <ExternalLink size={14} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Minimize to avatar"
                title="Minimize"
                onClick={minimize}
              >
                <Minus size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Hide assistant"
                title="Close"
                onClick={close}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </header>

          <div className={styles.body} ref={transcriptRef}>
            {!hasConversation ? (
              <div className={styles.welcome}>
                <h3>Hello, I’m your GRCx AI Advisor.</h3>
                <p className={styles.welcomeLead}>
                  I already see you are on <strong>{pageContext.moduleLabel}</strong>
                  {pageContext.selectedRiskId || pageContext.selectedCaseId
                    ? ` with case ${pageContext.selectedRiskId ?? pageContext.selectedCaseId}`
                    : ""}
                  . Ask anything about this context.
                </p>
                <p className={styles.welcomeLead}>I can help you with:</p>
                <ul className={styles.welcomeList}>
                  {AI_CAPABILITIES.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <AiMessageList
                messages={messages}
                isTyping={isTyping}
                onRetry={retryLastFailed}
              />
            )}
          </div>

          <div className={styles.footer}>
            {!hasConversation ? (
              <AiSuggestionChips
                onSelect={(prompt) => sendMessage(prompt)}
                disabled={isTyping}
              />
            ) : null}
            <AiChatInput
              value={draftMessage}
              onChange={setDraftMessage}
              onSubmit={() => sendMessage()}
              disabled={isTyping}
              placeholder="Ask about the current GRCx page, case, risk, control, or policy..."
              compact
            />
            <p className={styles.disclaimer}>
              Session-only chat. Messages reset on full page refresh. Requests go
              through the GRCx backend — the browser never calls the AI service
              directly.
            </p>
          </div>
        </section>
      ) : null}

      {showAvatar ? (
        <button
          type="button"
          className={`${styles.launcher} ${isDocked ? styles.docked : ""}`}
          aria-label={
            isDocked
              ? "Restore GRCx AI Advisor"
              : "Open GRCx AI Advisor"
          }
          title={isDocked ? "Restore AI Advisor" : "Open GRCx AI Advisor"}
          onClick={openCompact}
        >
          {isTyping ? <span className={styles.typingRing} aria-hidden /> : null}
          <span className={styles.launcherFace}>
            <SaudiAdvisorPortrait />
          </span>
          {unreadCount > 0 ? (
            <span className={styles.badge} aria-label={`${unreadCount} unread`}>
              {unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}

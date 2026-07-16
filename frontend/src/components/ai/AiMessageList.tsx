import { User } from "lucide-react";
import type { ChatMessage } from "./aiAdvisorData";
import AIAdvisorAvatar from "./AIAdvisorAvatar";
import styles from "./AiMessageList.module.css";

interface AiMessageListProps {
  messages: ChatMessage[];
  /** True while simulating / waiting for an assistant reply */
  isTyping?: boolean;
  onRetry?: () => void;
}

export default function AiMessageList({
  messages,
  isTyping = false,
  onRetry,
}: AiMessageListProps) {
  return (
    <div className={styles.list} role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <article
            key={message.id}
            className={`${styles.row} ${isUser ? styles.userRow : styles.assistantRow}`}
          >
            {isUser ? (
              <div className={`${styles.avatar} ${styles.userAvatar}`} aria-hidden>
                <User size={16} />
              </div>
            ) : (
              <AIAdvisorAvatar
                status={message.isError ? "idle" : "complete"}
                size="sm"
                showLabel={false}
                className={styles.advisorSlot}
              />
            )}
            <div className={`${styles.bubble} ${message.isError ? styles.errorBubble : ""}`}>
              <header className={styles.meta}>
                <span className={styles.role}>
                  {isUser ? "You" : "GRCx AI Advisor"}
                </span>
                {!isUser && message.isPrototype ? (
                  <span className={styles.prototypeTag}>Prototype response</span>
                ) : null}
                <time dateTime={message.createdAt} className={styles.time}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </header>
              <p className={styles.content}>{message.content}</p>
              {!isUser && message.sources && message.sources.length > 0 ? (
                <div className={styles.sources} aria-label="Reference sources">
                  {message.sources.map((src) => (
                    <span key={src.id} className={styles.sourceChip} title={src.title || src.id}>
                      {src.id}
                    </span>
                  ))}
                </div>
              ) : null}
              {!isUser && message.canRetry && onRetry ? (
                <button
                  type="button"
                  className={styles.retryBtn}
                  onClick={onRetry}
                >
                  Retry
                </button>
              ) : null}
            </div>
          </article>
        );
      })}

      {isTyping ? (
        <article className={`${styles.row} ${styles.assistantRow} ${styles.typingRow}`}>
          <AIAdvisorAvatar status="typing" size="md" showLabel />
          <div className={`${styles.bubble} ${styles.typingBubble}`}>
            <span className={styles.srOnly}>GRCx AI Advisor is analyzing</span>
            <span className={styles.typingText} aria-hidden="true">
              Analyzing
              <span className={styles.inlineDots}>
                <span />
                <span />
                <span />
              </span>
            </span>
          </div>
        </article>
      ) : null}
    </div>
  );
}

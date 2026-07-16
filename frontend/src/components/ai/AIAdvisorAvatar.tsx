import { SaudiAdvisorPortrait } from "./SaudiAdvisorPortrait";
import styles from "./AIAdvisorAvatar.module.css";

export type AdvisorAvatarStatus = "idle" | "typing" | "complete";

export type AdvisorAvatarSize = "sm" | "md" | "lg";

interface AIAdvisorAvatarProps {
  status?: AdvisorAvatarStatus;
  size?: AdvisorAvatarSize;
  /** Show “GRCx AI Advisor” / “Typing...” under the avatar */
  showLabel?: boolean;
  className?: string;
}

/**
 * AI Advisor avatar using the project image at src/assets/images/man.jpg.
 */
export default function AIAdvisorAvatar({
  status = "idle",
  size = "md",
  showLabel = true,
  className = "",
}: AIAdvisorAvatarProps) {
  const isTyping = status === "typing";
  const label = isTyping ? "Typing..." : "GRCx AI Advisor";

  return (
    <div
      className={`${styles.root} ${styles[size]} ${isTyping ? styles.typing : ""} ${className}`}
      data-status={status}
    >
      <div className={styles.ring} aria-hidden="true">
        <div className={styles.figure}>
          <SaudiAdvisorPortrait className={styles.photo} />
        </div>
      </div>

      {showLabel ? (
        <div
          className={styles.labelBlock}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={styles.label}>{label}</span>
          {isTyping ? (
            <span className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : null}
        </div>
      ) : null}

      <span className={styles.srOnly}>
        {isTyping
          ? "GRCx AI Advisor is typing"
          : "GRCx AI Advisor avatar"}
      </span>
    </div>
  );
}

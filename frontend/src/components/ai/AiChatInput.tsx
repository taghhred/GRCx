import { useEffect, useId, useRef } from "react";
import { Mic, Paperclip, Send } from "lucide-react";
import { CHAT_MESSAGE_MAX_LENGTH } from "../../utils/security";
import styles from "./AiChatInput.module.css";

interface AiChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}

export default function AiChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask about the current GRCx page, case, risk, control, or policy...",
  compact = false,
}: AiChatInputProps) {
  const inputId = useId();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(44, el.scrollHeight))}px`;
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <form
      className={`${styles.form} ${compact ? styles.formCompact : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      <label className={styles.srOnly} htmlFor={inputId}>
        Message AI Advisor
      </label>
      <textarea
        ref={areaRef}
        id={inputId}
        className={styles.textarea}
        rows={1}
        value={value}
        maxLength={CHAT_MESSAGE_MAX_LENGTH}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value.slice(0, CHAT_MESSAGE_MAX_LENGTH))
        }
        onKeyDown={handleKeyDown}
      />
      <div className={styles.toolbar}>
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.iconBtn}
            disabled
            title="Attach file (coming soon)"
            aria-label="Attach file (coming soon)"
          >
            <Paperclip size={18} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            disabled
            title="Voice input (UI only)"
            aria-label="Voice input (UI only)"
          >
            <Mic size={18} aria-hidden />
          </button>
        </div>
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!canSend}
          aria-label="Send message"
        >
          <Send size={16} aria-hidden />
          Send
        </button>
      </div>
    </form>
  );
}

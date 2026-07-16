import styles from "./AiSuggestionChips.module.css";
import { AI_QUICK_ACTIONS } from "./aiAdvisorData";

interface AiSuggestionChipsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export default function AiSuggestionChips({
  onSelect,
  disabled = false,
}: AiSuggestionChipsProps) {
  return (
    <div className={styles.wrap} aria-label="Suggested prompts">
      {AI_QUICK_ACTIONS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className={styles.chip}
          disabled={disabled}
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

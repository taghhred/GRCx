import { Bookmark, Pin, History } from "lucide-react";
import {
  DEMO_PINNED_PROMPTS,
  DEMO_RECENT_CONVERSATIONS,
} from "./aiAdvisorData";
import styles from "./AiSidePanel.module.css";

interface AiSidePanelProps {
  onPromptSelect?: (prompt: string) => void;
}

export default function AiSidePanel({ onPromptSelect }: AiSidePanelProps) {
  return (
    <aside className={styles.panel} aria-label="Conversation extras">
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <History size={16} aria-hidden />
          <h3>Recent</h3>
        </header>
        <ul className={styles.list}>
          {DEMO_RECENT_CONVERSATIONS.map((item) => (
            <li key={item.id}>
              <button type="button" className={styles.item} disabled title="Demo only">
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={styles.itemMeta}>{item.updatedAt}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <Pin size={16} aria-hidden />
          <h3>Pinned prompts</h3>
        </header>
        <ul className={styles.list}>
          {DEMO_PINNED_PROMPTS.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                className={styles.item}
                onClick={() => onPromptSelect?.(prompt)}
              >
                <span className={styles.itemTitle}>{prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <Bookmark size={16} aria-hidden />
          <h3>Saved responses</h3>
        </header>
        <p className={styles.emptyHint}>
          Saved answers will appear here once an AI service is connected.
        </p>
      </section>
    </aside>
  );
}

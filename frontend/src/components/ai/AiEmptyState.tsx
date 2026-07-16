import AIAdvisorAvatar from "./AIAdvisorAvatar";
import styles from "./AiEmptyState.module.css";

interface AiEmptyStateProps {
  children?: React.ReactNode;
}

export default function AiEmptyState({ children }: AiEmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <AIAdvisorAvatar status="idle" size="lg" showLabel />
      <h2 className={styles.title}>Start a conversation</h2>
      <p className={styles.description}>
        Your AI governance assistant is ready to help.
      </p>
      {children}
    </div>
  );
}

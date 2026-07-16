import styles from "./AiWelcomeCard.module.css";
import { AI_CAPABILITIES } from "./aiAdvisorData";

export default function AiWelcomeCard() {
  return (
    <section className={styles.card} aria-label="Welcome to AI Advisor">
      <h2 className={styles.title}>Welcome to AI Advisor</h2>
      <p className={styles.lead}>
        I can help you with governance, risk, and compliance questions using
        future connected services. For now this is a presentation-ready
        interface only.
      </p>
      <p className={styles.subtitle}>I can help you with:</p>
      <ul className={styles.list}>
        {AI_CAPABILITIES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

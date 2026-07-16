import type { CollaborationManagerStats } from "../../mocks/types/collaboration";
import styles from "./CollaborationManagerPanel.module.css";

interface CollaborationManagerPanelProps {
  stats: CollaborationManagerStats;
}

export default function CollaborationManagerPanel({
  stats,
}: CollaborationManagerPanelProps) {
  return (
    <section className={styles.panel} aria-label="Manager collaboration view">
      <h3>Manager view</h3>
      <div className={styles.grid}>
        <div>
          <span>Owner</span>
          <strong>{stats.owner}</strong>
        </div>
        <div>
          <span>Collaborators</span>
          <strong>
            {stats.collaborators.length > 0
              ? stats.collaborators.join(", ")
              : "None"}
          </strong>
        </div>
        <div>
          <span>Collaboration requests</span>
          <strong>{stats.requestCount}</strong>
        </div>
        <div>
          <span>Avg response time</span>
          <strong>
            {stats.avgResponseMinutes == null
              ? "—"
              : `${stats.avgResponseMinutes} min`}
          </strong>
        </div>
      </div>
      <h4>Collaboration history</h4>
      {stats.history.length === 0 ? (
        <p className={styles.empty}>No collaboration history for this case.</p>
      ) : (
        <ul className={styles.history}>
          {stats.history.map((item) => (
            <li key={item.id}>
              <strong>
                {item.createdAt} · {item.type}
              </strong>
              <span>
                {item.requesterName} → {item.collaboratorNames.join(", ")} ·{" "}
                {item.status}
                {item.responseMinutes != null
                  ? ` · responded in ${item.responseMinutes} min`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { CaseCollaborator } from "../../mocks/types/collaboration";
import { shortName } from "../../mocks/data/analysts";
import styles from "./CollaboratorChips.module.css";

interface CollaboratorChipsProps {
  ownerName: string;
  collaborators: CaseCollaborator[];
}

function Chip({ name, initials }: { name: string; initials: string }) {
  return (
    <span className={styles.chip} title={name}>
      <span className={styles.avatar} aria-hidden>
        {initials}
      </span>
      <span>{shortName(name)}</span>
    </span>
  );
}

export default function CollaboratorChips({
  ownerName,
  collaborators,
}: CollaboratorChipsProps) {
  const ownerInitials = ownerName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={styles.root}>
      <div className={styles.group}>
        <span className={styles.label}>Owner</span>
        <Chip name={ownerName} initials={ownerInitials || "?"} />
      </div>
      <div className={styles.group}>
        <span className={styles.label}>Collaborators</span>
        {collaborators.length === 0 ? (
          <span className={styles.empty}>None yet</span>
        ) : (
          <div className={styles.chipRow}>
            {collaborators.map((item) => (
              <Chip
                key={item.analystId}
                name={item.name}
                initials={item.initials}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

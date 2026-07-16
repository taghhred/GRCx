import {
  ArrowRight,
  ShieldAlert,
  User,
  Building2,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./ViolationCard.module.css";
import type { ViolationListItem } from "./violationsData";
import { isSafeInternalPath, isSafeRouteId } from "../../utils/security";

interface Props {
  violation: ViolationListItem;
}

export default function ViolationCard({ violation }: Props) {
  const navigate = useNavigate();

  const openDetails = () => {
    const path = `/violations/${violation.id}`;
    if (isSafeRouteId(violation.id) && isSafeInternalPath(path)) {
      navigate(path);
    }
  };

  return (
    <article
      className={styles.card}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.left}>
        <div
          className={`${styles.badge} ${styles[violation.severity.toLowerCase()]}`}
        >
          <ShieldAlert size={15} />
          {violation.severity}
        </div>

        <div className={styles.identity}>
          <div className={styles.avatar}>
            <User size={18} />
          </div>

          <div>
            <h3>{violation.employee}</h3>
            <span>
              <Building2 size={14} />
              {violation.department}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.center}>
        <h2>{violation.title}</h2>
        <p>
          Identity ID
          <strong>{violation.id}</strong>
        </p>
      </div>

      <div className={styles.frameworks}>
        {violation.framework.map((item) => (
          <span key={item} className={styles.framework}>
            {item}
          </span>
        ))}
      </div>

      <div className={styles.score}>
        <span>Risk Score</span>
        <h2>{violation.riskScore}</h2>
      </div>

      <div className={styles.ai}>
        <Sparkles size={16} />
        <span>AI {violation.confidence}%</span>
      </div>

      <button
        type="button"
        className={styles.button}
        onClick={(e) => {
          e.stopPropagation();
          openDetails();
        }}
      >
        View Details
        <ArrowRight size={16} />
      </button>
    </article>
  );
}

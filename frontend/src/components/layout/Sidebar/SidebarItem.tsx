import { NavLink } from "react-router-dom";
import { isSafeInternalPath } from "../../../utils/security";
import styles from "./SidebarItem.module.css";

interface SidebarItemProps {
  label: string;
  icon: React.ReactNode;
  path: string;
  end?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}

export default function SidebarItem({
  label,
  icon,
  path,
  end = false,
  compact = false,
  onNavigate,
}: SidebarItemProps) {
  if (!isSafeInternalPath(path)) {
    return (
      <span className={styles.item} aria-disabled="true">
        <span className={styles.icon}>{icon}</span>
        {!compact ? <span>{label}</span> : null}
      </span>
    );
  }

  return (
    <NavLink
      to={path}
      end={end}
      title={label}
      aria-label={label}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${styles.item} ${compact ? styles.compact : ""} ${
          isActive ? styles.active : ""
        }`
      }
    >
      <span className={styles.icon}>{icon}</span>
      {!compact ? <span>{label}</span> : null}
    </NavLink>
  );
}

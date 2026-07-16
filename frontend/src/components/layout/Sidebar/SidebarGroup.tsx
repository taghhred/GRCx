import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { NavGroup } from "./navConfig";
import { groupHasActiveChild } from "./navUtils";
import { isSafeInternalPath } from "../../../utils/security";
import styles from "./SidebarGroup.module.css";

interface SidebarGroupProps {
  group: NavGroup;
  expanded: boolean;
  collapsedRail: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  routeActive?: boolean;
}

export default function SidebarGroupNav({
  group,
  expanded,
  collapsedRail,
  onToggle,
  onNavigate,
  routeActive,
}: SidebarGroupProps) {
  const location = useLocation();
  const childActive =
    routeActive ?? groupHasActiveChild(group, location.pathname);
  const open = expanded;
  const Icon = group.icon;

  if (collapsedRail) {
    const firstSafe = group.children.find((child) =>
      isSafeInternalPath(child.path)
    );
    if (!firstSafe) {
      return null;
    }
    return (
      <NavLink
        to={firstSafe.path}
        end={firstSafe.end}
        title={group.label}
        aria-label={group.label}
        onClick={onNavigate}
        className={() =>
          `${styles.railItem} ${childActive ? styles.railItemActive : ""}`
        }
      >
        <Icon size={20} aria-hidden />
      </NavLink>
    );
  }

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={`${styles.trigger} ${childActive ? styles.triggerActive : ""}`}
        aria-expanded={open}
        aria-controls={`nav-group-${group.id}`}
        id={`nav-group-trigger-${group.id}`}
        onClick={onToggle}
      >
        <span className={styles.triggerMain}>
          <span className={styles.icon}>
            <Icon size={20} aria-hidden />
          </span>
          <span className={styles.label}>{group.label}</span>
        </span>
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          aria-hidden
        />
      </button>

      <div
        id={`nav-group-${group.id}`}
        role="group"
        aria-labelledby={`nav-group-trigger-${group.id}`}
        className={`${styles.children} ${open ? styles.childrenOpen : styles.childrenClosed}`}
        aria-hidden={!open}
      >
        {group.children.map((child) =>
          isSafeInternalPath(child.path) ? (
            <NavLink
              key={child.id}
              to={child.path}
              end={child.end}
              tabIndex={open ? undefined : -1}
              onClick={onNavigate}
              className={({ isActive }) =>
                `${styles.child} ${isActive ? styles.childActive : ""}`
              }
            >
              {child.label}
            </NavLink>
          ) : null
        )}
      </div>
    </div>
  );
}

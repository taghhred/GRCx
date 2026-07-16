import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SIDEBAR_NAV } from "./navConfig";
import SidebarItem from "./SidebarItem";
import SidebarGroupNav from "./SidebarGroup";
import SidebarBrand from "./SidebarBrand";
import { groupHasActiveChild } from "./navUtils";
import { useNavExpansion } from "../../../hooks/useSidebarNavState";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  const location = useLocation();
  const { isExpanded, toggleGroup } = useNavExpansion();
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      aria-label="GRCx primary navigation"
    >
      <div className={styles.sidebarInner}>
        <SidebarBrand collapsed={collapsed} />

        <nav className={styles.navigation} aria-label="Main modules">
          {SIDEBAR_NAV.map((item, index) => {
            const showDivider = index < SIDEBAR_NAV.length - 1;

            if (item.type === "group") {
              const routeActive = groupHasActiveChild(item, location.pathname);

              return (
                <div key={item.id} className={styles.navBlock}>
                  <SidebarGroupNav
                    group={item}
                    collapsedRail={collapsed}
                    expanded={isExpanded(item.id)}
                    onToggle={() => toggleGroup(item.id)}
                    onNavigate={onNavigate}
                    routeActive={routeActive}
                  />
                  {showDivider ? (
                    <div className={styles.separator} role="separator" />
                  ) : null}
                </div>
              );
            }

            if (!item.icon) {
              return null;
            }

            return (
              <div key={item.id} className={styles.navBlock}>
                <SidebarItem
                  label={item.label}
                  icon={<item.icon size={20} aria-hidden />}
                  path={item.path}
                  end={item.end}
                  compact={collapsed}
                  onNavigate={onNavigate}
                />
                {showDivider ? (
                  <div className={styles.separator} role="separator" />
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        className={styles.edgeToggle}
        onClick={onToggleCollapse}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        {collapsed ? (
          <ChevronRight size={18} aria-hidden strokeWidth={2.25} />
        ) : (
          <ChevronLeft size={18} aria-hidden strokeWidth={2.25} />
        )}
      </button>
    </aside>
  );
}

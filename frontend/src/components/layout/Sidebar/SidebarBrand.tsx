import BrandLogo from "../../common/BrandLogo";
import styles from "./SidebarBrand.module.css";

interface SidebarBrandProps {
  collapsed: boolean;
}

/**
 * Sidebar top brand slot — centered GRCx logo only.
 * Collapse/expand lives on the sidebar outer edge (see Sidebar).
 */
export default function SidebarBrand({ collapsed }: SidebarBrandProps) {
  return (
    <div
      className={`${styles.brand} ${collapsed ? styles.collapsed : ""}`}
    >
      <div className={styles.logoStage}>
        <BrandLogo
          variant={collapsed ? "compact" : "sidebar"}
          className={styles.logo}
        />
      </div>
    </div>
  );
}

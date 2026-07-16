import { useState } from "react";
import Sidebar from "../components/layout/Sidebar/Sidebar";
import Topbar from "../components/layout/Topbar/Topbar";
import { useSidebarCollapsed } from "../hooks/useSidebarNavState";
import styles from "./DashboardLayout.module.css";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <div className={`${styles.layout} ${collapsed ? styles.layoutCollapsed : ""}`}>
      <div
        className={`${styles.sidebarSlot} ${mobileNavOpen ? styles.sidebarOpen : ""}`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>

      {mobileNavOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className={styles.main}>
        <Topbar onMenuClick={() => setMobileNavOpen((open) => !open)} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

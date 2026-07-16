import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "../../../theme/useTheme";
import UserMenu from "./UserMenu";
import NotificationPanel from "./NotificationPanel";
import styles from "./Topbar.module.css";

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className={styles.topbar}>
      <div className={styles.leading}>
        {onMenuClick ? (
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Open navigation menu"
            onClick={onMenuClick}
          >
            <Menu size={20} />
          </button>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <NotificationPanel />

        <UserMenu />
      </div>
    </header>
  );
}

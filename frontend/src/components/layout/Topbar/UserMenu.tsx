import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import { useAuth } from "../../../auth/useAuth";
import { isSafeInternalPath } from "../../../utils/security";
import styles from "./UserMenu.module.css";

const MENU_ITEMS = [
  { id: "profile", label: "Profile", path: "/settings/users", icon: User },
  {
    id: "settings",
    label: "Settings",
    path: "/settings/roles",
    icon: Settings,
  },
] as const;

function displayInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();

  const name = user?.full_name ?? "User";
  const roleLabel = user?.roles[0] ?? "Authorized User";
  const initial = displayInitials(name);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSignOutConfirm = async () => {
    setConfirmSignOut(false);
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.avatar} aria-hidden>
          {initial}
        </span>
        <span className={styles.meta}>
          <span className={styles.name}>{name}</span>
          <span className={styles.role}>{roleLabel}</span>
        </span>
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          className={styles.menu}
          role="menu"
          aria-labelledby={triggerId}
        >
          <div className={styles.menuHeader}>
            <span className={styles.avatarLarge} aria-hidden>
              {initial}
            </span>
            <div>
              <p className={styles.menuName}>{name}</p>
              <p className={styles.menuRole}>{user?.email ?? roleLabel}</p>
            </div>
          </div>

          <div className={styles.menuSection}>
            {MENU_ITEMS.map((item) =>
              isSafeInternalPath(item.path) ? (
                <Link
                  key={item.id}
                  to={item.path}
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => setOpen(false)}
                >
                  <item.icon size={18} aria-hidden />
                  {item.label}
                </Link>
              ) : null
            )}
          </div>

          <div className={styles.divider} role="separator" />

          <button
            type="button"
            role="menuitem"
            className={styles.signOut}
            onClick={() => {
              setOpen(false);
              setConfirmSignOut(true);
            }}
          >
            <LogOut size={18} aria-hidden />
            Logout
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        message="This ends your GRCx session and returns you to the sign-in page. Tokens stored in this browser will be cleared."
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={() => {
          void handleSignOutConfirm();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
}

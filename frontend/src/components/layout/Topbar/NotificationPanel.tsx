import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  acceptCollaborationRequest,
  dismissNotification,
  getActiveNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  subscribeCollaboration,
} from "../../../mocks/services/collaborationService";
import styles from "./NotificationPanel.module.css";

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();
  const navigate = useNavigate();

  useEffect(
    () => subscribeCollaboration(() => setTick((value) => value + 1)),
    []
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  void tick;
  const items = getActiveNotifications();
  const unread = getUnreadNotificationCount();

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={styles.trigger}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={20} aria-hidden />
        {unread > 0 ? <span className={styles.badge}>{unread}</span> : null}
      </button>

      {open ? (
        <div
          id={menuId}
          className={styles.menu}
          role="menu"
          aria-labelledby={triggerId}
        >
          <header className={styles.header}>
            <h2>Notifications</h2>
          </header>
          {items.length === 0 ? (
            <p className={styles.empty}>No collaboration notifications.</p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className={item.read ? undefined : styles.unread}
                >
                  <p className={styles.title}>{item.title}</p>
                  <p className={styles.body}>{item.body}</p>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={() => {
                        markNotificationRead(item.id);
                        acceptCollaborationRequest(item.requestId);
                        navigate({
                          pathname: "/risk/dashboard",
                          search: `?case=${encodeURIComponent(item.caseId)}`,
                        });
                        setOpen(false);
                      }}
                    >
                      View Case
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => dismissNotification(item.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import styles from "../identity/IdentityRowMenu.module.css";

const MENU_ACTIONS = [
  "Open Case",
  "Assign Owner",
  "Change Status",
  "Add Comment",
  "Attach Evidence",
  "Archive Case",
] as const;

type RiskCaseRowAction = (typeof MENU_ACTIONS)[number];

interface RiskCaseRowMenuProps {
  caseId: string;
  onAction: (action: RiskCaseRowAction) => void;
}

export default function RiskCaseRowMenu({
  caseId,
  onAction,
}: RiskCaseRowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();

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

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Actions for ${caseId}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className={styles.menu}
          role="menu"
          aria-labelledby={triggerId}
          onClick={(event) => event.stopPropagation()}
        >
          {MENU_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => {
                setOpen(false);
                onAction(action);
              }}
            >
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

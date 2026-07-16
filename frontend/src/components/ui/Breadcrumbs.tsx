import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "../layout/Sidebar/navConfig";
import { isSafeInternalPath } from "../../utils/security";
import styles from "./Breadcrumbs.module.css";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** When true (default), last item is treated as current page. Parent trails should pass false. */
  lastIsCurrent?: boolean;
}

export default function Breadcrumbs({
  items,
  lastIsCurrent = false,
}: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className={styles.nav} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const canLink =
            typeof item.path === "string" && isSafeInternalPath(item.path);
          const markCurrent = lastIsCurrent && isLast;

          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {index > 0 ? (
                <ChevronRight
                  size={14}
                  className={styles.separator}
                  aria-hidden
                />
              ) : null}
              {canLink && !markCurrent ? (
                <Link to={item.path!} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={markCurrent ? styles.current : styles.static}
                  aria-current={markCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import Breadcrumbs from "./Breadcrumbs";
import type { BreadcrumbItem } from "../layout/Sidebar/navConfig";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  /** @deprecated use description */
  subtitle?: string;
  /** @deprecated use primaryAction / secondaryActions */
  actions?: React.ReactNode;
}

/**
 * Show ancestor crumbs only — never the same label as the H1.
 * Single-item trails (e.g. "Dashboard") are suppressed entirely.
 */
function ancestorBreadcrumbs(
  items: BreadcrumbItem[] | undefined,
  title: string
): BreadcrumbItem[] {
  if (!items || items.length === 0) {
    return [];
  }
  const withoutCurrent =
    items[items.length - 1]?.label === title
      ? items.slice(0, -1)
      : items;
  return withoutCurrent.length >= 1 ? withoutCurrent : [];
}

export default function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  subtitle,
  actions,
}: PageHeaderProps) {
  const desc = description ?? subtitle;
  const hasActions = Boolean(primaryAction || secondaryActions || actions);
  const crumbs = ancestorBreadcrumbs(breadcrumbs, title);

  return (
    <header className={styles.header}>
      {crumbs.length > 0 ? <Breadcrumbs items={crumbs} /> : null}

      <div className={styles.row}>
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          {desc ? <p className={styles.description}>{desc}</p> : null}
        </div>

        {hasActions ? (
          <div className={styles.actions}>
            {secondaryActions}
            {primaryAction}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

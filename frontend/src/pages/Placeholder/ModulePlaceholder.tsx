import { useLocation } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/common/Button";
import {
  buildBreadcrumbs,
  resolvePageTitle,
} from "../../components/layout/Sidebar/navConfig";
import styles from "./ModulePlaceholder.module.css";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function ModulePlaceholder({
  title,
  description,
  emptyTitle = "No data available yet",
  emptyDescription = "Connect a data source or load demo data to begin working in this module.",
}: ModulePlaceholderProps) {
  const { pathname } = useLocation();
  const breadcrumbs = buildBreadcrumbs(pathname);
  const resolvedTitle = resolvePageTitle(pathname) ?? title;

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          breadcrumbs={breadcrumbs}
          title={resolvedTitle}
          description={description}
        />
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button variant="secondary" onClick={() => undefined}>
              Load demo data
            </Button>
          }
        />
      </div>
    </DashboardLayout>
  );
}

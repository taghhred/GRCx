import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/common/Button";

export default function NotFound() {
  return (
    <DashboardLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Page not found" },
        ]}
        title="Page not found"
        description="The page you requested does not exist or is no longer available."
      />
      <EmptyState
        title="Nothing to display"
        description="Check the URL or return to the dashboard to continue."
        action={
          <Link to="/dashboard">
            <Button variant="primary">Return to Dashboard</Button>
          </Link>
        }
      />
    </DashboardLayout>
  );
}

import { useLocation, useNavigate } from "react-router-dom";
import {
  buildBreadcrumbs,
  resolvePageTitle,
  type BreadcrumbItem,
} from "../components/layout/Sidebar/navConfig";

interface BreadcrumbResult {
  items: BreadcrumbItem[];
  /** @deprecated use items */
  segments: string[];
  pageTitle: string | null;
  hasBack: boolean;
  goBack: () => void;
}

export function useBreadcrumb(): BreadcrumbResult {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const items = buildBreadcrumbs(pathname);

  return {
    items,
    segments: items.map((i) => i.label),
    pageTitle: resolvePageTitle(pathname),
    hasBack: false,
    goBack: () => navigate("/dashboard"),
  };
}

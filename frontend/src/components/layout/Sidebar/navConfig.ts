import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Shield,
  ShieldCheck,
  Scale,
  Network,
  Building2,
  ServerCrash,
  FileText,
  Settings,
  Plug,
  ScrollText,
  Bell,
  KeyRound,
  UserCog,
} from "lucide-react";

export interface NavLeaf {
  type: "link";
  id: string;
  /** Short sidebar / breadcrumb feature label */
  label: string;
  /** Canonical H1 page title (defaults to label) */
  pageTitle?: string;
  path: string;
  icon?: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  type: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

export type NavItem = NavLeaf | NavGroup;

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

/** Resolve the displayed page title for a leaf. */
export function getPageTitle(leaf: NavLeaf): string {
  return leaf.pageTitle ?? leaf.label;
}

/** Settings routes remain available via profile menu / direct URL — not in main sidebar. */
const ADMINISTRATION_CHILDREN: NavLeaf[] = [
  { type: "link", id: "admin-users", label: "Users", path: "/settings/users", icon: UserCog },
  { type: "link", id: "admin-roles", label: "Roles", path: "/settings/roles", icon: KeyRound },
  {
    type: "link",
    id: "admin-permissions",
    label: "Permissions",
    path: "/settings/permissions",
    icon: ShieldCheck,
  },
  {
    type: "link",
    id: "admin-integrations",
    label: "Integrations",
    path: "/settings/integrations",
    icon: Plug,
  },
  { type: "link", id: "admin-api", label: "API Settings", path: "/settings/api", icon: Network },
  {
    type: "link",
    id: "admin-notifications",
    label: "Notifications",
    path: "/settings/notifications",
    icon: Bell,
  },
  {
    type: "link",
    id: "admin-audit",
    label: "Audit Logs",
    path: "/settings/audit-logs",
    icon: ScrollText,
  },
];

/**
 * Enterprise GRC navigation.
 * Parent = category. Child = feature (short label). Paths are stable.
 * Order ends with Reports. AI Advisor is a global floating assistant (not nav).
 */
export const SIDEBAR_NAV: NavItem[] = [
  {
    type: "link",
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    type: "link",
    id: "grc-cases",
    label: "SOAR Queue",
    pageTitle: "SOAR Queue",
    path: "/grc-cases",
    icon: Briefcase,
    end: true,
  },
  {
    type: "link",
    id: "governance",
    label: "Governance",
    pageTitle: "Governance",
    path: "/governance",
    icon: ShieldCheck,
    end: true,
  },
  {
    type: "link",
    id: "compliance",
    label: "Compliance",
    pageTitle: "Asset Compliance",
    path: "/compliance",
    icon: Scale,
    end: true,
  },
  {
    type: "group",
    id: "risk-assessment",
    label: "Risk Assessment",
    icon: Shield,
    children: [
      {
        type: "link",
        id: "risk-dashboard",
        label: "Risk Overview",
        pageTitle: "Risk Overview",
        path: "/risk/dashboard",
        end: true,
      },
      {
        type: "link",
        id: "risk-register",
        label: "Risk Register",
        pageTitle: "Risk Register",
        path: "/risk/register",
        end: true,
      },
      {
        type: "link",
        id: "risk-heatmaps",
        label: "Heat Maps",
        pageTitle: "Risk Heat Maps",
        path: "/risk/heatmaps",
        end: true,
      },
      {
        type: "link",
        id: "risk-treatment",
        label: "Treatment",
        pageTitle: "Treatment & Mitigation",
        path: "/risk/treatment",
        end: true,
      },
    ],
  },
  {
    type: "link",
    id: "identity-access",
    label: "Identity & Access",
    pageTitle: "Identity & Access Monitoring",
    path: "/identities",
    icon: Users,
    end: true,
  },
  {
    type: "link",
    id: "business-continuity",
    label: "Business Continuity",
    path: "/bcm",
    icon: Building2,
    end: true,
  },
  {
    type: "link",
    id: "disaster-recovery",
    label: "Disaster Recovery",
    path: "/drp",
    icon: ServerCrash,
    end: true,
  },
  {
    type: "link",
    id: "reports",
    label: "Reports",
    pageTitle: "Reporting Center",
    path: "/reports",
    icon: FileText,
    end: true,
  },
];

export const NAV_GROUP_IDS: readonly string[] = SIDEBAR_NAV.filter(
  (item): item is NavGroup => item.type === "group"
).map((group) => group.id);

function pathMatches(pathname: string, leaf: NavLeaf): boolean {
  if (leaf.end) {
    return pathname === leaf.path;
  }
  return pathname === leaf.path || pathname.startsWith(`${leaf.path}/`);
}

/** Find the best matching nav leaf for a pathname (longest path wins). */
export function findNavMatch(pathname: string): {
  group: NavGroup | null;
  leaf: NavLeaf | null;
} {
  let best: { group: NavGroup | null; leaf: NavLeaf; len: number } | null = null;

  for (const item of SIDEBAR_NAV) {
    if (item.type === "link") {
      if (pathMatches(pathname, item)) {
        const len = item.path.length;
        if (!best || len > best.len) {
          best = { group: null, leaf: item, len };
        }
      }
      continue;
    }
    for (const child of item.children) {
      if (pathMatches(pathname, child)) {
        const len = child.path.length;
        if (!best || len > best.len) {
          best = { group: item, leaf: child, len };
        }
      }
    }
  }

  for (const child of ADMINISTRATION_CHILDREN) {
    if (pathMatches(pathname, child)) {
      const len = child.path.length;
      if (!best || len > best.len) {
        best = {
          group: {
            type: "group",
            id: "administration",
            label: "Administration",
            icon: Settings,
            children: ADMINISTRATION_CHILDREN,
          },
          leaf: child,
          len,
        };
      }
    }
  }

  return best
    ? { group: best.group, leaf: best.leaf }
    : { group: null, leaf: null };
}

export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Dashboard", path: "/dashboard" }];

  if (pathname === "/" || pathname === "/dashboard") {
    return [{ label: "Dashboard" }];
  }

  const { group, leaf } = findNavMatch(pathname);

  if (group) {
    crumbs.push({ label: group.label });
  }

  if (leaf) {
    crumbs.push({ label: leaf.label });
    return crumbs;
  }

  // Legacy Security Operations paths now unify under SOAR Queue
  if (
    pathname.match(/^\/violations/) ||
    pathname === "/analysis" ||
    pathname === "/remediation" ||
    pathname === "/success" ||
    pathname === "/incident-timeline" ||
    pathname === "/evidence" ||
    pathname.startsWith("/tasks")
  ) {
    return [
      { label: "Dashboard", path: "/dashboard" },
      { label: "SOAR Queue", path: "/grc-cases" },
    ];
  }

  if (pathname.startsWith("/governance")) {
    return [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Governance", path: "/governance" },
    ];
  }

  if (pathname.startsWith("/identities")) {
    return [{ label: "Dashboard", path: "/dashboard" }, { label: "Identity & Access Monitoring" }];
  }

  if (pathname.startsWith("/access-reviews/")) {
    return [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Identity & Access Monitoring", path: "/identities" },
    ];
  }

  if (
    pathname === "/risk" ||
    pathname.startsWith("/risk/") ||
    pathname.startsWith("/risk?") ||
    pathname.startsWith("/risks") ||
    pathname.startsWith("/risk-")
  ) {
    if (pathname.startsWith("/risk/register")) {
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Risk Assessment", path: "/risk/dashboard" },
        { label: "Risk Register" },
      ];
    }
    if (pathname.startsWith("/risk/new")) {
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Risk Assessment", path: "/risk/dashboard" },
        { label: "New Risk" },
      ];
    }
    if (pathname.startsWith("/risk/heatmaps")) {
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Risk Assessment", path: "/risk/dashboard" },
        { label: "Heat Maps" },
      ];
    }
    if (pathname.startsWith("/risk/treatment")) {
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Risk Assessment", path: "/risk/dashboard" },
        { label: "Treatment" },
      ];
    }
    if (pathname.startsWith("/risk/reports")) {
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Reporting Center", path: "/reports" },
      ];
    }
    if (pathname.startsWith("/risk/dashboard") || pathname === "/risk") {
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Risk Assessment", path: "/risk/dashboard" },
        { label: "Risk Overview" },
      ];
    }
    return [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Risk Assessment", path: "/risk/dashboard" },
    ];
  }

  if (pathname.startsWith("/regulatory-mapping") || pathname === "/compliance") {
    return [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Asset Compliance", path: "/compliance" },
    ];
  }

  if (pathname.startsWith("/settings")) {
    return [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Administration" },
      { label: "Settings" },
    ];
  }

  return crumbs;
}

export function resolvePageTitle(pathname: string): string | null {
  const { leaf } = findNavMatch(pathname);
  if (leaf) {
    return getPageTitle(leaf);
  }
  return null;
}


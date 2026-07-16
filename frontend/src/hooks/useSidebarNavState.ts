import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  NAV_GROUP_IDS,
  SIDEBAR_NAV,
  type NavGroup,
} from "../components/layout/Sidebar/navConfig";
import { groupHasActiveChild } from "../components/layout/Sidebar/navUtils";

const EXPANDED_KEY = "grcx.nav.expandedGroup";
const COLLAPSED_KEY = "grcx.nav.sidebarCollapsed";

function findActiveGroupId(pathname: string): string | null {
  for (const item of SIDEBAR_NAV) {
    if (item.type === "group" && groupHasActiveChild(item as NavGroup, pathname)) {
      return item.id;
    }
  }
  return null;
}

function readExpandedGroup(): string | null {
  try {
    const raw = sessionStorage.getItem(EXPANDED_KEY);
    if (!raw) {
      return null;
    }
    return NAV_GROUP_IDS.includes(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeExpandedGroup(id: string | null): void {
  try {
    if (id) {
      sessionStorage.setItem(EXPANDED_KEY, id);
    } else {
      sessionStorage.removeItem(EXPANDED_KEY);
    }
  } catch {
    // Ignore storage quota / private mode failures.
  }
}

function readCollapsed(): boolean {
  try {
    return sessionStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    sessionStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Accordion navigation: only one group open at a time.
 * Active route's parent auto-expands on navigation. Toggle opens/closes immediately.
 */
export function useNavExpansion() {
  const { pathname } = useLocation();
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const active = findActiveGroupId(
      typeof window !== "undefined" ? window.location.pathname : "/"
    );
    return active ?? readExpandedGroup();
  });
  const [trackedPath, setTrackedPath] = useState(pathname);

  // Sync expand target when the route changes (render-time adjustment — no effect).
  if (pathname !== trackedPath) {
    setTrackedPath(pathname);
    const active = findActiveGroupId(pathname);
    if (active) {
      setExpandedId(active);
      writeExpandedGroup(active);
    }
  }

  const isExpanded = useCallback(
    (groupId: string) => expandedId === groupId,
    [expandedId]
  );

  const toggleGroup = useCallback((groupId: string) => {
    if (!NAV_GROUP_IDS.includes(groupId)) {
      return;
    }
    setExpandedId((prev) => {
      const next = prev === groupId ? null : groupId;
      writeExpandedGroup(next);
      return next;
    });
  }, []);

  return { isExpanded, toggleGroup, expandedId };
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => readCollapsed());

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }, []);

  return { collapsed, toggleCollapsed };
}

import type { NavGroup, NavLeaf } from "./navConfig";

export function pathMatchesChild(pathname: string, child: NavLeaf): boolean {
  if (child.end) {
    return pathname === child.path;
  }
  return pathname === child.path || pathname.startsWith(`${child.path}/`);
}

export function groupHasActiveChild(group: NavGroup, pathname: string): boolean {
  return group.children.some((child) => pathMatchesChild(pathname, child));
}

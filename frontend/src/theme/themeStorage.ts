export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "grcx.theme";

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function readStoredTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore private-mode / quota failures.
  }
}

export function applyThemeAttribute(mode: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", mode);
}

export function getInitialTheme(): ThemeMode {
  return readStoredTheme() ?? getSystemTheme();
}

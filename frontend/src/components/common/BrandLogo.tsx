import { memo, useContext } from "react";
import { Link } from "react-router-dom";
import grcxLogoDark from "../../assets/images/GRCx Logo.png";
import grcxLogoLight from "../../assets/images/grcx Logo Light Mode.png";
import { ThemeContext } from "../../theme/themeContext";
import styles from "./BrandLogo.module.css";

export type BrandLogoProps = {
  className?: string;
  /** Expanded sidebar / collapsed rail / login hero */
  variant?: "sidebar" | "compact" | "login";
  /** When false, render a non-navigating mark (e.g. login page). */
  interactive?: boolean;
};

/**
 * Theme-aware GRCx brand mark.
 * Dark → GRCx Logo.png | Light → grcx Logo Light Mode.png
 * Imports assets once; reuses across Sidebar, Login, and future surfaces.
 */
function BrandLogo({
  className = "",
  variant = "sidebar",
  interactive = true,
}: BrandLogoProps) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme ?? "dark";
  const isLight = theme === "light";

  const variantClass =
    variant === "compact"
      ? styles.compact
      : variant === "login"
        ? styles.login
        : styles.sidebar;

  const frame = (
    <span className={styles.stack} aria-hidden={false}>
      <img
        src={grcxLogoDark}
        alt=""
        className={`${styles.image} ${isLight ? styles.faded : styles.visible}`}
        draggable={false}
        decoding="async"
      />
      <img
        src={grcxLogoLight}
        alt=""
        className={`${styles.image} ${styles.overlay} ${isLight ? styles.visible : styles.faded}`}
        draggable={false}
        decoding="async"
      />
      {/* Accessible name on the active surface */}
      <span className={styles.srOnly}>GRCx Logo</span>
    </span>
  );

  const classes = `${styles.link} ${variantClass} ${className}`.trim();

  if (!interactive) {
    return (
      <div
        className={`${styles.mark} ${variantClass} ${className}`.trim()}
        role="img"
        aria-label="GRCx Logo"
      >
        {frame}
      </div>
    );
  }

  return (
    <Link
      to="/dashboard"
      className={classes}
      aria-label="Go to GRCx Dashboard"
    >
      {frame}
    </Link>
  );
}

export default memo(BrandLogo);

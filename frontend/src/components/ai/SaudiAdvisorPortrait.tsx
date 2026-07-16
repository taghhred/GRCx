import aiAdvisorAvatar from "../../assets/images/man.jpg";

type Props = {
  className?: string;
  alt?: string;
};

/**
 * Local Vite-bundled AI Advisor avatar (src/assets/images/man.jpg).
 * Not a remote URL and not Base64.
 */
export function SaudiAdvisorPortrait({
  className,
  alt = "GRCx AI Advisor avatar",
}: Props) {
  return (
    <img
      src={aiAdvisorAvatar}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}

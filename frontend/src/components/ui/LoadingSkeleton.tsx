import styles from "./LoadingSkeleton.module.css";

interface LoadingSkeletonProps {
  rows?: number;
  height?: number;
}

export default function LoadingSkeleton({
  rows = 3,
  height = 88,
}: LoadingSkeletonProps) {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={styles.block}
          style={{ height }}
        />
      ))}
    </div>
  );
}

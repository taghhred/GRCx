import type { GenerationPhase } from "../../mocks/types/reports";
import styles from "./ReportGenerationProgress.module.css";

interface ReportGenerationProgressProps {
  phase: GenerationPhase;
  progress: number;
}

const PHASES: GenerationPhase[] = [
  "Preparing Data",
  "Generating Charts",
  "Building Report",
  "Applying Watermark",
  "Finalizing PDF",
  "Ready",
];

export default function ReportGenerationProgress({
  phase,
  progress,
}: ReportGenerationProgressProps) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <h3>Generating report</h3>
      <p>
        {phase} · {progress}%
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Report generation progress"
      >
        <div className={styles.fill} style={{ width: `${progress}%` }} />
      </div>
      <ol className={styles.list}>
        {PHASES.map((item) => (
          <li
            key={item}
            className={
              PHASES.indexOf(item) <= PHASES.indexOf(phase)
                ? styles.done
                : undefined
            }
          >
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

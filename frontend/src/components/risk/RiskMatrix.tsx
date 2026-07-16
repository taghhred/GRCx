import type { RiskLevel } from "../../mocks/types/risk";
import styles from "./RiskMatrix.module.css";

interface RiskMatrixProps {
  inherentLikelihood: number;
  inherentImpact: number;
  residualLikelihood: number;
  residualImpact: number;
  inherentLevel: RiskLevel;
  residualLevel: RiskLevel;
  inherentScore: number;
  residualScore: number;
}

function cellLevel(likelihood: number, impact: number): RiskLevel {
  const score = likelihood * impact;
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

const IMPACTS = [5, 4, 3, 2, 1] as const;
const LIKELIHOODS = [1, 2, 3, 4, 5] as const;

export default function RiskMatrix({
  inherentLikelihood,
  inherentImpact,
  residualLikelihood,
  residualImpact,
  inherentLevel,
  residualLevel,
  inherentScore,
  residualScore,
}: RiskMatrixProps) {
  return (
    <div className={styles.root}>
      <div className={styles.legend}>
        <p>
          <span className={`${styles.marker} ${styles.markerInherent}`} aria-hidden />
          Inherent: {inherentLevel} ({inherentScore}/25) — L{inherentLikelihood} × I
          {inherentImpact}
        </p>
        <p>
          <span className={`${styles.marker} ${styles.markerResidual}`} aria-hidden />
          Residual: {residualLevel} ({residualScore}/25) — L{residualLikelihood} × I
          {residualImpact}
        </p>
      </div>

      <div className={styles.gridWrap} role="img" aria-label="5 by 5 risk matrix">
        <span className={styles.axisY}>Impact →</span>
        <div className={styles.grid}>
          {IMPACTS.map((impact) =>
            LIKELIHOODS.map((likelihood) => {
              const level = cellLevel(likelihood, impact);
              const isInherent =
                likelihood === inherentLikelihood && impact === inherentImpact;
              const isResidual =
                likelihood === residualLikelihood && impact === residualImpact;
              return (
                <div
                  key={`${likelihood}-${impact}`}
                  className={`${styles.cell} ${styles[`level${level}`]}`}
                  title={`L${likelihood} × I${impact} = ${likelihood * impact} (${level})`}
                >
                  <span className={styles.cellLabel}>{level.charAt(0)}</span>
                  {isInherent ? (
                    <span className={styles.pinInherent} title="Inherent position">
                      I
                    </span>
                  ) : null}
                  {isResidual ? (
                    <span className={styles.pinResidual} title="Residual position">
                      R
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <span className={styles.axisX}>Likelihood →</span>
      </div>

      <ul className={styles.key}>
        <li>
          <span className={`${styles.swatch} ${styles.levelLow}`} aria-hidden />
          Low (1–5)
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.levelMedium}`} aria-hidden />
          Medium (6–11)
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.levelHigh}`} aria-hidden />
          High (12–19)
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.levelCritical}`} aria-hidden />
          Critical (20–25)
        </li>
      </ul>
    </div>
  );
}

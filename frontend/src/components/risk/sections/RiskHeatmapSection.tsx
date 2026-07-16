import { useMemo, useState } from "react";
import { ArrowRight, Download, Printer, ZoomIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRiskModule } from "../../../services/risk/RiskModuleContext";
import type { EnrichedRisk } from "../../../services/risk/RiskModuleContext";
import Button from "../../common/Button";
import EmptyState from "../../ui/EmptyState";
import { asSeverity, downloadTextFile, levelOf, scoreBandClass } from "./riskSectionUtils";
import SeverityBadge from "../../ui/SeverityBadge";
import styles from "../../../pages/Risk/RiskAssessment.module.css";

const IMPACTS = [5, 4, 3, 2, 1] as const;
const LIKELIHOODS = [1, 2, 3, 4, 5] as const;

const BAND_HEX: Record<string, string> = {
  l1: "#86efac",
  l2: "#bbf7d0",
  l3: "#fde68a",
  l4: "#fdba74",
  l5: "#fca5a5",
};

interface CellInfo {
  likelihood: number;
  impact: number;
  score: number;
  band: string;
  risks: EnrichedRisk[];
}

function cellRisks(risks: EnrichedRisk[], likelihood: number, impact: number): EnrichedRisk[] {
  return risks.filter(
    (r) => (r.residualLikelihood ?? 3) === likelihood && (r.residualImpact ?? 3) === impact
  );
}

function buildMatrixSvg(cells: CellInfo[][]): string {
  const cellSize = 72;
  const gap = 6;
  const originX = 40;
  const originY = 20;
  const width = originX + LIKELIHOODS.length * (cellSize + gap) + 20;
  const height = originY + IMPACTS.length * (cellSize + gap) + 40;

  const rects: string[] = [];
  cells.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const x = originX + colIndex * (cellSize + gap);
      const y = originY + rowIndex * (cellSize + gap);
      rects.push(
        `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="10" fill="${BAND_HEX[cell.band]}" stroke="#0f172a" stroke-opacity="0.15"/>`
      );
      rects.push(
        `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 5}" text-anchor="middle" font-size="20" font-weight="700" fill="#0f172a">${cell.risks.length}</text>`
      );
    });
  });

  const colLabels = LIKELIHOODS.map(
    (l, i) =>
      `<text x="${originX + i * (cellSize + gap) + cellSize / 2}" y="${originY - 6}" text-anchor="middle" font-size="12" fill="#64748b">L${l}</text>`
  ).join("");
  const rowLabels = IMPACTS.map(
    (impact, i) =>
      `<text x="${originX - 10}" y="${originY + i * (cellSize + gap) + cellSize / 2 + 4}" text-anchor="end" font-size="12" fill="#64748b">I${impact}</text>`
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    ${colLabels}
    ${rowLabels}
    ${rects.join("")}
  </svg>`;
}

export default function RiskHeatmapSection() {
  const navigate = useNavigate();
  const { risks, setHeatmapFilter, setSelectedRiskId } = useRiskModule();
  const [zoom, setZoom] = useState<1 | 1.25>(1);
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);

  const matrix = useMemo<CellInfo[][]>(
    () =>
      IMPACTS.map((impact) =>
        LIKELIHOODS.map((likelihood) => {
          const score = likelihood * impact;
          return {
            likelihood,
            impact,
            score,
            band: scoreBandClass(score),
            risks: cellRisks(risks, likelihood, impact),
          };
        })
      ),
    [risks]
  );

  const selectedRisks = useMemo(
    () => (selectedCell ? cellRisks(risks, selectedCell.likelihood, selectedCell.impact) : []),
    [risks, selectedCell]
  );

  function handleCellClick(cell: CellInfo) {
    setSelectedCell({ likelihood: cell.likelihood, impact: cell.impact });
    setHeatmapFilter({ likelihood: cell.likelihood, impact: cell.impact });
  }

  function handleExportSvg() {
    const svg = buildMatrixSvg(matrix);
    downloadTextFile(svg, `Risk_Heatmap_${new Date().toISOString().slice(0, 10)}.svg`, "image/svg+xml");
  }

  function handleExportCsv() {
    const header = "Likelihood,Impact,Score,Risk Count";
    const rows = matrix
      .flat()
      .map((c) => `${c.likelihood},${c.impact},${c.score},${c.risks.length}`)
      .join("\r\n");
    downloadTextFile(`${header}\r\n${rows}`, `Risk_Heatmap_Counts_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
  }

  if (risks.length === 0) {
    return (
      <EmptyState
        title="No risk data available"
        description="Import or refresh the risk register to populate the likelihood × impact heat map."
      />
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.panelHeaderRow}>
          <div>
            <h3 className={styles.panelTitle}>Residual Risk Heat Map</h3>
            <p className={styles.panelSub}>
              5×5 matrix plotted on residual likelihood × residual impact (unset values default to 3).
              Click a cell to preview its risks and stage a Register filter.
            </p>
          </div>
          <div className={styles.sectionActions}>
            <div className={styles.zoomBar}>
              <button
                type="button"
                className={`${styles.zoomBtn} ${zoom === 1 ? styles.zoomBtnActive : ""}`}
                onClick={() => setZoom(1)}
              >
                100%
              </button>
              <button
                type="button"
                className={`${styles.zoomBtn} ${zoom === 1.25 ? styles.zoomBtnActive : ""}`}
                onClick={() => setZoom(1.25)}
              >
                <ZoomIn size={13} aria-hidden /> 125%
              </button>
            </div>
            <Button variant="secondary" onClick={handleExportSvg}>
              <Download size={15} aria-hidden />
              Export PNG
            </Button>
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download size={15} aria-hidden />
              Export Counts CSV
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer size={15} aria-hidden />
              Export PDF
            </Button>
          </div>
        </div>

        <div className={styles.matrixLayout}>
          <div className={styles.matrixWrap}>
            <div className={styles.matrixScaleOuter}>
              <div className={styles.matrixScaleInner} style={{ transform: `scale(${zoom})` }}>
                <table className={styles.matrix}>
                  <thead>
                    <tr>
                      <th aria-hidden />
                      {LIKELIHOODS.map((l) => (
                        <th key={l} scope="col">
                          L{l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, rowIndex) => (
                      <tr key={IMPACTS[rowIndex]}>
                        <th scope="row">I{IMPACTS[rowIndex]}</th>
                        {row.map((cell) => {
                          const isActive =
                            selectedCell?.likelihood === cell.likelihood &&
                            selectedCell?.impact === cell.impact;
                          const idsPreview = cell.risks.map((r) => r.riskId).join(", ");
                          return (
                            <td
                              key={cell.likelihood}
                              className={`${styles.matrixCell} ${styles[cell.band]} ${
                                isActive ? styles.matrixCellActive : ""
                              }`}
                              title={
                                cell.risks.length > 0
                                  ? `L${cell.likelihood} × I${cell.impact} = ${cell.score} — ${idsPreview}`
                                  : `L${cell.likelihood} × I${cell.impact} = ${cell.score} — no risks`
                              }
                              onClick={() => handleCellClick(cell)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") handleCellClick(cell);
                              }}
                            >
                              <span className={styles.matrixCellCount}>{cell.risks.length}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <ul style={{ marginTop: 16, display: "flex", gap: 16, listStyle: "none", padding: 0, flexWrap: "wrap" }}>
              <li style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: BAND_HEX.l1, display: "inline-block" }} /> 1–5
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: BAND_HEX.l2, display: "inline-block" }} /> 6–10
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: BAND_HEX.l3, display: "inline-block" }} /> 11–15
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: BAND_HEX.l4, display: "inline-block" }} /> 16–20
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: BAND_HEX.l5, display: "inline-block" }} /> 21–25
              </li>
            </ul>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeaderRow}>
              <h3 className={styles.panelTitle}>
                {selectedCell ? `L${selectedCell.likelihood} × I${selectedCell.impact}` : "Select a cell"}
              </h3>
              {selectedCell ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    setHeatmapFilter(selectedCell);
                    navigate("/risk/register");
                  }}
                >
                  View in Register
                  <ArrowRight size={14} aria-hidden />
                </Button>
              ) : null}
            </div>
            {!selectedCell ? (
              <p className={styles.sidePanelEmpty}>
                Click any cell in the matrix to preview the risks that fall into that likelihood ×
                impact combination.
              </p>
            ) : selectedRisks.length === 0 ? (
              <p className={styles.sidePanelEmpty}>No risks currently sit in this cell.</p>
            ) : (
              <ul className={styles.list}>
                {selectedRisks.map((risk) => (
                  <li
                    key={risk.riskId}
                    className={styles.listItem}
                    onClick={() => {
                      setSelectedRiskId(risk.riskId);
                      navigate("/risk/register");
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedRiskId(risk.riskId);
                        navigate("/risk/register");
                      }
                    }}
                  >
                    <div className={styles.listMain}>
                      <div className={styles.listTitle}>
                        {risk.riskId} · {risk.title}
                      </div>
                      <div className={styles.listMeta}>{risk.owner || "Unassigned"}</div>
                    </div>
                    <SeverityBadge severity={asSeverity(levelOf(risk))} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState, type CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";
import type { Report } from "../../mocks/types/reports";
import styles from "./ReportPreview.module.css";

interface ReportPreviewProps {
  report: Report;
  onBackToEdit?: () => void;
  onGenerate?: () => void;
  showGenerate?: boolean;
}

function watermarkStyle(report: Report): CSSProperties {
  const wm = report.watermark;
  const positionMap: Record<string, CSSProperties> = {
    Center: { inset: 0, alignItems: "center", justifyContent: "center" },
    "Top Left": { top: 24, left: 24, right: "auto", bottom: "auto" },
    "Top Right": { top: 24, right: 24, left: "auto", bottom: "auto" },
    "Bottom Left": { bottom: 24, left: 24, right: "auto", top: "auto" },
    "Bottom Right": { bottom: 24, right: 24, left: "auto", top: "auto" },
  };
  return {
    ...positionMap[wm.position],
    opacity: wm.opacity / 100,
    fontSize: wm.fontSize,
    transform: `rotate(${wm.rotation}deg)`,
  };
}

export default function ReportPreview({
  report,
  onBackToEdit,
  onGenerate,
  showGenerate = false,
}: ReportPreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const pages = report.content.pages;
  const page = pages[pageIndex] ?? pages[0];

  const toc = useMemo(
    () =>
      pages.flatMap((entry) =>
        entry.sections.map((section) => section.title)
      ),
    [pages]
  );

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
          >
            Prev
          </button>
          <span>
            Page {pageIndex + 1} / {Math.max(pages.length, 1)}
          </span>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={pageIndex >= pages.length - 1}
            onClick={() =>
              setPageIndex((value) => Math.min(pages.length - 1, value + 1))
            }
          >
            Next
          </button>
        </div>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Zoom out"
            onClick={() => setZoom((value) => Math.max(70, value - 10))}
          >
            <Minus size={16} aria-hidden />
          </button>
          <span>{zoom}%</span>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Zoom in"
            onClick={() => setZoom((value) => Math.min(140, value + 10))}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
        <div className={styles.nav}>
          {onBackToEdit ? (
            <button type="button" className={styles.toolBtn} onClick={onBackToEdit}>
              Return to editing
            </button>
          ) : null}
          {showGenerate && onGenerate ? (
            <button type="button" className={styles.primaryBtn} onClick={onGenerate}>
              Generate report
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.stage}>
        <article
          className={styles.paper}
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {report.watermark.enabled ? (
            <div className={styles.watermark} style={watermarkStyle(report)} aria-hidden>
              {report.watermark.text}
            </div>
          ) : null}

          <header className={styles.cover}>
            <div className={styles.logo}>GRCx</div>
            <p className={styles.eyebrow}>{report.reportType} Report</p>
            <h1>{report.metadata.title || report.name}</h1>
            <p className={styles.desc}>{report.metadata.description}</p>
            <dl className={styles.meta}>
              <div>
                <dt>Reporting period</dt>
                <dd>{report.reportingPeriod}</dd>
              </div>
              <div>
                <dt>Issue date</dt>
                <dd>{report.issueDate}</dd>
              </div>
              <div>
                <dt>Auditor</dt>
                <dd>
                  {report.auditor} · {report.auditorRole}
                </dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>{report.metadata.organizationName}</dd>
              </div>
              <div>
                <dt>Classification</dt>
                <dd>{report.metadata.classification}</dd>
              </div>
            </dl>
          </header>

          {pageIndex === 0 ? (
            <section className={styles.section}>
              <h2>Table of contents</h2>
              <ol>
                {toc.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {(page?.sections ?? []).map((section) => (
            <section key={`${section.id}-${section.title}`} className={styles.section}>
              <h2>{section.title}</h2>
              <p>{section.summary}</p>
              {section.bullets && section.bullets.length > 0 ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.columns && section.rows && section.rows.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        {section.columns.map((column) => (
                          <th key={column} scope="col">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, index) => (
                        <tr key={`${section.id}-${index}`}>
                          {section.columns!.map((column) => (
                            <td key={column}>{row[column] ?? "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}

          <footer className={styles.footer}>
            <span>{report.metadata.classification}</span>
            <span>
              {report.reportId} · Page {pageIndex + 1}
            </span>
          </footer>
        </article>
      </div>
    </div>
  );
}

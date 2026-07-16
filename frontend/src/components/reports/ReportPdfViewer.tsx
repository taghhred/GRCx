import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Download,
  Expand,
  FileSearch,
  FileText,
  Hash,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Printer,
  RotateCw,
  Search,
  Shield,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Report } from "../../mocks/types/reports";
import {
  dataUrlToBlob,
  downloadPdfBlob,
} from "../../services/grcxPdfEngine";
import { displayFirstName } from "../../utils/reportDisplay";
import styles from "./ReportPdfViewer.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ReportPdfViewerProps {
  report: Report | null;
  loading?: boolean;
  progress?: number;
  phase?: string;
  onToast?: (message: string) => void;
  onClosePreview?: () => void;
}

type FitMode = "width" | "page" | "custom";

type MetaRow = {
  icon: typeof User;
  label: string;
  value: string;
};

export default function ReportPdfViewer({
  report,
  loading = false,
  progress = 0,
  phase,
  onToast,
  onClosePreview,
}: ReportPdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.15);
  const [fitMode, setFitMode] = useState<FitMode>("width");
  const [rotation, setRotation] = useState(0);
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState<number[]>([]);
  const [hitIndex, setHitIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    setPdfDoc(null);
    setThumbnails([]);
    setPage(1);
    setPageInput("1");
    setSearchHits([]);
    setRenderError(null);
    setPdfLoading(Boolean(report?.pdfDataUrl));

    if (!report?.pdfDataUrl) return;

    (async () => {
      try {
        const loadingTask = pdfjs.getDocument({ url: report.pdfDataUrl });
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setPdfLoading(false);

        setThumbsLoading(true);
        const thumbs: string[] = [];
        for (let i = 1; i <= doc.numPages; i += 1) {
          if (cancelled) return;
          const p = await doc.getPage(i);
          const viewport = p.getViewport({ scale: 0.22 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await p.render({ canvasContext: ctx, viewport, canvas }).promise;
            thumbs.push(canvas.toDataURL("image/jpeg", 0.72));
          }
        }
        if (!cancelled) {
          setThumbnails(thumbs);
          setThumbsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setPdfLoading(false);
          setThumbsLoading(false);
          setRenderError(
            error instanceof Error ? error.message : "Unable to render PDF"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [report?.id, report?.pdfDataUrl]);

  const computeFitScale = useCallback(
    async (mode: FitMode) => {
      if (!pdfDoc || !stageRef.current) return;
      const pdfPage = await pdfDoc.getPage(page);
      const viewport = pdfPage.getViewport({ scale: 1, rotation });
      const availW = stageRef.current.clientWidth - 48;
      const availH = stageRef.current.clientHeight - 48;
      if (mode === "width") {
        setScale(Math.max(0.5, availW / viewport.width));
      } else if (mode === "page") {
        setScale(
          Math.max(
            0.5,
            Math.min(availW / viewport.width, availH / viewport.height)
          )
        );
      }
    },
    [pdfDoc, page, rotation]
  );

  useEffect(() => {
    if (fitMode === "custom") return;
    void computeFitScale(fitMode);
  }, [fitMode, computeFitScale, report?.id, pageCount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pdfDoc || !canvasRef.current) return;
      const pdfPage = await pdfDoc.getPage(page);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, page, scale, rotation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pdfDoc || !search.trim()) {
        setSearchHits([]);
        return;
      }
      const q = search.trim().toLowerCase();
      const hits: number[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i += 1) {
        const p = await pdfDoc.getPage(i);
        const text = await p.getTextContent();
        const combined = text.items
          .map((item) => ("str" in item ? String(item.str) : ""))
          .join(" ")
          .toLowerCase();
        if (combined.includes(q)) hits.push(i);
      }
      if (!cancelled) {
        setSearchHits(hits);
        setHitIndex(0);
        if (hits.length) setPage(hits[0]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, search]);

  const metaRows = useMemo((): MetaRow[] => {
    if (!report) return [];
    const framework =
      report.frameworks?.length > 0
        ? report.frameworks.join(", ")
        : report.scope?.frameworks?.join(", ") || "—";

    return [
      {
        icon: User,
        label: "Generated By",
        value: displayFirstName(report.generatedBy),
      },
      {
        icon: Briefcase,
        label: "Role",
        value: report.userPosition || report.metadata?.userPosition || "—",
      },
      {
        icon: Building2,
        label: "Department",
        value: report.department || report.metadata?.department || "—",
      },
      { icon: Calendar, label: "Date", value: report.issueDate || "—" },
      { icon: Clock, label: "Time", value: report.generatedTime || "—" },
      { icon: CalendarDays, label: "Day", value: report.dayOfWeek || "—" },
      {
        icon: Shield,
        label: "Classification",
        value: report.classification || "—",
      },
      { icon: Hash, label: "Version", value: report.version || "—" },
      { icon: FileText, label: "Report ID", value: report.reportId || "—" },
      { icon: Layers, label: "Framework", value: framework },
      {
        icon: Building,
        label: "Company",
        value: report.organizationName || "—",
      },
      { icon: CircleDot, label: "Status", value: report.status || "—" },
    ];
  }, [report]);

  const download = () => {
    if (!report?.pdfDataUrl) return;
    downloadPdfBlob(
      dataUrlToBlob(report.pdfDataUrl),
      `${report.reportId}_${report.name.replace(/[^\w\-]+/g, "_")}.pdf`
    );
    onToast?.("PDF download started (read-only package).");
  };

  const printPdf = async () => {
    if (!report?.pdfDataUrl) return;
    const blob = dataUrlToBlob(report.pdfDataUrl);
    const url = URL.createObjectURL(blob);
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.src = url;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(frame);
        URL.revokeObjectURL(url);
      }, 1000);
    };
    onToast?.("Print dialog opened for read-only PDF.");
  };

  const toggleFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const goToPage = (next: number) => {
    if (!pageCount) return;
    const clamped = Math.min(pageCount, Math.max(1, next));
    setPage(clamped);
  };

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) goToPage(parsed);
    else setPageInput(String(page));
  };

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return (
    <section
      ref={rootRef}
      className={`${styles.viewer} ${fullscreen ? styles.fullscreen : ""}`}
      aria-label="Live PDF preview"
    >
      <header className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.toolBtn}
            aria-label="Zoom out"
            disabled={!pdfDoc}
            onClick={() => {
              setFitMode("custom");
              setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))));
            }}
          >
            <ZoomOut size={16} aria-hidden />
          </button>
          <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className={styles.toolBtn}
            aria-label="Zoom in"
            disabled={!pdfDoc}
            onClick={() => {
              setFitMode("custom");
              setScale((s) => Math.min(3, Number((s + 0.1).toFixed(2))));
            }}
          >
            <ZoomIn size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={!pdfDoc}
            onClick={() => setFitMode("width")}
          >
            Fit Width
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={!pdfDoc}
            onClick={() => setFitMode("page")}
          >
            Fit Page
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.toolBtn}
            aria-label="Previous page"
            disabled={!pdfDoc || page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <label className={styles.pageNav} htmlFor="pdf-page-input">
            <span className={styles.srOnly}>Current page</span>
            <input
              id="pdf-page-input"
              className={styles.pageInput}
              type="text"
              inputMode="numeric"
              value={pageInput}
              disabled={!pdfDoc}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={commitPageInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPageInput();
              }}
            />
            <span className={styles.pageOf}>/ {pageCount || "—"}</span>
          </label>
          <button
            type="button"
            className={styles.toolBtn}
            aria-label="Next page"
            disabled={!pdfDoc || page >= pageCount}
            onClick={() => goToPage(page + 1)}
          >
            <ChevronRight size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            aria-label="Rotate"
            disabled={!pdfDoc}
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw size={16} aria-hidden />
          </button>
        </div>

        <div className={`${styles.toolbarGroup} ${styles.searchGroup}`}>
          <Search size={15} aria-hidden />
          <label className={styles.srOnly} htmlFor="pdf-search">
            Search inside PDF
          </label>
          <input
            id="pdf-search"
            type="search"
            placeholder="Search inside PDF…"
            value={search}
            disabled={!pdfDoc}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchHits.length ? (
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => {
                const next = (hitIndex + 1) % searchHits.length;
                setHitIndex(next);
                setPage(searchHits[next]);
              }}
            >
              {hitIndex + 1}/{searchHits.length}
            </button>
          ) : null}
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.secondaryBtn}`}
            disabled={!report?.pdfDataUrl}
            onClick={() => void printPdf()}
          >
            <Printer size={16} aria-hidden />
            Print
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.secondaryBtn}`}
            disabled={!report?.pdfDataUrl}
            onClick={download}
          >
            <Download size={16} aria-hidden />
            Download
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? (
              <Minimize2 size={16} aria-hidden />
            ) : (
              <Maximize2 size={16} aria-hidden />
            )}
          </button>
          {onClosePreview && report ? (
            <button
              type="button"
              className={`${styles.toolBtn} ${styles.secondaryBtn}`}
              onClick={onClosePreview}
            >
              <X size={16} aria-hidden />
              Close Preview
            </button>
          ) : null}
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.thumbs} aria-label="Thumbnail navigation">
          {thumbsLoading ? (
            <div className={styles.thumbLoading}>
              <Loader2 size={18} className={styles.spinner} aria-hidden />
              <span>Loading…</span>
            </div>
          ) : thumbnails.length === 0 ? (
            <p className={styles.thumbEmpty}>Page thumbnails</p>
          ) : (
            thumbnails.map((src, index) => (
              <button
                key={`thumb-${index + 1}`}
                type="button"
                className={`${styles.thumb} ${page === index + 1 ? styles.thumbActive : ""}`}
                onClick={() => goToPage(index + 1)}
                aria-label={`Go to page ${index + 1}`}
                aria-current={page === index + 1 ? "page" : undefined}
              >
                <img src={src} alt="" />
                <span>{index + 1}</span>
              </button>
            ))
          )}
        </aside>

        <div className={styles.stage} ref={stageRef}>
          {loading ? (
            <div className={styles.stateCard} role="status">
              <Loader2 size={32} className={styles.spinner} aria-hidden />
              <div className={styles.progressTrack}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <strong>Generating enterprise PDF…</strong>
              <p>{phase || "Preparing Data"}</p>
              <p className={styles.hint}>{progress}% complete</p>
            </div>
          ) : pdfLoading ? (
            <div className={styles.stateCard} role="status">
              <Loader2 size={32} className={styles.spinner} aria-hidden />
              <strong>Loading PDF preview…</strong>
              <p>Rendering document pages</p>
            </div>
          ) : renderError ? (
            <div className={styles.stateCard} role="alert">
              <FileSearch size={28} aria-hidden />
              <strong>Unable to render PDF</strong>
              <p>{renderError}</p>
            </div>
          ) : !report?.pdfDataUrl ? (
            <div className={styles.stateCard}>
              <Expand size={28} aria-hidden />
              <strong>Live PDF Preview</strong>
              <p>
                Generate or preview a report to open the Adobe-style viewer here.
                Documents are read-only — print and download only.
              </p>
            </div>
          ) : (
            <div className={styles.canvasWrap}>
              <canvas ref={canvasRef} className={styles.canvas} />
            </div>
          )}
        </div>

        {report ? (
          <aside className={styles.meta} aria-label="Report metadata">
            <div className={styles.metaCard}>
              <header className={styles.metaHeader}>
                <h3>Report Information</h3>
                <p className={styles.readOnly}>Read-only · editing disabled</p>
              </header>
              <ul className={styles.metaList}>
                {metaRows.map(({ icon: Icon, label, value }) => (
                  <li key={label} className={styles.metaRow}>
                    <span className={styles.metaIcon} aria-hidden>
                      <Icon size={15} />
                    </span>
                    <div className={styles.metaContent}>
                      <span className={styles.metaLabel}>{label}</span>
                      <span className={styles.metaValue}>{value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

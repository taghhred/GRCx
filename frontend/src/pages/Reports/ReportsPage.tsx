import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import CreateReportWizard from "../../components/reports/CreateReportWizard";
import ReportDetailsDrawer from "../../components/reports/ReportDetailsDrawer";
import ReportPdfViewer from "../../components/reports/ReportPdfViewer";
import ReportsFilterToolbar, {
  type ReportsFilters,
} from "../../components/reports/ReportsFilterToolbar";
import ReportsHistoryTable, {
  type ReportHistoryAction,
  type ReportSortKey,
} from "../../components/reports/ReportsHistoryTable";
import {
  deleteReport,
  duplicateReport,
  ensureReportPdf,
  hydrateReportsFromApi,
  listAllReports,
  updateReport,
} from "../../mocks/services/reportService";
import type { Report } from "../../mocks/types/reports";
import {
  dataUrlToBlob,
  downloadPdfBlob,
} from "../../services/grcxPdfEngine";
import { displayFirstName } from "../../utils/reportDisplay";
import styles from "./ReportsPage.module.css";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: ReportsFilters = {
  query: "",
  reportType: "All",
  period: "All",
  status: "All",
  auditor: "All",
  framework: "All",
  createdBy: "All",
};

function compareReports(a: Report, b: Report, key: ReportSortKey): number {
  const av = String(a[key] ?? "").toLowerCase();
  const bv = String(b[key] ?? "").toLowerCase();
  return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
}

export default function ReportsPage() {
  const [tick, setTick] = useState(0);
  const reports = useMemo(() => listAllReports(), [tick]);
  const [filters, setFilters] = useState<ReportsFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    void hydrateReportsFromApi().then(() => {
      if (!cancelled) setTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [sortKey, setSortKey] = useState<ReportSortKey>("issueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [detailsReport, setDetailsReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState("Finalizing PDF");
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Report | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const auditors = useMemo(
    () => [...new Set(reports.map((r) => r.auditor).filter(Boolean))].sort(),
    [reports]
  );

  const frameworks = useMemo(
    () =>
      [
        ...new Set(
          reports.flatMap((r) => r.frameworks).filter(Boolean)
        ),
      ].sort(),
    [reports]
  );

  const createdByOptions = useMemo(
    () =>
      [
        ...new Set(
          reports.map((r) => displayFirstName(r.generatedBy)).filter(Boolean)
        ),
      ].sort(),
    [reports]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return reports.filter((report) => {
      if (filters.reportType !== "All" && report.category !== filters.reportType) {
        return false;
      }
      if (
        filters.period !== "All" &&
        !report.reportingPeriod.toLowerCase().includes(filters.period.toLowerCase())
      ) {
        return false;
      }
      if (filters.status !== "All" && report.status !== filters.status) {
        return false;
      }
      if (filters.auditor !== "All" && report.auditor !== filters.auditor) {
        return false;
      }
      if (
        filters.framework !== "All" &&
        !report.frameworks.includes(filters.framework)
      ) {
        return false;
      }
      if (
        filters.createdBy !== "All" &&
        displayFirstName(report.generatedBy) !== filters.createdBy
      ) {
        return false;
      }
      if (!q) return true;
      return (
        report.reportId.toLowerCase().includes(q) ||
        report.name.toLowerCase().includes(q) ||
        report.reportType.toLowerCase().includes(q) ||
        report.auditor.toLowerCase().includes(q) ||
        displayFirstName(report.generatedBy).toLowerCase().includes(q)
      );
    });
  }, [reports, filters]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const cmp = compareReports(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  useEffect(() => setPage(0), [filters, filtered.length]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const onSort = (key: ReportSortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const openPreview = async (report: Report) => {
    setGenerating(true);
    setPhase("Finalizing PDF");
    setProgress(70);
    try {
      const ready = await ensureReportPdf(report);
      setPreviewReport(ready);
      refresh();
      setNotice(`${ready.reportId} opened in preview.`);
    } finally {
      setGenerating(false);
      setProgress(100);
    }
  };

  const downloadReport = async (report: Report) => {
    const ready = await ensureReportPdf(report);
    if (!ready.pdfDataUrl) return;
    downloadPdfBlob(
      dataUrlToBlob(ready.pdfDataUrl),
      `${ready.reportId}_${ready.name.replace(/[^\w\-]+/g, "_")}.pdf`
    );
    setNotice(`Downloading ${ready.reportId} (read-only PDF).`);
  };

  const onTableAction = async (report: Report, action: ReportHistoryAction) => {
    if (action === "Preview") {
      await openPreview(report);
      return;
    }
    if (action === "Download PDF") {
      await downloadReport(report);
      return;
    }
    if (action === "Open Details") {
      setDetailsReport(report);
      return;
    }
    if (action === "Duplicate") {
      const clone = duplicateReport(report.id);
      if (clone) {
        refresh();
        setNotice(`${clone.reportId} duplicated as draft.`);
      }
      return;
    }
    if (action === "Rename") {
      const next = window.prompt("Report name", report.name);
      if (next?.trim()) {
        updateReport(report.id, { name: next.trim() });
        refresh();
        setNotice(`${report.reportId} renamed.`);
      }
      return;
    }
    if (action === "Archive") {
      updateReport(report.id, { status: "Archived" });
      refresh();
      setNotice(`${report.reportId} archived.`);
      return;
    }
    if (action === "Delete Draft") {
      setConfirmDelete(report);
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          title="Reports"
          description="Generate, review, and export enterprise GRC reports with audit-ready PDF packages."
          primaryAction={
            <Button onClick={() => setWizardOpen(true)}>
              <Plus size={16} aria-hidden />
              Create Report
            </Button>
          }
        />

        {notice ? (
          <div className={styles.notice} role="status">
            <span>{notice}</span>
            <button
              type="button"
              className={styles.noticeClose}
              aria-label="Dismiss notice"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <ReportsFilterToolbar
          filters={filters}
          auditors={auditors}
          frameworks={frameworks}
          createdByOptions={createdByOptions}
          onChange={setFilters}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          onRefresh={refresh}
        />

        <div className={styles.tableSection}>
          <div className={styles.tableMeta}>
            <p>
              Showing <strong>{filtered.length}</strong> of{" "}
              <strong>{reports.length}</strong> reports
            </p>
          </div>

          <ReportsHistoryTable
            reports={pageRows}
            emptyMessage="No reports match the current filters."
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onRowClick={(report) => setDetailsReport(report)}
            onAction={(report, action) => void onTableAction(report, action)}
          />

          <div className={styles.pager}>
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <CreateReportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerated={(report) => {
          refresh();
          setWizardOpen(false);
          void openPreview(report);
        }}
      />

      <ReportDetailsDrawer
        report={detailsReport}
        open={Boolean(detailsReport)}
        onClose={() => setDetailsReport(null)}
        onPreview={(report) => void openPreview(report)}
        onDownload={(report) => void downloadReport(report)}
      />

      {previewReport ? (
        <div className={styles.previewOverlay} role="presentation">
          <div
            className={styles.previewDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Report preview"
          >
            <ReportPdfViewer
              report={previewReport}
              loading={generating}
              progress={progress}
              phase={phase}
              onToast={setNotice}
              onClosePreview={() => setPreviewReport(null)}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete draft report?"
        message={
          confirmDelete
            ? `Delete ${confirmDelete.reportId} — ${confirmDelete.name}? This removes it from session history.`
            : ""
        }
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteReport(confirmDelete.id);
            if (previewReport?.id === confirmDelete.id) setPreviewReport(null);
            if (detailsReport?.id === confirmDelete.id) setDetailsReport(null);
            refresh();
            setNotice(`${confirmDelete.reportId} deleted.`);
          }
          setConfirmDelete(null);
        }}
      />
    </DashboardLayout>
  );
}

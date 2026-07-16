import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import Button from "../../components/common/Button";
import ExecutiveKpiRow from "../../components/dashboard/ExecutiveKpiRow";
import DashboardTimeRangePicker from "../../components/dashboard/DashboardTimeRangePicker";
import DashboardChartsSection from "../../components/dashboard/DashboardChartsSection";
import DashboardOrganizationPanel from "../../components/dashboard/DashboardOrganizationPanel";
import DashboardResponsibilitiesPanel from "../../components/dashboard/DashboardResponsibilitiesPanel";
import {
  fetchAnalytics,
  fetchKpis,
} from "../../services/api/dashboardApi";
import type { DashboardAnalytics } from "../../mocks/services/dashboardAnalyticsService";
import type {
  DashboardTimeRange,
  ExecutiveKpi,
} from "../../mocks/types/executiveKpi";
import {
  refreshIntervalMs,
  refreshTimeRangeBounds,
  timeRangeFromSearchParams,
  timeRangeToSearchParams,
} from "../../utils/dashboardTimeRange";
import { EXCEL_ACCEPT, isAllowedExcelFilename } from "../../services/excelExportService";
import { importRiskExcel } from "../../services/api/riskApi";
import styles from "./Dashboard.module.css";

type ViewState = "loading" | "success" | "empty" | "error";
type DashboardTab = "overview" | "organization" | "responsibilities";

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "organization", label: "Organization" },
  { id: "responsibilities", label: "Responsibilities" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const timeRange = useMemo(
    () => timeRangeFromSearchParams(searchParams),
    [searchParams]
  );

  const [view, setView] = useState<ViewState>("loading");
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [kpis, setKpis] = useState<ExecutiveKpi[]>([]);
  const [errorMessage, setErrorMessage] = useState("Unable to load dashboard.");
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const setTimeRange = (next: DashboardTimeRange) => {
    setSearchParams(timeRangeToSearchParams(next), { replace: true });
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setView("loading");
    try {
      const result = await fetchAnalytics({
        start: timeRange.startIso,
        end: timeRange.endIso,
      });
      setAnalytics(result);
      setKpis(await fetchKpis(timeRange, result));
      setView(result.risks.length === 0 ? "empty" : "success");
    } catch {
      setAnalytics(null);
      setKpis([]);
      setErrorMessage("Unable to load dashboard analytics. Please try again.");
      setView("error");
    }
  }, [timeRange]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setView((prev) => (prev === "success" || prev === "empty" ? prev : "loading"));
      try {
        const result = await fetchAnalytics({
          start: timeRange.startIso,
          end: timeRange.endIso,
        });
        if (cancelled) return;
        setAnalytics(result);
        const nextKpis = await fetchKpis(timeRange, result);
        if (cancelled) return;
        setKpis(nextKpis);
        setView(result.risks.length === 0 ? "empty" : "success");
      } catch {
        if (cancelled) return;
        setAnalytics(null);
        setKpis([]);
        setErrorMessage("Unable to load dashboard analytics. Please try again.");
        setView("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  useEffect(() => {
    const ms = refreshIntervalMs(timeRange.refreshInterval);
    if (!ms) return;
    const id = window.setInterval(() => {
      const next = refreshTimeRangeBounds(timeRange);
      if (
        next.startIso === timeRange.startIso &&
        next.endIso === timeRange.endIso &&
        next.preset === timeRange.preset &&
        next.refreshInterval === timeRange.refreshInterval
      ) {
        void load({ silent: true });
        return;
      }
      setSearchParams(timeRangeToSearchParams(next), { replace: true });
    }, ms);
    return () => window.clearInterval(id);
  }, [timeRange, setSearchParams, load]);

  async function handleImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    const allowed = Array.from(files).filter((f) => isAllowedExcelFilename(f.name));
    if (allowed.length === 0) {
      setNotice("Please select a valid Excel workbook.");
      return;
    }
    try {
      for (const file of allowed) {
        await importRiskExcel(file, "append-update");
      }
      await load();
      setNotice(`Imported ${allowed.length} workbook(s).`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Import failed.");
    }
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <PageHeader
          title="Dashboard"
          secondaryActions={
            <DashboardTimeRangePicker value={timeRange} onChange={setTimeRange} />
          }
        />

        <nav className={styles.tabs} aria-label="Dashboard views">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.tab} ${tab === item.id ? styles.tabActive : ""}`}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {notice ? (
          <div className={styles.notice} role="status">
            <span>{notice}</span>
            <button type="button" className={styles.noticeDismiss} onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <input
          ref={importRef}
          type="file"
          multiple
          accept={EXCEL_ACCEPT}
          className={styles.hiddenInput}
          onChange={(event) => {
            void handleImport(event.target.files);
            event.target.value = "";
          }}
        />

        {tab === "overview" ? (
          <>
            {view === "loading" ? <LoadingSkeleton rows={4} height={88} /> : null}

            {view === "error" ? (
              <ErrorState message={errorMessage} onRetry={() => void load()} />
            ) : null}

            {view === "empty" ? (
              <EmptyState
                title="No portfolio data"
                description="Import a risk register or open Risk Assessment."
                action={
                  <div className={styles.emptyActions}>
                    <Button variant="primary" onClick={() => importRef.current?.click()}>
                      Import Excel
                    </Button>
                    <Button variant="secondary" onClick={() => navigate("/risk/register")}>
                      Open Risk Register
                    </Button>
                  </div>
                }
              />
            ) : null}

            {(view === "success" || view === "empty") && analytics ? (
              <div className={styles.overview}>
                <section className={styles.section} aria-labelledby="dashboard-kpis-heading">
                  <h2 id="dashboard-kpis-heading" className={styles.sectionTitle}>
                    Executive KPIs
                  </h2>
                  <ExecutiveKpiRow kpis={kpis} timeRange={timeRange} />
                </section>

                {view === "success" ? (
                  <DashboardChartsSection analytics={analytics} />
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {tab === "organization" ? <DashboardOrganizationPanel /> : null}
        {tab === "responsibilities" ? <DashboardResponsibilitiesPanel /> : null}
      </div>
    </DashboardLayout>
  );
}

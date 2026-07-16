/* eslint-disable react-refresh/only-export-components -- provider + hook co-located */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RiskRegisterItem } from "../../mocks/types/riskRegister";
import { computeRiskStats } from "../risk/riskExcelClient";
import {
  archiveRisk,
  createRisk,
  fetchRisks,
  importRiskExcel,
  syncRiskFolder,
  updateRisk,
} from "../api/riskApi";
import type { RiskImportSummary, RiskStats } from "../../mocks/types/riskRegister";
import { enrichRiskContext } from "../../mocks/data/riskCatalogs";

export interface EnrichedRisk extends RiskRegisterItem {
  threatName: string;
  vulnerabilityName: string;
  assetCriticality: string;
}

function enrich(rows: RiskRegisterItem[]): EnrichedRisk[] {
  return rows.map((r) => {
    const ctx = enrichRiskContext(r.affectedAsset || r.title, r.category);
    return {
      ...r,
      threatName: ctx.threat.name,
      vulnerabilityName: ctx.vulnerability.name,
      assetCriticality: ctx.assetCriticality,
    };
  });
}

interface RiskModuleValue {
  risks: EnrichedRisk[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  setNotice: (n: string | null) => void;
  stats: RiskStats;
  selectedRiskId: string | null;
  setSelectedRiskId: (id: string | null) => void;
  selectedRisk: EnrichedRisk | null;
  heatmapFilter: { likelihood: number; impact: number } | null;
  setHeatmapFilter: (f: { likelihood: number; impact: number } | null) => void;
  reload: () => Promise<void>;
  refreshFromFolder: () => Promise<void>;
  importFiles: (files: FileList | File[]) => Promise<void>;
  saveRisk: (
    payload: Partial<RiskRegisterItem> & { riskId: string; title: string },
    mode: "create" | "update"
  ) => Promise<void>;
  removeRisk: (riskId: string) => Promise<void>;
}

const RiskModuleContext = createContext<RiskModuleValue | null>(null);

export function RiskModuleProvider({ children }: { children: ReactNode }) {
  const [risks, setRisks] = useState<EnrichedRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [heatmapFilter, setHeatmapFilter] = useState<{
    likelihood: number;
    impact: number;
  } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRisks();
      setRisks(enrich(rows.filter((r) => r.status !== "Archived")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load risk register.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap register data on provider mount
    void reload();
  }, [reload]);

  const stats = useMemo(() => computeRiskStats(risks), [risks]);

  const selectedRisk = useMemo(
    () => risks.find((r) => r.riskId === selectedRiskId) ?? null,
    [risks, selectedRiskId]
  );

  const refreshFromFolder = useCallback(async () => {
    setLoading(true);
    try {
      const summaries = await syncRiskFolder();
      await reload();
      const imported = summaries.reduce((n, s) => n + s.imported + s.updated, 0);
      setNotice(`Synced ${summaries.length} workbook(s). ${imported} records refreshed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
      setLoading(false);
    }
  }, [reload]);

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const results: RiskImportSummary[] = [];
      for (const file of list) {
        results.push(await importRiskExcel(file, "append-update"));
      }
      await reload();
      const imported = results.reduce((n, s) => n + s.imported, 0);
      const updated = results.reduce((n, s) => n + s.updated, 0);
      const skipped = results.reduce((n, s) => n + s.skipped_duplicates, 0);
      const errors = results.reduce((n, s) => n + s.errors, 0);
      setNotice(
        `Imported: ${imported} · Updated: ${updated} · Skipped: ${skipped} · Errors: ${errors}`
      );
    },
    [reload]
  );

  const saveRisk = useCallback(
    async (
      payload: Partial<RiskRegisterItem> & { riskId: string; title: string },
      mode: "create" | "update"
    ) => {
      if (mode === "create") {
        await createRisk(payload);
      } else {
        await updateRisk(payload.riskId, payload);
      }
      await reload();
      setNotice(mode === "create" ? `Created ${payload.riskId}` : `Updated ${payload.riskId}`);
    },
    [reload]
  );

  const removeRisk = useCallback(
    async (riskId: string) => {
      await archiveRisk(riskId);
      await reload();
      if (selectedRiskId === riskId) setSelectedRiskId(null);
      setNotice(`Archived ${riskId}`);
    },
    [reload, selectedRiskId]
  );

  const value = useMemo(
    () => ({
      risks,
      loading,
      error,
      notice,
      setNotice,
      stats,
      selectedRiskId,
      setSelectedRiskId,
      selectedRisk,
      heatmapFilter,
      setHeatmapFilter,
      reload,
      refreshFromFolder,
      importFiles,
      saveRisk,
      removeRisk,
    }),
    [
      risks,
      loading,
      error,
      notice,
      stats,
      selectedRiskId,
      selectedRisk,
      heatmapFilter,
      reload,
      refreshFromFolder,
      importFiles,
      saveRisk,
      removeRisk,
    ]
  );

  return (
    <RiskModuleContext.Provider value={value}>{children}</RiskModuleContext.Provider>
  );
}

export function useRiskModule(): RiskModuleValue {
  const ctx = useContext(RiskModuleContext);
  if (!ctx) {
    throw new Error("useRiskModule must be used within RiskModuleProvider");
  }
  return ctx;
}

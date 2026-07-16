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
import type {
  ComplianceAssessmentItem,
  ComplianceEvidenceItem,
  ComplianceFindingItem,
  ComplianceFrameworkSummary,
  ComplianceImportSummary,
  ComplianceRegisterItem,
  ComplianceStats,
} from "../../mocks/types/complianceManagement";
import {
  fetchComplianceBundle,
  importComplianceExcel,
  reloadComplianceSeeds,
} from "../api/complianceApi";

export type ComplianceRecordType =
  | "register"
  | "assessment"
  | "evidence"
  | "finding"
  | "framework";

interface ComplianceModuleValue {
  register: ComplianceRegisterItem[];
  assessments: ComplianceAssessmentItem[];
  evidence: ComplianceEvidenceItem[];
  findings: ComplianceFindingItem[];
  frameworks: ComplianceFrameworkSummary[];
  stats: ComplianceStats;
  loading: boolean;
  error: string | null;
  notice: string | null;
  setNotice: (n: string | null) => void;
  selectedId: string | null;
  selectedType: ComplianceRecordType | null;
  setSelection: (id: string | null, type?: ComplianceRecordType | null) => void;
  reload: () => Promise<void>;
  importFiles: (files: FileList | File[]) => Promise<void>;
  refreshFromFolder: () => Promise<void>;
}

const emptyStats: ComplianceStats = {
  overallCompliancePercent: 0,
  passedControls: 0,
  failedControls: 0,
  openFindings: 0,
  overdueReviews: 0,
  evidenceCoveragePercent: 0,
  byFramework: {},
  byDepartment: {},
  byBusinessUnit: {},
  byRiskLevel: {},
  byStatus: {},
};

const ComplianceModuleContext = createContext<ComplianceModuleValue | null>(null);

export function ComplianceModuleProvider({ children }: { children: ReactNode }) {
  const [register, setRegister] = useState<ComplianceRegisterItem[]>([]);
  const [assessments, setAssessments] = useState<ComplianceAssessmentItem[]>([]);
  const [evidence, setEvidence] = useState<ComplianceEvidenceItem[]>([]);
  const [findings, setFindings] = useState<ComplianceFindingItem[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFrameworkSummary[]>([]);
  const [stats, setStats] = useState<ComplianceStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ComplianceRecordType | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchComplianceBundle();
      setRegister(bundle.register);
      setAssessments(bundle.assessments);
      setEvidence(bundle.evidence);
      setFindings(bundle.findings);
      setFrameworks(bundle.frameworks);
      setStats(bundle.stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load compliance portfolio."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap compliance data on provider mount
    void reload();
  }, [reload]);

  const setSelection = useCallback(
    (id: string | null, type: ComplianceRecordType | null = "register") => {
      setSelectedId(id);
      setSelectedType(id ? type : null);
    },
    []
  );

  const refreshFromFolder = useCallback(async () => {
    setLoading(true);
    try {
      const summaries = await reloadComplianceSeeds();
      await reload();
      const imported = summaries.reduce((n, s) => n + s.imported + s.updated, 0);
      setNotice(
        `Synced ${summaries.length} workbook(s). ${imported} records refreshed.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
      setLoading(false);
    }
  }, [reload]);

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const results: ComplianceImportSummary[] = [];
      for (const file of list) {
        results.push(await importComplianceExcel(file, "append-update"));
      }
      await reload();
      const imported = results.reduce((n, s) => n + s.imported, 0);
      const updated = results.reduce((n, s) => n + s.updated, 0);
      const skipped = results.reduce((n, s) => n + (s.skipped_duplicates ?? s.skipped ?? 0), 0);
      const errors = results.reduce((n, s) => n + s.errors, 0);
      setNotice(
        `Imported: ${imported} · Updated: ${updated} · Skipped: ${skipped} · Errors: ${errors}`
      );
    },
    [reload]
  );

  const value = useMemo(
    () => ({
      register,
      assessments,
      evidence,
      findings,
      frameworks,
      stats,
      loading,
      error,
      notice,
      setNotice,
      selectedId,
      selectedType,
      setSelection,
      reload,
      importFiles,
      refreshFromFolder,
    }),
    [
      register,
      assessments,
      evidence,
      findings,
      frameworks,
      stats,
      loading,
      error,
      notice,
      selectedId,
      selectedType,
      setSelection,
      reload,
      importFiles,
      refreshFromFolder,
    ]
  );

  return (
    <ComplianceModuleContext.Provider value={value}>
      {children}
    </ComplianceModuleContext.Provider>
  );
}

export function useComplianceModule(): ComplianceModuleValue {
  const ctx = useContext(ComplianceModuleContext);
  if (!ctx) {
    throw new Error("useComplianceModule must be used within ComplianceModuleProvider");
  }
  return ctx;
}

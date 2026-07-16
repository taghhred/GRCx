import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Undo2 } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/common/Button";
import {
  ExportCurrentViewButton,
  ImportMergeExcelButton,
} from "../../components/common/DataTransferButton";
import ExcelImportWizard from "../../components/excel/ExcelImportWizard";
import ExcelExportDialog from "../../components/excel/ExcelExportDialog";
import StatusBadge from "../../components/ui/StatusBadge";
import SeverityBadge from "../../components/ui/SeverityBadge";
import AssetComplianceDrawer from "../../components/compliance/AssetComplianceDrawer";
import AssetRowMenu from "../../components/compliance/AssetRowMenu";
import { clearAiSelection, setAiSelection } from "../../components/ai/aiSelectionBridge";
import {
  ASSET_TYPE_TABS,
  assetComplianceData,
  tabToAssetType,
} from "../../mocks/data/complianceData";
import type {
  ComplianceAsset,
  ComplianceRiskLevel,
  ComplianceStatus,
  FrameworkCode,
} from "../../mocks/types/compliance";
import {
  complianceBuildNew,
  complianceMerge,
  complianceToFlat,
} from "../../services/excel/adapters/complianceAdapters";
import { complianceSchema } from "../../services/excel/moduleSchemas";
import { useOperationalModuleData } from "../../services/excel/useOperationalModuleData";
import {
  fetchAssetCompliance,
  replaceAssets,
} from "../../services/api/assetComplianceApi";
import { resetModuleStore, getModuleRows } from "../../mocks/services/operationalDataStore";
import { SEARCH_MAX_LENGTH } from "../../utils/security";
import styles from "./AssetCompliance.module.css";

type AssetTab = (typeof ASSET_TYPE_TABS)[number];

const STATUS_OPTIONS: Array<ComplianceStatus | "All"> = [
  "All",
  "Compliant",
  "Partially Compliant",
  "Non-Compliant",
  "Under Review",
];

const RISK_OPTIONS: Array<ComplianceRiskLevel | "All"> = [
  "All",
  "Low",
  "Medium",
  "High",
  "Critical",
];

const EXPORT_COLUMNS = [
  { key: "id", header: "Asset ID" },
  { key: "name", header: "Asset Name" },
  { key: "assetType", header: "Asset Type" },
  { key: "owner", header: "Owner" },
  { key: "department", header: "Department" },
  { key: "operatingSystem", header: "Operating System" },
  { key: "framework", header: "Framework" },
  { key: "complianceStatus", header: "Compliance Status" },
  { key: "riskLevel", header: "Risk Level" },
  { key: "lastAssessment", header: "Last Assessment" },
  { key: "failedControlId", header: "Failed Control ID" },
  { key: "failedControlName", header: "Failed Control Name" },
];

function statusTone(
  status: ComplianceStatus
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Compliant") return "success";
  if (status === "Partially Compliant") return "warning";
  if (status === "Under Review") return "info";
  return "danger";
}

export default function AssetCompliance() {
  const [seedAssets, setSeedAssets] = useState<ComplianceAsset[]>(
    assetComplianceData.assets
  );
  const [departments, setDepartments] = useState<string[]>(
    assetComplianceData.departments
  );
  const [frameworks, setFrameworks] = useState<FrameworkCode[]>(
    assetComplianceData.frameworks
  );

  const { rows, flatRecords, affectedIds, canUndo, applyImport, undo } =
    useOperationalModuleData(
      "compliance",
      seedAssets,
      complianceSchema,
      {
        toFlat: complianceToFlat,
        buildNew: complianceBuildNew,
        mergeExisting: complianceMerge,
      }
    );

  useEffect(() => {
    let cancelled = false;
    void fetchAssetCompliance().then((bundle) => {
      if (cancelled) return;
      setSeedAssets(bundle.assets);
      setDepartments(bundle.departments);
      setFrameworks(bundle.frameworks);
      resetModuleStore("compliance", bundle.assets);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyImport = useCallback(
    (payload: Parameters<typeof applyImport>[0]) => {
      const result = applyImport(payload);
      const nextRows = getModuleRows<ComplianceAsset>("compliance");
      void replaceAssets(nextRows).catch(() => undefined);
      return result;
    },
    [applyImport]
  );

  const [tab, setTab] = useState<AssetTab>("All Assets");
  const [query, setQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("All");
  const [department, setDepartment] = useState("All");
  const [framework, setFramework] = useState<FrameworkCode | "All">("All");
  const [status, setStatus] = useState<ComplianceStatus | "All">("All");
  const [risk, setRisk] = useState<ComplianceRiskLevel | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSingle, setExportSingle] = useState<ComplianceAsset | null>(
    null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightOnly, setHighlightOnly] = useState(false);

  const selected = useMemo(
    () => rows.find((asset) => asset.id === selectedId) ?? null,
    [selectedId, rows]
  );

  useEffect(() => {
    if (!selected) {
      clearAiSelection();
      return;
    }
    setAiSelection({
      selectedAssetId: selected.id,
      entityTitle: selected.name,
      assignedAuditor: selected.owner,
      selectedFramework: selected.frameworks[0] ?? selected.framework,
    });
    return () => clearAiSelection();
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tabType = tabToAssetType(tab);

    return rows.filter((asset) => {
      if (highlightOnly && !affectedIds.includes(asset.id)) return false;
      const matchesTab = tabType === null || asset.assetType === tabType;
      const matchesQuery =
        q.length === 0 ||
        asset.name.toLowerCase().includes(q) ||
        asset.owner.toLowerCase().includes(q) ||
        asset.failedControlId.toLowerCase().includes(q) ||
        asset.id.toLowerCase().includes(q);
      const matchesType =
        assetTypeFilter === "All" || asset.assetType === assetTypeFilter;
      const matchesDept =
        department === "All" || asset.department === department;
      const matchesFramework =
        framework === "All" || asset.framework === framework;
      const matchesStatus =
        status === "All" || asset.complianceStatus === status;
      const matchesRisk = risk === "All" || asset.riskLevel === risk;
      return (
        matchesTab &&
        matchesQuery &&
        matchesType &&
        matchesDept &&
        matchesFramework &&
        matchesStatus &&
        matchesRisk
      );
    });
  }, [
    rows,
    tab,
    query,
    assetTypeFilter,
    department,
    framework,
    status,
    risk,
    highlightOnly,
    affectedIds,
  ]);

  const openDetails = (asset: ComplianceAsset) => setSelectedId(asset.id);

  const filterSummary = [
    ...(query ? [{ label: "Search", value: query }] : []),
    ...(tab !== "All Assets" ? [{ label: "Tab", value: tab }] : []),
    ...(assetTypeFilter !== "All"
      ? [{ label: "Asset type", value: assetTypeFilter }]
      : []),
    ...(department !== "All"
      ? [{ label: "Department", value: department }]
      : []),
    ...(framework !== "All" ? [{ label: "Framework", value: framework }] : []),
    ...(status !== "All" ? [{ label: "Compliance status", value: status }] : []),
    ...(risk !== "All" ? [{ label: "Risk level", value: risk }] : []),
    ...(highlightOnly
      ? [{ label: "View", value: "Imported / updated only" }]
      : []),
  ];

  const exportRows = exportSingle
    ? [complianceToFlat(exportSingle)]
    : filtered.map((row) => complianceToFlat(row));

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          title="Asset Compliance"
          description="Monitor compliance across all organizational assets, identities, endpoints and infrastructure against regulatory frameworks."
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

        <p className={styles.prototypeNote} role="note">
          Session prototype: imported asset compliance records live in memory
          only and reset on refresh. Permanent storage requires backend
          integration.
        </p>

        <div className={styles.toolbar} role="search">
          <div className={styles.search}>
            <Search size={18} aria-hidden />
            <label className={styles.srOnly} htmlFor="compliance-search">
              Search assets
            </label>
            <input
              id="compliance-search"
              type="search"
              placeholder="Search assets"
              value={query}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(event) =>
                setQuery(event.target.value.slice(0, SEARCH_MAX_LENGTH))
              }
              autoComplete="off"
            />
          </div>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Asset type filter</span>
            <select
              value={assetTypeFilter}
              aria-label="Asset type filter"
              onChange={(event) => setAssetTypeFilter(event.target.value)}
            >
              <option value="All">All asset types</option>
              {(
                [
                  "Endpoint",
                  "Server",
                  "Employee",
                  "Service Account",
                  "Application",
                  "Database",
                  "Network Device",
                  "Cloud Resource",
                ] as const
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Department filter</span>
            <select
              value={department}
              aria-label="Department filter"
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="All">All departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Framework filter</span>
            <select
              value={framework}
              aria-label="Framework filter"
              onChange={(event) =>
                setFramework(event.target.value as FrameworkCode | "All")
              }
            >
              <option value="All">All frameworks</option>
              {frameworks.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Status filter</span>
            <select
              value={status}
              aria-label="Status filter"
              onChange={(event) =>
                setStatus(event.target.value as ComplianceStatus | "All")
              }
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All statuses" : item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filter}>
            <span className={styles.srOnly}>Risk level filter</span>
            <select
              value={risk}
              aria-label="Risk level filter"
              onChange={(event) =>
                setRisk(event.target.value as ComplianceRiskLevel | "All")
              }
            >
              {RISK_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All risk levels" : item}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.toolbarActions}>
            <ImportMergeExcelButton onClick={() => setImportOpen(true)} />
            <ExportCurrentViewButton
              onClick={() => {
                setExportSingle(null);
                setExportOpen(true);
              }}
            />
            {canUndo ? (
              <Button
                variant="ghost"
                onClick={() => {
                  undo();
                  setHighlightOnly(false);
                  setNotice("Last import undone for this session.");
                }}
              >
                <Undo2 size={16} aria-hidden />
                Undo Last Import
              </Button>
            ) : null}
            {highlightOnly ? (
              <Button variant="ghost" onClick={() => setHighlightOnly(false)}>
                Clear import filter
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => setNotice("Table refreshed from session store.")}
            >
              <RefreshCw size={16} aria-hidden />
              Refresh
            </Button>
          </div>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Asset types">
          {ASSET_TYPE_TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`${styles.tab} ${tab === item ? styles.tabActive : ""}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <p className={styles.resultMeta}>
          Showing <strong>{filtered.length}</strong> assets
          {tab !== "All Assets" ? ` in ${tab}` : ""}
        </p>

        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Asset Name</th>
                  <th scope="col">Asset Type</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Department</th>
                  <th scope="col">Operating System</th>
                  <th scope="col">Framework</th>
                  <th scope="col">Failed Control</th>
                  <th scope="col">Compliance Status</th>
                  <th scope="col">Risk Level</th>
                  <th scope="col">Last Assessment</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className={styles.emptyCell}>
                      No assets match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((asset) => (
                    <tr
                      key={asset.id}
                      tabIndex={0}
                      className={`${styles.clickRow} ${affectedIds.includes(asset.id) ? styles.importedRow : ""}`}
                      onClick={() => openDetails(asset)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetails(asset);
                        }
                      }}
                    >
                      <td>
                        <strong className={styles.assetName}>{asset.name}</strong>
                        <div className={styles.controlCell}>
                          <span>{asset.id}</span>
                        </div>
                      </td>
                      <td>{asset.assetType}</td>
                      <td>{asset.owner}</td>
                      <td>{asset.department}</td>
                      <td>{asset.operatingSystem}</td>
                      <td>{asset.framework}</td>
                      <td>
                        {asset.failedControlId === "—" ? (
                          "—"
                        ) : (
                          <span className={styles.controlCell}>
                            <strong>{asset.failedControlId}</strong>
                            <span>{asset.failedControlName}</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          label={asset.complianceStatus}
                          tone={statusTone(asset.complianceStatus)}
                        />
                      </td>
                      <td>
                        <SeverityBadge severity={asset.riskLevel} />
                      </td>
                      <td>{asset.lastAssessment}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <AssetRowMenu
                          assetName={asset.name}
                          onAction={(action) => {
                            if (
                              action === "View Details" ||
                              action === "View Failed Controls" ||
                              action === "Open Remediation"
                            ) {
                              openDetails(asset);
                            }
                            if (action === "Export Excel") {
                              setExportSingle(asset);
                              setExportOpen(true);
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AssetComplianceDrawer
        open={Boolean(selected)}
        asset={selected}
        onClose={() => setSelectedId(null)}
      />

      <ExcelImportWizard
        open={importOpen}
        schema={complianceSchema}
        existingRecords={flatRecords}
        onClose={() => setImportOpen(false)}
        onApply={handleApplyImport}
        onViewImported={() => {
          setHighlightOnly(true);
          setNotice("Showing imported or updated asset compliance rows.");
        }}
      />

      <ExcelExportDialog
        open={exportOpen}
        moduleLabel={complianceSchema.moduleLabel}
        filenamePrefix={
          exportSingle ? `${exportSingle.id}_Asset` : complianceSchema.filenamePrefix
        }
        sheetName={complianceSchema.sheetName}
        columns={EXPORT_COLUMNS}
        rows={exportRows}
        filterSummary={exportSingle ? [] : filterSummary}
        onClose={() => {
          setExportOpen(false);
          setExportSingle(null);
        }}
      />
    </DashboardLayout>
  );
}

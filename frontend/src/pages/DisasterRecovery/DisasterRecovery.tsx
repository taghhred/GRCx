import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  ClipboardList,
  Server,
  Shield,
  Sparkles,
  Undo2,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import MetricCard from "../../components/ui/MetricCard";
import StatusBadge from "../../components/ui/StatusBadge";
import SeverityBadge from "../../components/ui/SeverityBadge";
import Button from "../../components/common/Button";
import {
  ExportCurrentViewButton,
  ImportMergeExcelButton,
} from "../../components/common/DataTransferButton";
import ExcelImportWizard from "../../components/excel/ExcelImportWizard";
import ExcelExportDialog from "../../components/excel/ExcelExportDialog";
import DrCircularProgress from "../../components/drp/DrCircularProgress";
import DrDetailDrawer from "../../components/drp/DrDetailDrawer";
import DrPercentGauge from "../../components/drp/DrPercentGauge";
import { drDashboardData } from "../../mocks/data/drpData";
import type {
  CriticalSystem,
  DrContact,
  DrDrawerContent,
  DrNotification,
  DrTest,
  SystemRecoveryStatus,
  TestResult,
} from "../../mocks/types/drp";
import {
  drBuildNew,
  drMerge,
  drToFlat,
} from "../../services/excel/adapters/drAdapters";
import { drSchema } from "../../services/excel/moduleSchemas";
import { useOperationalModuleData } from "../../services/excel/useOperationalModuleData";
import {
  getModuleRows,
  resetModuleStore,
} from "../../mocks/services/operationalDataStore";
import { fetchDrDashboard, replaceSystems } from "../../services/api/drApi";
import styles from "./DisasterRecovery.module.css";

const KPI_ICONS = {
  readiness: <Shield size={20} aria-hidden />,
  progress: <Activity size={20} aria-hidden />,
  systems: <Server size={20} aria-hidden />,
  alerts: <AlertTriangle size={20} aria-hidden />,
} as const;

const EXPORT_COLUMNS = [
  { key: "id", header: "System ID" },
  { key: "system", header: "System Name" },
  { key: "owner", header: "Owner" },
  { key: "priority", header: "Priority" },
  { key: "recoveryStatus", header: "Recovery Status" },
  { key: "recoveryTime", header: "Recovery Time" },
  { key: "rto", header: "RTO" },
  { key: "rpo", header: "RPO" },
];

function systemTone(
  status: SystemRecoveryStatus
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Operational") return "success";
  if (status === "Recovering") return "info";
  if (status === "Offline") return "danger";
  return "warning";
}

function testTone(
  result: TestResult
): "success" | "danger" | "info" | "neutral" {
  if (result === "Passed") return "success";
  if (result === "Failed") return "danger";
  return "info";
}

function availabilityTone(
  value: DrContact["availability"]
): "success" | "info" | "neutral" {
  if (value === "24/7") return "success";
  if (value === "On-call") return "info";
  return "neutral";
}

function complianceTone(
  value: "Compliant" | "Watch" | "Gap"
): "success" | "warning" | "danger" {
  if (value === "Compliant") return "success";
  if (value === "Watch") return "warning";
  return "danger";
}

function fromSystem(system: CriticalSystem): DrDrawerContent {
  return {
    id: system.id,
    kind: "system",
    title: system.system,
    subtitle: `Owner آ· ${system.owner}`,
    statusLabel: system.recoveryStatus,
    priority: system.priority,
    owner: system.owner,
    objectives: system.objectives,
    checklist: system.checklist,
    dependencies: system.dependencies,
    documents: system.documents,
    logs: system.logs,
    aiRecommendations: system.aiRecommendations,
  };
}

function fromTest(test: DrTest): DrDrawerContent {
  return {
    id: test.id,
    kind: "test",
    title: test.name,
    subtitle: test.environment,
    statusLabel: test.result,
    owner: test.owner,
    objectives: test.objectives,
    checklist: test.checklist,
    dependencies: test.dependencies,
    documents: test.documents,
    logs: test.logs,
    aiRecommendations: test.aiRecommendations,
  };
}

function fromContact(contact: DrContact): DrDrawerContent {
  return {
    id: contact.id,
    kind: "contact",
    title: contact.name,
    subtitle: `${contact.role} آ· ${contact.department}`,
    statusLabel: contact.availability,
    owner: contact.owner ?? contact.name,
    objectives: contact.objectives,
    checklist: contact.checklist ?? [],
    dependencies: contact.dependencies ?? [],
    documents: contact.documents ?? [],
    logs: contact.logs ?? [],
    aiRecommendations: contact.aiRecommendations ?? [],
  };
}

function fromNotification(item: DrNotification): DrDrawerContent {
  return {
    id: item.id,
    kind: "notification",
    title: item.title,
    subtitle: item.time,
    statusLabel: item.severity,
    priority: item.severity,
    owner: "DR Operations",
    checklist: [
      { id: "n1", label: "Acknowledged by on-call", done: false },
      { id: "n2", label: "Assigned recovery owner", done: false },
      { id: "n3", label: "Follow-up logged", done: false },
    ],
    dependencies: [],
    documents: [],
    logs: [item.detail],
    aiRecommendations: ["Triage against critical path systems first."],
  };
}

export default function DisasterRecovery() {
  const [data, setData] = useState(drDashboardData);
  const [seedSystems, setSeedSystems] = useState(drDashboardData.systems);
  const { rows, flatRecords, affectedIds, canUndo, applyImport, undo } =
    useOperationalModuleData("dr", seedSystems, drSchema, {
      toFlat: drToFlat,
      buildNew: drBuildNew,
      mergeExisting: drMerge,
    });

  useEffect(() => {
    let cancelled = false;
    void fetchDrDashboard().then((bundle) => {
      if (cancelled) return;
      setData(bundle);
      setSeedSystems(bundle.systems);
      resetModuleStore(
        "dr",
        bundle.systems
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyImport = useCallback(
    (payload: Parameters<typeof applyImport>[0]) => {
      const result = applyImport(payload);
      void replaceSystems(getModuleRows<CriticalSystem>("dr")).catch(
        () => undefined
      );
      return result;
    },
    [applyImport]
  );

  const [drawer, setDrawer] = useState<DrDrawerContent | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightOnly, setHighlightOnly] = useState(false);

  const closeDrawer = useCallback(() => setDrawer(null), []);

  const visibleSystems = useMemo(
    () =>
      highlightOnly
        ? rows.filter((item) => affectedIds.includes(item.id))
        : rows,
    [rows, highlightOnly, affectedIds]
  );

  const overallTone =
    data.currentStatus.overall === "Critical"
      ? "danger"
      : data.currentStatus.overall === "Degraded"
        ? "warning"
        : "success";

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <PageHeader
          title="Disaster Recovery"
          description="Monitor disaster recovery readiness, recovery progress, recovery plans, communication procedures, recovery testing and AI-driven recommendations."
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
          Session prototype: imported critical systems live in memory only
          and reset on refresh. Permanent storage requires backend
          integration.
        </p>

        <div className={styles.transferBar}>
          <ImportMergeExcelButton onClick={() => setImportOpen(true)} />
          <ExportCurrentViewButton onClick={() => setExportOpen(true)} />
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
        </div>

        <section className={styles.section} aria-labelledby="dr-overview">
          <h2 id="dr-overview" className={styles.sectionTitle}>
            Recovery Overview
          </h2>
          <div className={styles.kpiGrid}>
            {data.kpis.map((kpi) => (
              <div key={kpi.id} className={styles.kpiWrap}>
                <MetricCard
                  label={kpi.label}
                  value={kpi.value}
                  hint={kpi.description}
                  tone={kpi.tone}
                  icon={KPI_ICONS[kpi.id as keyof typeof KPI_ICONS]}
                />
                <StatusBadge
                  label={kpi.statusLabel}
                  tone={
                    kpi.tone === "default"
                      ? "neutral"
                      : kpi.tone === "danger"
                        ? "danger"
                        : kpi.tone === "warning"
                          ? "warning"
                          : kpi.tone === "success"
                            ? "success"
                            : "info"
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <div className={styles.heroRow}>
          <section className={styles.section} aria-labelledby="dr-status">
            <h2 id="dr-status" className={styles.sectionTitle}>
              Current Recovery Status
            </h2>
            <article className={styles.card}>
              <div className={styles.statusHead}>
                <div>
                  <p className={styles.muted}>Current Status</p>
                  <StatusBadge
                    label={data.currentStatus.overall}
                    tone={overallTone}
                  />
                </div>
                <div className={styles.statusUpdated}>
                  <p className={styles.muted}>Last Updated</p>
                  <strong>{data.currentStatus.lastUpdated}</strong>
                </div>
              </div>
              <div className={styles.statusBadges}>
                <StatusBadge
                  label={`Operational ${data.currentStatus.operational}`}
                  tone="success"
                />
                <StatusBadge
                  label={`Recovering ${data.currentStatus.recovering}`}
                  tone="info"
                />
                <StatusBadge
                  label={`Offline ${data.currentStatus.offline}`}
                  tone="danger"
                />
                <StatusBadge
                  label={`Pending ${data.currentStatus.pending}`}
                  tone="warning"
                />
              </div>
            </article>
          </section>

          <section className={styles.section} aria-labelledby="dr-progress">
            <h2 id="dr-progress" className={styles.sectionTitle}>
              Recovery Progress
            </h2>
            <article className={`${styles.card} ${styles.progressCard}`}>
              <DrCircularProgress percent={data.progress.percent} />
              <ul className={styles.progressStats}>
                <li>
                  <span>Recovered Systems</span>
                  <strong>{data.progress.recoveredSystems}</strong>
                </li>
                <li>
                  <span>Pending Systems</span>
                  <strong>{data.progress.pendingSystems}</strong>
                </li>
                <li>
                  <span>Estimated Remaining Time</span>
                  <strong>{data.progress.estimatedRemaining}</strong>
                </li>
                <li>
                  <span>Recovery Completed</span>
                  <strong>{data.progress.percent}%</strong>
                </li>
              </ul>
            </article>
          </section>
        </div>

        <section className={styles.section} aria-labelledby="dr-alerts">
          <h2 id="dr-alerts" className={styles.sectionTitle}>
            Active Recovery Notifications
          </h2>
          <div className={styles.notifyList}>
            {data.notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.notifyItem}
                onClick={() => setDrawer(fromNotification(item))}
              >
                <Bell size={18} aria-hidden />
                <div className={styles.notifyBody}>
                  <div className={styles.notifyTitleRow}>
                    <strong>{item.title}</strong>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p>{item.detail}</p>
                  <span className={styles.muted}>{item.time}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="dr-strategy">
          <h2 id="dr-strategy" className={styles.sectionTitle}>
            Recovery Strategy
          </h2>
          <div className={styles.strategyGrid}>
            {data.strategy.map((phase) => (
              <article key={phase.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <h3>{phase.title}</h3>
                  <ClipboardList size={18} aria-hidden />
                </div>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-valuenow={phase.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${phase.title} ${phase.progress}%`}
                >
                  <span
                    className={styles.progressFill}
                    style={{ width: `${phase.progress}%` }}
                  />
                </div>
                <p className={styles.phasePct}>{phase.progress}% complete</p>
                <ul className={styles.checklist}>
                  {phase.items.map((item) => (
                    <li
                      key={item.id}
                      className={item.done ? styles.done : undefined}
                    >
                      <span
                        className={item.done ? styles.checkOn : styles.checkOff}
                        aria-hidden
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="dr-comms">
          <div className={styles.sectionHead}>
            <h2 id="dr-comms" className={styles.sectionTitle}>
              Recovery Communication Directory
            </h2>
            <p className={styles.sectionHint}>
              Select a contact to open recovery responsibilities.
            </p>
          </div>
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Name</th>
                    <th scope="col">Department</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Email</th>
                    <th scope="col">Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      tabIndex={0}
                      className={styles.clickRow}
                      onClick={() => setDrawer(fromContact(contact))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDrawer(fromContact(contact));
                        }
                      }}
                    >
                      <td>
                        <strong>{contact.role}</strong>
                      </td>
                      <td>{contact.name}</td>
                      <td>{contact.department}</td>
                      <td>{contact.phone}</td>
                      <td>{contact.email}</td>
                      <td>
                        <StatusBadge
                          label={contact.availability}
                          tone={availabilityTone(contact.availability)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className={styles.twoCol}>
          <section className={styles.section} aria-labelledby="dr-timeline">
            <h2 id="dr-timeline" className={styles.sectionTitle}>
              Recovery Timeline
            </h2>
            <ol className={styles.timeline}>
              {data.timeline.map((event, index) => (
                <li key={event.id} className={styles.timelineItem}>
                  <span
                    className={`${styles.dot} ${event.complete ? styles.dotDone : styles.dotPending}`}
                    aria-hidden
                  />
                  {index < data.timeline.length - 1 ? (
                    <span className={styles.line} aria-hidden />
                  ) : null}
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineHead}>
                      <h3>{event.title}</h3>
                      <time>{event.time}</time>
                    </div>
                    <p>{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.section} aria-labelledby="dr-objectives">
            <h2 id="dr-objectives" className={styles.sectionTitle}>
              Recovery Objectives
            </h2>
            <div className={styles.objectiveStack}>
              {data.objectives.map((obj) => (
                <article key={obj.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <h3>{obj.label}</h3>
                    <StatusBadge
                      label={obj.compliance}
                      tone={complianceTone(obj.compliance)}
                    />
                  </div>
                  <p className={styles.metric}>{obj.value}</p>
                  <p className={styles.hint}>{obj.hint}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className={styles.section} aria-labelledby="dr-tests">
          <div className={styles.sectionHead}>
            <h2 id="dr-tests" className={styles.sectionTitle}>
              Disaster Recovery Testing
            </h2>
            <p className={styles.sectionHint}>
              Click a test for checklist, evidence, and recommendations.
            </p>
          </div>
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Test Name</th>
                    <th scope="col">Environment</th>
                    <th scope="col">Last Test</th>
                    <th scope="col">Next Test</th>
                    <th scope="col">Result</th>
                    <th scope="col">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tests.map((test) => (
                    <tr
                      key={test.id}
                      tabIndex={0}
                      className={styles.clickRow}
                      onClick={() => setDrawer(fromTest(test))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDrawer(fromTest(test));
                        }
                      }}
                    >
                      <td>
                        <strong>{test.name}</strong>
                      </td>
                      <td>{test.environment}</td>
                      <td>{test.lastTest}</td>
                      <td>{test.nextTest}</td>
                      <td>
                        <StatusBadge
                          label={test.result}
                          tone={testTone(test.result)}
                        />
                      </td>
                      <td>{test.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="dr-systems">
          <div className={styles.sectionHead}>
            <h2 id="dr-systems" className={styles.sectionTitle}>
              Critical Systems
            </h2>
            <p className={styles.sectionHint}>
              Open a system for recovery detail without leaving this page.
            </p>
          </div>
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">System</th>
                    <th scope="col">Owner</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Recovery Status</th>
                    <th scope="col">Recovery Time</th>
                    <th scope="col">Dependencies</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSystems.map((system) => (
                    <tr
                      key={system.id}
                      tabIndex={0}
                      className={`${styles.clickRow} ${affectedIds.includes(system.id) ? styles.importedRow : ""}`}
                      onClick={() => setDrawer(fromSystem(system))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDrawer(fromSystem(system));
                        }
                      }}
                    >
                      <td>
                        <strong>{system.system}</strong>
                      </td>
                      <td>{system.owner}</td>
                      <td>
                        <SeverityBadge severity={system.priority} />
                      </td>
                      <td>
                        <StatusBadge
                          label={system.recoveryStatus}
                          tone={systemTone(system.recoveryStatus)}
                        />
                      </td>
                      <td>{system.recoveryTime}</td>
                      <td>{system.dependencies.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="dr-ai">
          <div className={styles.sectionHead}>
            <h2 id="dr-ai" className={styles.sectionTitle}>
              AI Recovery Insights
            </h2>
            <p className={styles.sectionHint}>
              Mock insights only â€” no AI backend connected.
            </p>
          </div>
          <div className={styles.aiGrid}>
            {data.insights.map((insight) => (
              <article key={insight.id} className={styles.aiCard}>
                <Sparkles size={18} aria-hidden />
                <h3>{insight.title}</h3>
                <p>{insight.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="dr-scores">
          <h2 id="dr-scores" className={styles.sectionTitle}>
            Recovery Readiness Score
          </h2>
          <div className={styles.scorePanel}>
            {data.readinessScores.map((score) => (
              <DrPercentGauge
                key={score.id}
                label={score.label}
                value={score.value}
                tone={score.tone}
              />
            ))}
          </div>
        </section>
      </div>

      <DrDetailDrawer
        open={Boolean(drawer)}
        content={drawer}
        onClose={closeDrawer}
      />

      <ExcelImportWizard
        open={importOpen}
        schema={drSchema}
        existingRecords={flatRecords}
        onClose={() => setImportOpen(false)}
        onApply={handleApplyImport}
        onViewImported={() => {
          setHighlightOnly(true);
          setNotice("Showing imported or updated critical systems.");
        }}
      />

      <ExcelExportDialog
        open={exportOpen}
        moduleLabel={drSchema.moduleLabel}
        filenamePrefix={drSchema.filenamePrefix}
        sheetName={drSchema.sheetName}
        columns={EXPORT_COLUMNS}
        rows={rows.map((row) => drToFlat(row))}
        filterSummary={[]}
        onClose={() => setExportOpen(false)}
      />
    </DashboardLayout>
  );
}


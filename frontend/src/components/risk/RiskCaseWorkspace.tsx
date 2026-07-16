import { useEffect, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import type { RiskCase, RiskActivityEntry } from "../../mocks/types/risk";
import Button from "../common/Button";
import { ExportExcelButton } from "../common/DataTransferButton";
import StatusBadge from "../ui/StatusBadge";
import SeverityBadge from "../ui/SeverityBadge";
import RiskMatrix from "./RiskMatrix";
import CollaborateDialog from "../collaboration/CollaborateDialog";
import CollaboratorChips from "../collaboration/CollaboratorChips";
import CollaborationManagerPanel from "../collaboration/CollaborationManagerPanel";
import {
  CURRENT_USER,
  canCollaboratorPerform,
  getCollaboratorsForCase,
  getManagerStatsForCase,
  getSharedWithMeCaseIds,
  subscribeCollaboration,
} from "../../mocks/services/collaborationService";
import styles from "./RiskCaseWorkspace.module.css";

const TABS = [
  "Overview",
  "Risk Assessment",
  "Evidence",
  "Controls",
  "Remediation",
  "Activity Log",
] as const;

type CaseTab = (typeof TABS)[number];

interface RiskCaseWorkspaceProps {
  riskCase: RiskCase;
  onBack: () => void;
  onNotice: (message: string) => void;
  onExportExcel: () => void;
  onTimelineAppend?: (entries: RiskActivityEntry[]) => void;
}

function statusTone(
  status: RiskCase["status"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Closed" || status === "Accepted") return "success";
  if (status === "Remediation in Progress") return "warning";
  if (status === "Under Assessment") return "info";
  if (status === "Archived") return "neutral";
  return "danger";
}

function verifyTone(
  status: RiskCase["evidence"][number]["verificationStatus"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Verified") return "success";
  if (status === "Pending") return "warning";
  if (status === "Rejected") return "danger";
  return "neutral";
}

export default function RiskCaseWorkspace({
  riskCase,
  onBack,
  onNotice,
  onExportExcel,
  onTimelineAppend,
}: RiskCaseWorkspaceProps) {
  const [tab, setTab] = useState<CaseTab>("Overview");
  const [collaborateOpen, setCollaborateOpen] = useState(false);
  const [collaborateKey, setCollaborateKey] = useState(0);
  const [collaborators, setCollaborators] = useState(() =>
    getCollaboratorsForCase(riskCase.caseId)
  );
  const [managerStats, setManagerStats] = useState(() =>
    getManagerStatsForCase(riskCase.caseId, riskCase.owner)
  );
  const a = riskCase.assessment;

  useEffect(() => {
    const refresh = () => {
      setCollaborators(getCollaboratorsForCase(riskCase.caseId));
      setManagerStats(getManagerStatsForCase(riskCase.caseId, riskCase.owner));
    };
    refresh();
    return subscribeCollaboration(refresh);
  }, [riskCase.caseId, riskCase.owner]);

  const isOwner = riskCase.owner === CURRENT_USER.name;
  const isCollaborator = getSharedWithMeCaseIds().includes(riskCase.caseId);
  const canClose = canCollaboratorPerform("closeCase", {
    isOwner,
    isCollaborator,
    isManager: CURRENT_USER.isManager,
  });
  const canReassign = canCollaboratorPerform("reassignOwnership", {
    isOwner,
    isCollaborator,
    isManager: CURRENT_USER.isManager,
  });

  const caseLabel =
    riskCase.relatedGrcCase && riskCase.relatedGrcCase !== "—"
      ? riskCase.relatedGrcCase
      : riskCase.caseId;

  return (
    <div className={styles.workspace}>
      <div className={styles.topBar}>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden />
          Back to Risk Cases
        </Button>
      </div>

      <header className={styles.caseHeader}>
        <div>
          <p className={styles.caseId}>{riskCase.caseId}</p>
          <h2 className={styles.title}>{riskCase.title}</h2>
          <div className={styles.metaRow}>
            <StatusBadge
              label={riskCase.status}
              tone={statusTone(riskCase.status)}
            />
            <span>Department: {riskCase.department}</span>
            <span>Updated: {riskCase.lastUpdated}</span>
            {isCollaborator && !isOwner ? (
              <StatusBadge label="Collaborator access" tone="info" />
            ) : null}
          </div>
          <CollaboratorChips
            ownerName={riskCase.owner}
            collaborators={collaborators}
          />
        </div>

        <div className={styles.primaryActions}>
          <Button
            variant="primary"
            onClick={() => {
              setCollaborateKey((value) => value + 1);
              setCollaborateOpen(true);
            }}
          >
            <Users size={16} aria-hidden />
            Collaborate
          </Button>
          <Button
            variant="secondary"
            onClick={() => onNotice("Edit Case — UI placeholder.")}
          >
            Edit Case
          </Button>
          <Button
            variant="secondary"
            disabled={!canReassign}
            onClick={() =>
              onNotice(
                canReassign
                  ? "Assign Owner — UI placeholder. Ownership stays with the primary owner until reassigned by owner/manager."
                  : "Collaborators cannot change ownership."
              )
            }
          >
            Assign Owner
          </Button>
          <Button
            variant="secondary"
            onClick={() => onNotice("Add Evidence — UI placeholder.")}
          >
            Add Evidence
          </Button>
          <Button
            variant="secondary"
            onClick={() => onNotice("Add Control — UI placeholder.")}
          >
            Add Control
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setTab("Risk Assessment");
              onNotice("Update Risk Assessment — switch to assessment tab.");
            }}
          >
            Update Risk Assessment
          </Button>
          <Button
            variant="secondary"
            disabled={!canClose}
            onClick={() =>
              onNotice(
                canClose
                  ? "Close Case — UI placeholder."
                  : "Only the primary owner or manager can close the case."
              )
            }
          >
            Close Case
          </Button>

          <ExportExcelButton onClick={onExportExcel} />
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Case detail tabs">
        {TABS.map((item) => (
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

      <div className={styles.panel} role="tabpanel">
        {tab === "Overview" ? (
          <div className={styles.overviewGrid}>
            <section className={styles.section}>
              <h3>Risk Description</h3>
              <p>{riskCase.description}</p>
            </section>
            <dl className={styles.dl}>
              {(
                [
                  ["Risk Category", riskCase.category],
                  ["Affected Asset", riskCase.affectedAsset],
                  ["Department", riskCase.department],
                  ["Risk Owner", riskCase.owner],
                  ["Source", riskCase.source],
                  ["Related Violation", riskCase.relatedViolation],
                  ["Related Incident", riskCase.relatedIncident],
                  ["Related GRC Case", riskCase.relatedGrcCase],
                  ["Business Impact", riskCase.businessImpact],
                  ["Threat Scenario", riskCase.threatScenario],
                  ["Vulnerability", riskCase.vulnerability],
                  ["Current Status", riskCase.status],
                  ["Created Date", riskCase.createdDate],
                  ["Due Date", riskCase.dueDate],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <section className={styles.section}>
              <h3>Collaborator permissions</h3>
              <p>
                Collaborators may view the case, add comments, upload evidence,
                suggest controls, suggest remediation, and add risk notes. They
                cannot change ownership, close or approve the case, delete
                evidence, or reassign ownership.
              </p>
            </section>
            {CURRENT_USER.isManager ? (
              <CollaborationManagerPanel stats={managerStats} />
            ) : null}
          </div>
        ) : null}

        {tab === "Risk Assessment" ? (
          <div className={styles.assessmentLayout}>
            <section className={styles.section}>
              <h3>Risk calculation</h3>
              <div className={styles.scoreGrid}>
                <div>
                  <span>Likelihood</span>
                  <strong>
                    {a.likelihood} out of 5
                  </strong>
                </div>
                <div>
                  <span>Impact</span>
                  <strong>{a.impact} out of 5</strong>
                </div>
                <div>
                  <span>Inherent Risk Score</span>
                  <strong>
                    {a.inherentScore} out of 25
                  </strong>
                  <SeverityBadge severity={a.inherentLevel} />
                </div>
                <div>
                  <span>Control Effectiveness</span>
                  <strong>{a.controlEffectivenessPercent}%</strong>
                </div>
                <div>
                  <span>Residual Likelihood</span>
                  <strong>
                    {a.residualLikelihood} out of 5
                  </strong>
                </div>
                <div>
                  <span>Residual Impact</span>
                  <strong>
                    {a.residualImpact} out of 5
                  </strong>
                </div>
                <div>
                  <span>Residual Risk Score</span>
                  <strong>
                    {a.residualScore} out of 25
                  </strong>
                  <SeverityBadge severity={a.residualLevel} />
                </div>
                <div>
                  <span>Risk Level</span>
                  <strong>{a.residualLevel}</strong>
                </div>
                <div>
                  <span>Risk Treatment Decision</span>
                  <strong>{a.treatmentDecision}</strong>
                </div>
                <div>
                  <span>Risk Acceptance Status</span>
                  <strong>{a.acceptanceStatus}</strong>
                </div>
              </div>

              <div className={styles.formula}>
                <p>
                  <strong>Inherent Risk</strong> = Likelihood × Impact
                </p>
                <p>
                  <strong>Residual Risk</strong> = Residual Likelihood × Residual
                  Impact
                </p>
                <p className={styles.note}>{a.methodologyNote}</p>
              </div>
            </section>

            <section className={styles.section}>
              <h3>5×5 Risk Matrix</h3>
              <RiskMatrix
                inherentLikelihood={a.likelihood}
                inherentImpact={a.impact}
                residualLikelihood={a.residualLikelihood}
                residualImpact={a.residualImpact}
                inherentLevel={a.inherentLevel}
                residualLevel={a.residualLevel}
                inherentScore={a.inherentScore}
                residualScore={a.residualScore}
              />
            </section>
          </div>
        ) : null}

        {tab === "Evidence" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Evidence ID</th>
                  <th>Evidence Name</th>
                  <th>Evidence Type</th>
                  <th>Related Control</th>
                  <th>Uploaded By</th>
                  <th>Upload Date</th>
                  <th>Verification Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {riskCase.evidence.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td>{item.relatedControl}</td>
                    <td>{item.uploadedBy}</td>
                    <td>{item.uploadDate}</td>
                    <td>
                      <StatusBadge
                        label={item.verificationStatus}
                        tone={verifyTone(item.verificationStatus)}
                      />
                    </td>
                    <td>
                      <div className={styles.inlineActions}>
                        {(
                          [
                            "Preview",
                            "Download placeholder",
                            "Verify",
                            "Replace",
                            "Remove",
                          ] as const
                        ).map((action) => (
                          <button
                            key={action}
                            type="button"
                            className={styles.linkBtn}
                            onClick={() =>
                              onNotice(`${action} — UI placeholder for ${item.id}.`)
                            }
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "Controls" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Control ID</th>
                  <th>Framework</th>
                  <th>Control Name</th>
                  <th>Implementation Status</th>
                  <th>Effectiveness</th>
                  <th>Owner</th>
                  <th>Last Tested</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {riskCase.controls.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.framework}</td>
                    <td>{item.name}</td>
                    <td>{item.implementationStatus}</td>
                    <td>{item.effectiveness}</td>
                    <td>{item.owner}</td>
                    <td>{item.lastTested}</td>
                    <td>
                      <StatusBadge
                        label={item.result}
                        tone={
                          item.result === "Pass"
                            ? "success"
                            : item.result === "Fail"
                              ? "danger"
                              : item.result === "Partial"
                                ? "warning"
                                : "neutral"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "Remediation" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Action</th>
                  <th>Owner</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {riskCase.remediation.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.action}</td>
                    <td>{item.owner}</td>
                    <td>{item.dueDate}</td>
                    <td>{item.status}</td>
                    <td>
                      <SeverityBadge severity={item.priority} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "Activity Log" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {riskCase.activityLog.map((item) => (
                  <tr key={item.id}>
                    <td>{item.timestamp}</td>
                    <td>{item.actor}</td>
                    <td>{item.action}</td>
                    <td>{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <CollaborateDialog
        key={collaborateKey}
        open={collaborateOpen}
        caseId={riskCase.caseId}
        caseLabel={caseLabel}
        caseTitle={riskCase.title}
        ownerName={riskCase.owner}
        onClose={() => setCollaborateOpen(false)}
        onSubmitted={(timelineDetails) => {
          const entries: RiskActivityEntry[] = timelineDetails.map(
            (detail, index) => ({
              id: `ACT-COLLAB-${Date.now()}-${index}`,
              timestamp: "2026-07-14 10:15",
              actor: CURRENT_USER.name,
              action: "Collaboration request",
              details: detail,
            })
          );
          onTimelineAppend?.(entries);
          onNotice(
            `Collaboration request sent. Ownership remains with ${riskCase.owner}.`
          );
          setTab("Activity Log");
        }}
      />
    </div>
  );
}

import type {
  CaseCollaborator,
  CollaborationNotification,
  CollaborationRequest,
  CollaborationRequestStatus,
  CollaborationType,
  CollaborationManagerStats,
} from "../types/collaboration";
import {
  GRC_ANALYSTS,
  initialsFromName,
  shortName,
} from "../data/analysts";
import { CURRENT_USER } from "../../auth/syncPrototypeUser";

export { CURRENT_USER };

type Listener = () => void;

let requests: CollaborationRequest[] = [
  {
    id: "collab-req-001",
    caseId: "RISK-002",
    caseLabel: "GRC-2210",
    caseTitle: "Unencrypted Customer Database",
    ownerName: "Sara",
    requesterName: "Sara",
    collaboratorIds: ["anl-mohammed"],
    collaboratorNames: ["Mohammed"],
    type: "Request Risk Assessment",
    message: "Need second opinion on residual scoring after TDE enablement plan.",
    status: "Pending",
    createdAt: "2026-07-14 09:40",
  },
  {
    id: "collab-req-002",
    caseId: "RISK-001",
    caseLabel: "GRC-2204",
    caseTitle: "Excessive Privileged Access",
    ownerName: "Mohammed",
    requesterName: "Mohammed",
    collaboratorIds: ["anl-sara", "anl-ahmed"],
    collaboratorNames: ["Sara", "Ahmed"],
    type: "Request Compliance Mapping",
    message: "Please map ECC privileged-access controls and attach recent evidence.",
    status: "Accepted",
    createdAt: "2026-07-14 10:15",
    respondedAt: "2026-07-14 10:17",
    responseMinutes: 2,
  },
  {
    id: "collab-req-003",
    caseId: "RISK-003",
    caseLabel: "GRC-2188",
    caseTitle: "Disaster Recovery Test Overdue",
    ownerName: "Ahmed",
    requesterName: "Ahmed",
    collaboratorIds: ["anl-mohammed"],
    collaboratorNames: ["Mohammed"],
    type: "Request Validation",
    message: "Validate DR evidence pack language before audit week.",
    status: "Completed",
    createdAt: "2026-07-10 11:00",
    respondedAt: "2026-07-10 11:25",
    responseMinutes: 25,
  },
];

let notifications: CollaborationNotification[] = [
  {
    id: "ntf-001",
    title: "Collaboration Request",
    body: "Sara has requested your assistance on Case GRC-2210.",
    caseId: "RISK-002",
    requestId: "collab-req-001",
    createdAt: "2026-07-14 09:40",
    read: false,
    dismissed: false,
  },
];

const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeCollaboration(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function listInviteableAnalysts(ownerName: string) {
  return GRC_ANALYSTS.filter((analyst) => analyst.name !== ownerName);
}

export function getMyCollaborationRequests(
  status?: CollaborationRequestStatus | "All"
): CollaborationRequest[] {
  return requests.filter((item) => {
    const mine = item.requesterName === CURRENT_USER.name;
    if (!mine) return false;
    if (!status || status === "All") return true;
    return item.status === status;
  });
}

export function getSharedWithMeCaseIds(): string[] {
  return Array.from(
    new Set(
      requests
        .filter((item) => item.collaboratorIds.includes(CURRENT_USER.id))
        .map((item) => item.caseId)
    )
  );
}

export function getCollaboratorsForCase(caseId: string): CaseCollaborator[] {
  const related = requests.filter(
    (item) =>
      item.caseId === caseId &&
      (item.status === "Accepted" || item.status === "Pending")
  );
  const map = new Map<string, CaseCollaborator>();
  for (const request of related) {
    request.collaboratorIds.forEach((id, index) => {
      const name = request.collaboratorNames[index] ?? id;
      map.set(id, {
        analystId: id,
        name,
        initials: initialsFromName(name),
        joinedAt: request.respondedAt ?? request.createdAt,
        status: request.status,
      });
    });
  }
  return Array.from(map.values());
}

export function getManagerStatsForCase(
  caseId: string,
  fallbackOwner = "—"
): CollaborationManagerStats {
  const history = requests.filter((item) => item.caseId === caseId);
  const owner = history[0]?.ownerName ?? fallbackOwner;
  const collaborators = Array.from(
    new Set(history.flatMap((item) => item.collaboratorNames))
  );
  const responded = history.filter(
    (item) => typeof item.responseMinutes === "number"
  );
  const avg =
    responded.length === 0
      ? null
      : Math.round(
          responded.reduce((sum, item) => sum + (item.responseMinutes ?? 0), 0) /
            responded.length
        );
  return {
    owner,
    collaborators,
    requestCount: history.length,
    avgResponseMinutes: avg,
    history,
  };
}

export function getActiveNotifications(): CollaborationNotification[] {
  return notifications.filter((item) => !item.dismissed);
}

export function getUnreadNotificationCount(): number {
  return notifications.filter((item) => !item.dismissed && !item.read).length;
}

export function dismissNotification(id: string): void {
  notifications = notifications.map((item) =>
    item.id === id ? { ...item, dismissed: true, read: true } : item
  );
  emit();
}

export function markNotificationRead(id: string): void {
  notifications = notifications.map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  emit();
}

export function acceptCollaborationRequest(requestId: string): void {
  const now = "2026-07-14 10:17";
  requests = requests.map((item) => {
    if (item.id !== requestId) return item;
    return {
      ...item,
      status: "Accepted",
      respondedAt: now,
      responseMinutes: 2,
    };
  });
  emit();
}

export interface CreateCollaborationInput {
  caseId: string;
  caseLabel: string;
  caseTitle: string;
  ownerName: string;
  collaboratorIds: string[];
  type: CollaborationType;
  message: string;
}

export function createCollaborationRequest(input: CreateCollaborationInput): {
  request: CollaborationRequest;
  timelineDetails: string[];
} {
  const selected = GRC_ANALYSTS.filter((analyst) =>
    input.collaboratorIds.includes(analyst.id)
  );
  const id = `collab-req-${Date.now()}`;
  const createdAt = "2026-07-14 10:15";
  const request: CollaborationRequest = {
    id,
    caseId: input.caseId,
    caseLabel: input.caseLabel,
    caseTitle: input.caseTitle,
    ownerName: input.ownerName,
    requesterName: CURRENT_USER.name,
    collaboratorIds: selected.map((item) => item.id),
    collaboratorNames: selected.map((item) => item.name),
    type: input.type,
    message: input.message.trim(),
    status: "Pending",
    createdAt,
  };
  requests = [request, ...requests];

  // Prototype: surface the canonical notification copy in the in-app bell.
  const notice: CollaborationNotification = {
    id: `ntf-${Date.now()}`,
    title: "Collaboration Request",
    body: `${CURRENT_USER.shortName} has requested your assistance on Case ${input.caseLabel}.`,
    caseId: input.caseId,
    requestId: id,
    createdAt,
    read: false,
    dismissed: false,
  };
  notifications = [notice, ...notifications];

  const typeLabel = input.type.replace(/^Request\s+/i, "").toLowerCase();
  const timelineDetails = selected.map(
    (analyst) =>
      `${CURRENT_USER.shortName} requested ${typeLabel} from ${shortName(analyst.name)}.`
  );

  emit();
  return { request, timelineDetails };
}

/** Share a SOAR Queue case with one or more specialists (in-app notifications). */
export function shareGrcCase(input: {
  caseId: string;
  caseTitle: string;
  ownerName: string;
  collaboratorIds: string[];
  message?: string;
}): { collaboratorNames: string[] } {
  const selected = GRC_ANALYSTS.filter((analyst) =>
    input.collaboratorIds.includes(analyst.id)
  );
  const createdAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  const id = `collab-share-${Date.now()}`;

  const request: CollaborationRequest = {
    id,
    caseId: input.caseId,
    caseLabel: input.caseId,
    caseTitle: input.caseTitle,
    ownerName: input.ownerName,
    requesterName: CURRENT_USER.name,
    collaboratorIds: selected.map((item) => item.id),
    collaboratorNames: selected.map((item) => item.name),
    type: "General Assistance",
    message:
      input.message?.trim() ||
      `${CURRENT_USER.shortName} shared case ${input.caseId} for collaborative access.`,
    status: "Accepted",
    createdAt,
    respondedAt: createdAt,
    responseMinutes: 0,
  };
  requests = [request, ...requests];

  const notices: CollaborationNotification[] = selected.map((_analyst, index) => ({
    id: `ntf-share-${Date.now()}-${index}`,
    title: "Case Shared With You",
    body: `${CURRENT_USER.shortName} shared GRC case ${input.caseId} with you.`,
    caseId: input.caseId,
    requestId: id,
    createdAt,
    read: false,
    dismissed: false,
  }));
  notifications = [...notices, ...notifications];
  emit();
  return { collaboratorNames: selected.map((s) => s.name) };
}

export function canCollaboratorPerform(
  action:
    | "view"
    | "comment"
    | "uploadEvidence"
    | "suggestControls"
    | "suggestRemediation"
    | "addRiskNotes"
    | "changeOwnership"
    | "closeCase"
    | "approveCase"
    | "deleteEvidence"
    | "reassignOwnership",
  options: { isOwner: boolean; isCollaborator: boolean; isManager?: boolean }
): boolean {
  const ownerOnly = new Set([
    "changeOwnership",
    "closeCase",
    "approveCase",
    "deleteEvidence",
    "reassignOwnership",
  ]);
  if (ownerOnly.has(action)) {
    return options.isOwner || Boolean(options.isManager);
  }
  if (options.isOwner || options.isManager) return true;
  return options.isCollaborator;
}

export type { CollaborationType };

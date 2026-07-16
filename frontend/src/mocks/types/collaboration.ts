export type CollaborationType =
  | "Request Review"
  | "Request Evidence"
  | "Request Compliance Mapping"
  | "Request Risk Assessment"
  | "Request Validation"
  | "General Assistance";

export type CollaborationRequestStatus = "Pending" | "Accepted" | "Completed";

export type CollaboratorPermission =
  | "view"
  | "comment"
  | "uploadEvidence"
  | "suggestControls"
  | "suggestRemediation"
  | "addRiskNotes";

export const COLLABORATOR_PERMISSIONS: CollaboratorPermission[] = [
  "view",
  "comment",
  "uploadEvidence",
  "suggestControls",
  "suggestRemediation",
  "addRiskNotes",
];

export const OWNER_ONLY_ACTIONS = [
  "changeOwnership",
  "closeCase",
  "approveCase",
  "deleteEvidence",
  "reassignOwnership",
] as const;

export interface GrcAnalyst {
  id: string;
  name: string;
  role: string;
  department: string;
  initials: string;
}

export interface CaseCollaborator {
  analystId: string;
  name: string;
  initials: string;
  joinedAt: string;
  status: CollaborationRequestStatus;
}

export interface CollaborationRequest {
  id: string;
  caseId: string;
  caseLabel: string;
  caseTitle: string;
  ownerName: string;
  requesterName: string;
  collaboratorIds: string[];
  collaboratorNames: string[];
  type: CollaborationType;
  message: string;
  status: CollaborationRequestStatus;
  createdAt: string;
  respondedAt?: string;
  responseMinutes?: number;
}

export interface CollaborationNotification {
  id: string;
  title: string;
  body: string;
  caseId: string;
  requestId: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
}

export interface CollaborationManagerStats {
  owner: string;
  collaborators: string[];
  requestCount: number;
  avgResponseMinutes: number | null;
  history: CollaborationRequest[];
}

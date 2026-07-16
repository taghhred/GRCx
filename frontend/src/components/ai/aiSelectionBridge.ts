/**
 * Cross-page AI selection bridge (session memory).
 * Modules publish focused entity context; the floating advisor consumes it.
 * Not persisted to localStorage.
 */

export interface AiSelectionPayload {
  selectedCaseId?: string;
  selectedAssetId?: string;
  selectedRiskId?: string;
  selectedFramework?: string;
  assignedAuditor?: string;
  dateRangeLabel?: string;
  entityTitle?: string;
}

type Listener = () => void;

let selection: AiSelectionPayload = {};
const listeners = new Set<Listener>();

export function getAiSelection(): AiSelectionPayload {
  return selection;
}

export function setAiSelection(next: AiSelectionPayload | null): void {
  selection = next ? { ...next } : {};
  listeners.forEach((listener) => listener());
}

export function clearAiSelection(): void {
  setAiSelection(null);
}

export function subscribeAiSelection(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

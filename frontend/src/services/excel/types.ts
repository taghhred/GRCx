/**
 * Shared Excel import/export contracts for operational modules.
 * All cell content is treated as untrusted display text — never evaluated.
 */

export type OperationalModuleId =
  | "identity"
  | "grc-cases"
  | "risk"
  | "compliance"
  | "bcm"
  | "dr"
  | "governance-policies"
  | "governance-kpis";

export type ImportMode =
  | "append"
  | "update"
  | "append-update"
  | "skip-duplicates";

export type ConflictChoice = "keep" | "imported";

export type RowValidationStatus =
  | "valid"
  | "duplicate-file"
  | "duplicate-existing"
  | "warning"
  | "error"
  | "empty";

export type ProposedAction =
  | "Add"
  | "Update"
  | "Skip"
  | "Reject"
  | "Conflict";

export interface SchemaField {
  key: string;
  header: string;
  required?: boolean;
  unique?: boolean;
  type?: "string" | "number" | "date" | "enum";
  enumValues?: readonly string[];
  maxLength?: number;
  aliases?: string[];
}

export interface ModuleImportSchema {
  moduleId: OperationalModuleId;
  moduleLabel: string;
  uniqueKey: string;
  displayNameKey: string;
  filenamePrefix: string;
  sheetName: string;
  fields: SchemaField[];
  instructions: string[];
}

export interface ParsedWorkbookMeta {
  filename: string;
  sizeBytes: number;
  sizeLabel: string;
  lastModifiedLabel: string;
  sheetNames: string[];
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  /** 1-based spreadsheet row numbers aligned with rows */
  rowNumbers: number[];
  rows: Array<Record<string, string>>;
}

export interface ColumnMapping {
  excelHeader: string;
  fieldKey: string | null;
}

export interface ValidatedImportRow {
  rowNumber: number;
  uniqueId: string;
  recordName: string;
  status: RowValidationStatus;
  messages: string[];
  proposedAction: ProposedAction;
  values: Record<string, string>;
  conflicts?: Array<{
    fieldKey: string;
    fieldLabel: string;
    current: string;
    imported: string;
  }>;
}

export interface ImportPreviewSummary {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  warningRows: number;
  errorRows: number;
  eligibleRows: number;
}

export interface ConflictDecision {
  rowUniqueId: string;
  fieldKey: string;
  choice: ConflictChoice;
}

export interface ImportApplyResult {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  affectedIds: string[];
  timestamp: string;
  importedBy: string;
  filename: string;
  moduleId: OperationalModuleId;
  moduleLabel: string;
  importMode: ImportMode;
  sheetName: string;
}

export interface ImportAuditEntry {
  id: string;
  timestamp: string;
  moduleId: OperationalModuleId;
  moduleLabel: string;
  filename: string;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  actingUser: string;
}

/** Security limits for local workbook processing */
export const EXCEL_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxSheets: 20,
  maxRows: 5_000,
  maxColumns: 40,
  maxCellLength: 2_000,
} as const;

export const ALLOWED_EXCEL_EXTENSIONS = [".xlsx", ".xls"] as const;

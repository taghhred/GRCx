/** Public Excel I/O surface for operational modules (Reports excluded — PDF only). */
export type * from "./types";
export { getModuleSchema, MODULE_SCHEMAS } from "./moduleSchemas";
export {
  readWorkbookFile,
  parseWorksheet,
  ExcelReadError,
} from "./excelWorkbookReader";
export {
  buildAutoMappings,
  mappingComplete,
  validateImportRows,
  resolveConflictActions,
  summarizeApplyPlan,
} from "./excelImportService";
export {
  downloadExcelTemplate,
  downloadValidationErrorFile,
} from "./excelTemplateService";
export { importAuditService, PROTOTYPE_ACTING_USER } from "./importAuditService";
export { useOperationalModuleData } from "./useOperationalModuleData";

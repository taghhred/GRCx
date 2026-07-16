import * as XLSX from "xlsx";
import type { ModuleImportSchema } from "./types";
import { excelFilename } from "../excelExportService";

function exampleValue(field: ModuleImportSchema["fields"][number]): string {
  if (field.key.includes("id") || field.key === "caseId") return "SAMPLE-001";
  if (field.type === "enum" && field.enumValues?.length) {
    return field.enumValues[0];
  }
  if (field.type === "date") return "2026-07-15";
  if (field.key === "email") return "sample.user@example.com";
  if (field.header.toLowerCase().includes("name")) return "Sample Name";
  return "Sample";
}

/** Generates a module-specific .xlsx template (data + Instructions). */
export function downloadExcelTemplate(schema: ModuleImportSchema): void {
  const headers = schema.fields.map((f) => f.header);
  const example = schema.fields.map((f) => exampleValue(f));

  const dataSheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const instructions = [
    ["GRCx Excel Import Template"],
    ["Module", schema.moduleLabel],
    ["Unique identifier", schema.fields.find((f) => f.key === schema.uniqueKey)?.header ?? schema.uniqueKey],
    [],
    ["Required columns"],
    ...schema.fields.filter((f) => f.required).map((f) => [f.header, "Required"]),
    [],
    ["Optional columns"],
    ...schema.fields.filter((f) => !f.required).map((f) => [f.header, "Optional"]),
    [],
    ["Guidance"],
    ...schema.instructions.map((line) => [line]),
    [],
    [
      "Prototype note",
      "Imported files are processed locally. Server-side validation, authorization, malware scanning, and permanent storage will be enforced after backend integration.",
    ],
  ];
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, dataSheet, schema.sheetName.slice(0, 31));
  XLSX.utils.book_append_sheet(wb, instructionSheet, "Instructions");

  const filename = excelFilename(`${schema.filenamePrefix}_Template`);
  XLSX.writeFile(wb, filename);
}

export function downloadValidationErrorFile(
  moduleLabel: string,
  rows: Array<{
    rowNumber: number;
    uniqueId: string;
    recordName: string;
    status: string;
    messages: string[];
  }>
): void {
  const rejected = rows.filter(
    (r) => r.status === "error" || r.status === "duplicate-file"
  );
  const aoa = [
    ["Row", "Unique ID", "Record Name", "Status", "Errors"],
    ...rejected.map((r) => [
      r.rowNumber,
      r.uniqueId,
      r.recordName,
      r.status,
      r.messages.join("; "),
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Validation Errors");
  XLSX.writeFile(
    wb,
    excelFilename(`${moduleLabel.replace(/\s+/g, "_")}_Validation_Errors`)
  );
}

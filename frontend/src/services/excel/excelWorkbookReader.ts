import * as XLSX from "xlsx";
import {
  ALLOWED_EXCEL_EXTENSIONS,
  EXCEL_LIMITS,
  type ParsedSheet,
  type ParsedWorkbookMeta,
} from "./types";

export class ExcelReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelReadError";
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function assertAllowedExcelFile(file: File): void {
  const lower = file.name.toLowerCase();
  const ok = ALLOWED_EXCEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!ok) {
    throw new ExcelReadError(
      "Unsupported file type. Only .xlsx and .xls workbooks are accepted."
    );
  }
  if (file.size <= 0) {
    throw new ExcelReadError("The selected file is empty.");
  }
  if (file.size > EXCEL_LIMITS.maxBytes) {
    throw new ExcelReadError(
      `Workbook exceeds the ${Math.round(EXCEL_LIMITS.maxBytes / (1024 * 1024))} MB size limit.`
    );
  }
}

function cellToPlainText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  // Prefer formatted text; never execute formulas — use cached display/result only.
  if (cell.w != null && String(cell.w).length > 0) {
    return String(cell.w).slice(0, EXCEL_LIMITS.maxCellLength);
  }
  if (cell.t === "d" && cell.v instanceof Date) {
    return cell.v.toISOString().slice(0, 10);
  }
  if (cell.v == null) return "";
  const text = String(cell.v);
  return text.slice(0, EXCEL_LIMITS.maxCellLength);
}

export async function readWorkbookFile(file: File): Promise<{
  meta: ParsedWorkbookMeta;
  workbook: XLSX.WorkBook;
}> {
  assertAllowedExcelFile(file);
  const buffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: false,
      cellText: true,
      // Do not enable VBA / macros
      bookVBA: false,
      dense: false,
    });
  } catch {
    throw new ExcelReadError(
      "Unable to read this workbook. The file may be corrupt or not a valid Excel document."
    );
  }

  if (!workbook.SheetNames.length) {
    throw new ExcelReadError("No worksheets were found in this workbook.");
  }
  if (workbook.SheetNames.length > EXCEL_LIMITS.maxSheets) {
    throw new ExcelReadError(
      `Workbook has too many worksheets (max ${EXCEL_LIMITS.maxSheets}).`
    );
  }

  // Structural sanity: at least one sheet should have some cells
  const hasAnyCells = workbook.SheetNames.some((name) => {
    const sheet = workbook.Sheets[name];
    return Boolean(sheet && sheet["!ref"]);
  });
  if (!hasAnyCells) {
    throw new ExcelReadError("Workbook structure is empty or malformed.");
  }

  const meta: ParsedWorkbookMeta = {
    filename: file.name.replace(/[/\\]/g, "").slice(0, 120),
    sizeBytes: file.size,
    sizeLabel: formatSize(file.size),
    lastModifiedLabel: new Date(file.lastModified).toISOString().slice(0, 19).replace("T", " "),
    sheetNames: [...workbook.SheetNames],
  };

  return { meta, workbook };
}

export function parseWorksheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): ParsedSheet {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new ExcelReadError("Selected worksheet was not found.");
  }

  const ref = sheet["!ref"];
  if (!ref) {
    return { name: sheetName, headers: [], rowNumbers: [], rows: [] };
  }

  const range = XLSX.utils.decode_range(ref);
  const colCount = range.e.c - range.s.c + 1;
  if (colCount > EXCEL_LIMITS.maxColumns) {
    throw new ExcelReadError(
      `Worksheet has too many columns (max ${EXCEL_LIMITS.maxColumns}).`
    );
  }

  const dataRowCount = range.e.r - range.s.r;
  if (dataRowCount > EXCEL_LIMITS.maxRows) {
    throw new ExcelReadError(
      `Worksheet exceeds the maximum of ${EXCEL_LIMITS.maxRows} data rows.`
    );
  }

  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const raw = cellToPlainText(sheet[addr]).trim();
    headers.push(raw || `Column_${c - range.s.c + 1}`);
  }

  // Deduplicate headers for stable keys
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });

  const rows: Array<Record<string, string>> = [];
  const rowNumbers: number[] = [];

  for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
    const record: Record<string, string> = {};
    let empty = true;
    let hasFormulaOnly = false;

    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr] as XLSX.CellObject | undefined;
      if (cell?.f && (cell.v == null || cell.v === "") && !cell.w) {
        hasFormulaOnly = true;
      }
      const text = cellToPlainText(cell).trim();
      if (text) empty = false;
      record[uniqueHeaders[c - range.s.c]] = text;
    }

    if (empty) {
      continue;
    }

    if (hasFormulaOnly) {
      record.__formulaWarning = "true";
    }

    rows.push(record);
    rowNumbers.push(r + 1); // 1-based Excel row number
  }

  return {
    name: sheetName,
    headers: uniqueHeaders,
    rowNumbers,
    rows,
  };
}

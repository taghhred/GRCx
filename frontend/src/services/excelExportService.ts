/**
 * Safe local Excel (.xlsx) export — OOXML ZIP without third-party parsers or macros.
 * Spreadsheet content is treated as untrusted display data only.
 */

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExcelSheetInput {
  sheetName: string;
  columns: ExcelColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
}

export interface ExcelExportInput {
  filename: string;
  sheetName?: string;
  columns?: ExcelColumn[];
  rows?: Array<Record<string, string | number | null | undefined>>;
  sheets?: ExcelSheetInput[];
  /** Optional filter summary written to an "Export Info" worksheet */
  exportInfo?: Array<{ label: string; value: string }>;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function excelFilename(prefix: string): string {
  const safe = prefix.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
  return `${safe}_${todayStamp()}.xlsx`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zipStore(files: Array<{ path: string; data: Uint8Array }>): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encodeUtf8(file.path);
    const crc = crc32(file.data);
    const localHeader = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);
    localParts.push(localHeader, file.data);

    const centralHeader = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + file.data.length;
  }

  const central = concat(centralParts);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);

  const payload = concat([...localParts, central, end]);
  return new Blob([new Uint8Array(payload)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function colLetter(index: number): string {
  let n = index;
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function cellRef(col: number, row: number): string {
  return `${colLetter(col)}${row}`;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Sheet1";
}

function neutralizeFormulaInjection(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

function buildSheetXml(sheet: ExcelSheetInput): string {
  const { columns, rows } = sheet;
  const lastCol = colLetter(Math.max(0, columns.length - 1));
  const lastRow = Math.max(1, rows.length + 1);
  const filterRef = `A1:${lastCol}${lastRow}`;

  const colDefs = columns
    .map((column, index) => {
      const headerLen = column.header.length;
      const maxCell = rows.reduce((max, row) => {
        const value = String(row[column.key] ?? "");
        return Math.max(max, value.length);
      }, headerLen);
      const width = column.width ?? Math.min(48, Math.max(12, maxCell + 2));
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  const headerCells = columns
    .map(
      (column, index) =>
        `<c r="${cellRef(index, 1)}" t="inlineStr" s="1"><is><t>${xmlEscape(column.header)}</t></is></c>`
    )
    .join("");

  const bodyRows = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const cells = columns
        .map((column, colIndex) => {
          const raw = row[column.key];
          const text = neutralizeFormulaInjection(
            raw == null ? "" : String(raw)
          );
          return `<c r="${cellRef(colIndex, excelRow)}" t="inlineStr"><is><t>${xmlEscape(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${excelRow}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><outlinePr summaryBelow="1"/></sheetPr>
  <dimension ref="${filterRef}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${colDefs}</cols>
  <sheetData>
    <row r="1">${headerCells}</row>
    ${bodyRows}
  </sheetData>
  <autoFilter ref="${filterRef}"/>
  <pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

function resolveSheets(input: ExcelExportInput): ExcelSheetInput[] {
  if (input.sheets && input.sheets.length > 0) {
    return input.sheets.map((sheet) => ({
      ...sheet,
      sheetName: sanitizeSheetName(sheet.sheetName),
    }));
  }
  return [
    {
      sheetName: sanitizeSheetName(input.sheetName ?? "Sheet1"),
      columns: input.columns ?? [],
      rows: input.rows ?? [],
    },
  ];
}

export function exportTableToXlsx(input: ExcelExportInput): void {
  const sheets = resolveSheets(input);
  if (input.exportInfo && input.exportInfo.length > 0) {
    sheets.push({
      sheetName: "Export Info",
      columns: [
        { key: "label", header: "Property" },
        { key: "value", header: "Value" },
      ],
      rows: [
        { label: "Export timestamp", value: new Date().toISOString() },
        ...input.exportInfo.map((item) => ({
          label: item.label,
          value: item.value,
        })),
      ],
    });
  }

  const sheetOverrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetOverrides}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookSheets = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xmlEscape(sheet.sheetName)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheets}</sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="2">
    <xf/>
    <xf fontId="1" applyFont="1"/>
  </cellXfs>
</styleSheet>`;

  const files: Array<{ path: string; data: Uint8Array }> = [
    { path: "[Content_Types].xml", data: encodeUtf8(contentTypes) },
    { path: "_rels/.rels", data: encodeUtf8(rels) },
    { path: "xl/workbook.xml", data: encodeUtf8(workbook) },
    { path: "xl/_rels/workbook.xml.rels", data: encodeUtf8(workbookRels) },
    { path: "xl/styles.xml", data: encodeUtf8(styles) },
  ];

  sheets.forEach((sheet, index) => {
    files.push({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: encodeUtf8(buildSheetXml(sheet)),
    });
  });

  downloadBlob(zipStore(files), input.filename);
}

export const EXCEL_ACCEPT =
  ".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function isAllowedExcelFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

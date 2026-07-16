/** Safe print-window PDF export — no third-party PDF parsers or macros. */

export interface PdfExportDocument {
  title: string;
  subtitle?: string;
  bodyHtml: string;
}

export interface PdfExportService {
  downloadPdf: (document: PdfExportDocument) => void;
  openPrintPreview: (document: PdfExportDocument) => void;
}

function buildDocumentHtml(document: PdfExportDocument): string {
  const safeTitle = document.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeSubtitle = (document.subtitle ?? "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${safeTitle}</title>
  <style>
    @page { margin: 18mm; }
    body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;line-height:1.45;margin:0;padding:24px;position:relative}
    h1{font-size:22px;margin:0 0 6px}
    .sub{color:#64748b;margin:0 0 20px;font-size:13px}
    h2{font-size:16px;margin:22px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
    h3{font-size:14px;margin:16px 0 6px}
    p,li{font-size:12px;color:#334155}
    table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0 14px}
    th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f8fafc}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin:0 0 18px;font-size:12px}
    .meta div{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;background:#f8fafc}
    .meta span{display:block;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
    .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;display:flex;justify-content:space-between}
    .wm{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}
    .wm span{font-weight:700;color:#94a3b8;white-space:nowrap}
    .content{position:relative;z-index:1}
    .page-break{page-break-before:always;margin-top:28px}
  </style></head><body>
  <div class="content">
    <h1>${safeTitle}</h1>
    ${safeSubtitle ? `<p class="sub">${safeSubtitle}</p>` : ""}
    ${document.bodyHtml}
    <div class="footer"><span>GRCx · Confidential</span><span>Generated locally in UI prototype</span></div>
  </div>
  <script>window.onload=function(){window.print()}</script>
  </body></html>`;
}

function openHtmlDocument(document: PdfExportDocument): void {
  const html = buildDocumentHtml(document);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const pdfExportService: PdfExportService = {
  downloadPdf: openHtmlDocument,
  openPrintPreview: openHtmlDocument,
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import type { Report } from "../mocks/types/reports";
import {
  buildEnterprisePdf,
  dataUrlToBlob,
  downloadPdfBlob,
} from "./grcxPdfEngine";
import { ensureReportPdf } from "../mocks/services/reportService";

/** Download a real PDF for a report (read-only package). */
export async function downloadReportPdf(report: Report): Promise<void> {
  const ready =
    report.pdfDataUrl != null ? report : await ensureReportPdf(report);
  if (ready.pdfDataUrl) {
    downloadPdfBlob(
      dataUrlToBlob(ready.pdfDataUrl),
      `${ready.reportId}_${ready.name.replace(/[^\w\-]+/g, "_")}.pdf`
    );
    return;
  }
  const pdf = await buildEnterprisePdf(ready);
  downloadPdfBlob(pdf.blob, `${ready.reportId}.pdf`);
}

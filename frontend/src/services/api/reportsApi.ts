import { isMocksEnabled } from "./config";
import { apiRequest } from "./client";
import type { Report } from "../../mocks/types/reports";

export async function listReports(opts?: {
  archived?: boolean;
  q?: string;
}): Promise<Report[]> {
  if (isMocksEnabled()) {
    return [];
  }
  const qs = new URLSearchParams();
  if (opts?.archived) qs.set("archived", "true");
  if (opts?.q) qs.set("q", opts.q);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiRequest<Report[]>(`/reports${suffix}`);
}

export async function upsertReport(payload: {
  report: Report | Record<string, unknown>;
  pdfBase64?: string | null;
}): Promise<Report> {
  if (isMocksEnabled()) {
    return payload.report as Report;
  }
  return apiRequest<Report>("/reports", {
    method: "POST",
    body: {
      report: payload.report,
      pdfBase64: payload.pdfBase64 ?? null,
    },
  });
}

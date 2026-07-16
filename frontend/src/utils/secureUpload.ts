/**
 * Client-side upload guards (UX only). Backend must re-validate.
 * Blocks path traversal, double extensions, and disallowed types/sizes.
 */

const MAX_POLICY_BYTES = 15 * 1024 * 1024;
const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;

const POLICY_EXT = new Set([".pdf", ".docx"]);
const KPI_EVIDENCE_EXT = new Set([
  ".xlsx",
  ".xls",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".docx",
]);
const SUPPORTING_EVIDENCE_EXT = new Set([".pdf", ".docx", ".xlsx"]);

const MIME_BY_EXT: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
  ".xls": ["application/vnd.ms-excel", "application/octet-stream"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
};

function hasUnsafeFilenameChars(name: string): boolean {
  if (/[\\/<>:"|?*]/.test(name) || name.startsWith(".") || name.endsWith(".")) {
    return true;
  }
  for (let i = 0; i < name.length; i += 1) {
    const code = name.charCodeAt(i);
    if (code <= 0x1f) return true;
  }
  return false;
}
const DOUBLE_EXT = /\.(exe|js|mjs|bat|cmd|ps1|sh|php|html|htm|svg)(\.|$)/i;

export type UploadKind = "policy-document" | "policy-evidence" | "kpi-evidence";

export interface SecureUploadResult {
  ok: true;
  safeName: string;
  extension: string;
}

export interface SecureUploadError {
  ok: false;
  message: string;
}

function basename(name: string): string {
  return name.replace(/^.*[/\\]/, "").trim();
}

function extensionOf(name: string): string {
  const base = basename(name).toLowerCase();
  const idx = base.lastIndexOf(".");
  if (idx < 0) return "";
  return base.slice(idx);
}

function allowedSet(kind: UploadKind): Set<string> {
  if (kind === "policy-document") return POLICY_EXT;
  if (kind === "policy-evidence") return SUPPORTING_EVIDENCE_EXT;
  return KPI_EVIDENCE_EXT;
}

function maxBytes(kind: UploadKind): number {
  return kind === "policy-document" ? MAX_POLICY_BYTES : MAX_EVIDENCE_BYTES;
}

export function validateSecureUpload(
  file: File,
  kind: UploadKind
): SecureUploadResult | SecureUploadError {
  const rawName = basename(file.name);
  if (!rawName || rawName.length > 180) {
    return { ok: false, message: "Invalid or overly long filename." };
  }
  if (hasUnsafeFilenameChars(rawName) || rawName.includes("..")) {
    return { ok: false, message: "Filename contains unsafe characters." };
  }
  if (DOUBLE_EXT.test(rawName)) {
    return { ok: false, message: "Executable or script extensions are not allowed." };
  }

  const ext = extensionOf(rawName);
  if (!allowedSet(kind).has(ext)) {
    return {
      ok: false,
      message: `File type ${ext || "(none)"} is not allowed for this upload.`,
    };
  }

  if (file.size <= 0 || file.size > maxBytes(kind)) {
    return {
      ok: false,
      message: `File exceeds the maximum size of ${Math.round(maxBytes(kind) / (1024 * 1024))} MB.`,
    };
  }

  const allowedMimes = MIME_BY_EXT[ext] ?? [];
  if (file.type && allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
    return {
      ok: false,
      message: "MIME type does not match the declared file extension.",
    };
  }

  const safeName = rawName.replace(/\s+/g, "_");
  return { ok: true, safeName, extension: ext };
}

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../common/Button";
import styles from "./RiskImportDialog.module.css";

const MAX_DISPLAY_NAME = 120;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls"] as const;

export interface PendingRiskFile {
  displayName: string;
  sizeLabel: string;
  uploadDate: string;
  mode: "import" | "attach";
}

interface ValidationSummary {
  validRows: number;
  invalidRows: number;
  missingRequiredFields: number;
  duplicateCaseIds: number;
}

interface RiskImportDialogProps {
  open: boolean;
  mode: "import" | "attach";
  onClose: () => void;
  onSimulatedComplete: (file: PendingRiskFile) => void;
}

function sanitizeDisplayName(name: string): string {
  const base = name.replace(/[/\\]/g, "").trim();
  const cleaned = base.slice(0, MAX_DISPLAY_NAME);
  return cleaned.length > 0 ? cleaned : "selected-file.xlsx";
}

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RiskImportDialog({
  open,
  mode,
  onClose,
  onSimulatedComplete,
}: RiskImportDialogProps) {
  const titleId = useId();
  const noteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fileMeta, setFileMeta] = useState<PendingRiskFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [validation, setValidation] = useState<ValidationSummary | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const title =
    mode === "import" ? "Import Excel — Risk Cases" : "Attach Excel File";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!hasAllowedExtension(file.name)) {
      setError("Only .xlsx and .xls files are accepted.");
      setFileMeta(null);
      setStep("select");
      setValidation(null);
      return;
    }
    const displayName = sanitizeDisplayName(file.name);
    setError(null);
    setFileMeta({
      displayName,
      sizeLabel: formatSize(file.size),
      uploadDate: new Date().toISOString().slice(0, 10),
      mode,
    });
    setValidation({
      validRows: 18,
      invalidRows: 2,
      missingRequiredFields: 1,
      duplicateCaseIds: 1,
    });
    setStep("confirm");
  };

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className={styles.body}>
          <p id={noteId} className={styles.securityNote}>
            File validation and server-side security checks will be enforced when
            backend integration is added.
          </p>

          <div className={styles.pickerRow}>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className={styles.srOnly}
              onChange={handleFileChange}
            />
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              Choose Excel file
            </Button>
            <span className={styles.hint}>.xlsx / .xls only · UI prototype</span>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          {fileMeta ? (
            <dl className={styles.meta}>
              <div>
                <dt>Filename</dt>
                <dd>{fileMeta.displayName}</dd>
              </div>
              <div>
                <dt>File size</dt>
                <dd>{fileMeta.sizeLabel}</dd>
              </div>
              <div>
                <dt>Upload date</dt>
                <dd>{fileMeta.uploadDate}</dd>
              </div>
            </dl>
          ) : (
            <p className={styles.placeholder}>No file selected.</p>
          )}

          <div className={styles.preview}>
            <h3>Preview</h3>
            <p>
              Spreadsheet contents are not parsed in this UI prototype. A secure
              server-side parser will generate a row preview after backend
              integration. Macros and scripts are never executed in the browser.
            </p>
          </div>

          {step === "confirm" && validation ? (
            <div className={styles.validation}>
              <h3>Mock validation summary</h3>
              <ul>
                <li>Valid rows: {validation.validRows}</li>
                <li>Invalid rows: {validation.invalidRows}</li>
                <li>Missing required fields: {validation.missingRequiredFields}</li>
                <li>Duplicate Case IDs: {validation.duplicateCaseIds}</li>
              </ul>
              <p className={styles.confirmCopy}>
                Confirm to simulate {mode === "import" ? "import" : "attachment"}{" "}
                without uploading data to a server.
              </p>
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!fileMeta || step !== "confirm"}
            onClick={() => {
              if (!fileMeta) return;
              onSimulatedComplete(fileMeta);
              onClose();
            }}
          >
            Simulate {mode === "import" ? "Import" : "Attach"}
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "./Button";
import {
  EXCEL_ACCEPT,
  isAllowedExcelFilename,
} from "../../services/excelExportService";
import styles from "./ExcelImportDialog.module.css";

const MAX_DISPLAY_NAME = 120;

export interface PendingExcelFile {
  displayName: string;
  sizeLabel: string;
  uploadDate: string;
}

interface ExcelImportDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSimulatedComplete: (file: PendingExcelFile) => void;
}

function sanitizeDisplayName(name: string): string {
  const base = name.replace(/[/\\]/g, "").trim();
  const cleaned = base.slice(0, MAX_DISPLAY_NAME);
  return cleaned.length > 0 ? cleaned : "selected-file.xlsx";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExcelImportDialog({
  open,
  title,
  onClose,
  onSimulatedComplete,
}: ExcelImportDialogProps) {
  const titleId = useId();
  const noteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fileMeta, setFileMeta] = useState<PendingExcelFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!isAllowedExcelFilename(file.name)) {
      setError("Only .xlsx and .xls files are accepted.");
      setFileMeta(null);
      setStep("select");
      return;
    }
    setError(null);
    setFileMeta({
      displayName: sanitizeDisplayName(file.name),
      sizeLabel: formatSize(file.size),
      uploadDate: new Date().toISOString().slice(0, 10),
    });
    setStep("confirm");
  };

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        setFileMeta(null);
        setError(null);
        setStep("select");
        onClose();
      }}
    >
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
            onClick={() => {
              setFileMeta(null);
              setError(null);
              setStep("select");
              onClose();
            }}
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
              accept={EXCEL_ACCEPT}
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

          {step === "confirm" && fileMeta ? (
            <div className={styles.validation}>
              <h3>Ready to import</h3>
              <p className={styles.confirmCopy}>
                Confirm to simulate import without uploading data to a server.
              </p>
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <Button
            variant="ghost"
            onClick={() => {
              setFileMeta(null);
              setError(null);
              setStep("select");
              onClose();
            }}
          >
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
            Simulate Import
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

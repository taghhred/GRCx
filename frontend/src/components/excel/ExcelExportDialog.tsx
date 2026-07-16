import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../common/Button";
import {
  excelFilename,
  exportTableToXlsx,
  type ExcelColumn,
} from "../../services/excelExportService";
import styles from "./ExcelExportDialog.module.css";

export interface ExcelExportDialogProps {
  open: boolean;
  moduleLabel: string;
  filenamePrefix: string;
  sheetName: string;
  columns: ExcelColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
  filterSummary: Array<{ label: string; value: string }>;
  selectedRows?: Array<Record<string, string | number | null | undefined>>;
  /** When provided, enables “Export entire dataset” alongside filtered / selected. */
  allRows?: Array<Record<string, string | number | null | undefined>>;
  onClose: () => void;
}

export default function ExcelExportDialog({
  open,
  moduleLabel,
  filenamePrefix,
  sheetName,
  columns,
  rows,
  filterSummary,
  selectedRows,
  allRows,
  onClose,
}: ExcelExportDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasSelection = Boolean(selectedRows && selectedRows.length > 0);
  const hasEntire = Boolean(allRows && allRows.length > 0);
  const filename = excelFilename(filenamePrefix);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const runExport = (mode: "filtered" | "selected" | "entire") => {
    const exportRows =
      mode === "selected" && selectedRows?.length
        ? selectedRows
        : mode === "entire" && allRows?.length
          ? allRows
          : rows;
    const modeLabel =
      mode === "selected"
        ? "Selected rows / current view"
        : mode === "entire"
          ? "Entire dataset"
          : "Filtered records";
    exportTableToXlsx({
      filename,
      sheetName,
      columns,
      rows: exportRows,
      exportInfo: [
        { label: "Module", value: moduleLabel },
        { label: "Worksheet", value: sheetName },
        { label: "Rows exported", value: String(exportRows.length) },
        { label: "Export mode", value: modeLabel },
        ...filterSummary,
      ],
    });
    onClose();
  };

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id={titleId}>Export Current View</h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close export dialog"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className={styles.body}>
          <dl className={styles.meta}>
            <div>
              <dt>Rows to export</dt>
              <dd>{rows.length}</dd>
            </div>
            <div>
              <dt>Worksheet name</dt>
              <dd>{sheetName}</dd>
            </div>
            <div>
              <dt>Filename</dt>
              <dd>{filename}</dd>
            </div>
          </dl>
          <div>
            <h3 className={styles.sectionTitle}>Applied filters</h3>
            <ul className={styles.filterList}>
              {filterSummary.length === 0 ? (
                <li>None — exporting all records in the current module view.</li>
              ) : (
                filterSummary.map((item) => (
                  <li key={item.label}>
                    <strong>{item.label}:</strong> {item.value}
                  </li>
                ))
              )}
            </ul>
          </div>
          <p className={styles.note}>
            Only Excel (.xlsx) is supported for operational tables. PDF and CSV
            are not available here.
          </p>
        </div>
        <footer className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {hasSelection ? (
            <Button variant="secondary" onClick={() => runExport("selected")}>
              Export current view ({selectedRows!.length})
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => runExport("filtered")}>
            Export filtered records ({rows.length})
          </Button>
          {hasEntire ? (
            <Button variant="secondary" onClick={() => runExport("entire")}>
              Export entire dataset ({allRows!.length})
            </Button>
          ) : null}
        </footer>
      </div>
    </div>,
    document.body
  );
}

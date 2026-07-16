import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";
import styles from "./DataTransferButton.module.css";

type BaseProps = {
  loading?: boolean;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

function DataTransferButton({
  loading = false,
  className,
  disabled,
  children,
  icon,
  ...rest
}: BaseProps & { icon: ReactNode }) {
  const classes = [styles.button, className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className={styles.spin} aria-hidden />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}

export function ExportCurrentViewButton({
  children = "Export Current View",
  title = "Export the rows matching current filters and search to Excel (.xlsx)",
  ...rest
}: BaseProps) {
  return (
    <DataTransferButton
      icon={<FileSpreadsheet size={16} aria-hidden />}
      title={title}
      {...rest}
    >
      {children}
    </DataTransferButton>
  );
}

export function DownloadPdfButton({
  children = "Download PDF",
  ...rest
}: BaseProps) {
  return (
    <DataTransferButton icon={<FileText size={16} aria-hidden />} {...rest}>
      {children}
    </DataTransferButton>
  );
}

export function ImportMergeExcelButton({
  children = "Import & Merge Excel",
  title = "Import an Excel workbook, validate rows, and merge by unique identifier",
  ...rest
}: BaseProps) {
  return (
    <DataTransferButton
      icon={<Upload size={16} aria-hidden />}
      title={title}
      {...rest}
    >
      {children}
    </DataTransferButton>
  );
}

/** @deprecated Prefer ImportMergeExcelButton */
export function ImportExcelButton(props: BaseProps) {
  return <ImportMergeExcelButton {...props} />;
}

/** @deprecated Prefer ExportCurrentViewButton */
export function ExportExcelButton(props: BaseProps) {
  return <ExportCurrentViewButton {...props} />;
}

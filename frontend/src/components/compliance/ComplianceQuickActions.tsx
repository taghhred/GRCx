import { useRef, type ReactNode } from "react";
import {
  ClipboardCheck,
  Download,
  FileBarChart,
  RefreshCw,
  Upload,
  UploadCloud,
} from "lucide-react";
import Button from "../common/Button";
import { EXCEL_ACCEPT } from "../../services/excelExportService";
import styles from "./Compliance.module.css";

interface ComplianceQuickActionsProps {
  onNewAssessment?: () => void;
  onUploadEvidence?: () => void;
  onImport: (files: FileList) => void;
  onExport: () => void;
  onGenerateReport?: () => void;
  onRefresh: () => void;
  importing?: boolean;
  refreshing?: boolean;
  extra?: ReactNode;
}

export default function ComplianceQuickActions({
  onNewAssessment,
  onUploadEvidence,
  onImport,
  onExport,
  onGenerateReport,
  onRefresh,
  importing = false,
  refreshing = false,
  extra,
}: ComplianceQuickActionsProps) {
  const importRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionButtons}>
        {onNewAssessment ? (
          <Button type="button" variant="primary" onClick={onNewAssessment}>
            <ClipboardCheck size={16} aria-hidden />
            New Assessment
          </Button>
        ) : null}
        {onUploadEvidence ? (
          <Button type="button" variant="secondary" onClick={onUploadEvidence}>
            <UploadCloud size={16} aria-hidden />
            Upload Evidence
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={() => importRef.current?.click()}
          disabled={importing}
        >
          <Upload size={16} aria-hidden />
          {importing ? "Importing…" : "Import"}
        </Button>
        <Button type="button" variant="secondary" onClick={onExport}>
          <Download size={16} aria-hidden />
          Export
        </Button>
        {onGenerateReport ? (
          <Button type="button" variant="secondary" onClick={onGenerateReport}>
            <FileBarChart size={16} aria-hidden />
            Generate Report
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? styles.spin : undefined} aria-hidden />
          Refresh
        </Button>
        {extra}
      </div>
      <input
        ref={importRef}
        type="file"
        accept={EXCEL_ACCEPT}
        multiple
        className={styles.hiddenInput}
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            onImport(event.target.files);
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}

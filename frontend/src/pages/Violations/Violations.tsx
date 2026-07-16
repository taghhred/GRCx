import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/common/Button";
import { ExportExcelButton } from "../../components/common/DataTransferButton";
import { buildBreadcrumbs } from "../../components/layout/Sidebar/navConfig";
import styles from "./Violations.module.css";
import ViolationCard from "../../components/violations/ViolationCard";
import { violationsData } from "../../components/violations/violationsData";
import {
  excelFilename,
  exportTableToXlsx,
} from "../../services/excelExportService";
import { SEARCH_MAX_LENGTH } from "../../utils/security";

export default function Violations() {
  const breadcrumbs = buildBreadcrumbs("/violations");
  const [query, setQuery] = useState("");

  const handleExport = () => {
    exportTableToXlsx({
      filename: excelFilename("Violations"),
      sheetName: "Violations",
      columns: [
        { key: "id", header: "ID" },
        { key: "title", header: "Title" },
        { key: "employee", header: "Employee" },
        { key: "department", header: "Department" },
        { key: "severity", header: "Severity" },
        { key: "riskScore", header: "Risk Score" },
        { key: "framework", header: "Framework" },
        { key: "confidence", header: "Confidence" },
      ],
      rows: violationsData.map((item) => ({
        id: item.id,
        title: item.title,
        employee: item.employee,
        department: item.department,
        severity: item.severity,
        riskScore: item.riskScore,
        framework: item.framework.join(", "),
        confidence: item.confidence,
      })),
    });
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <PageHeader
          breadcrumbs={breadcrumbs}
          title="Violations"
          description="Monitor detected identity, access, and compliance violations across the organization."
          primaryAction={<ExportExcelButton onClick={handleExport} />}
          secondaryActions={
            <Button variant="secondary">Create Case</Button>
          }
        />

        <section className={styles.toolbar} aria-label="Filters">
          <div className={styles.search}>
            <Search size={20} aria-hidden />
            <label className={styles.srOnly} htmlFor="violations-search">
              Search violations
            </label>
            <input
              id="violations-search"
              placeholder="Search by employee, violation or ID..."
              maxLength={SEARCH_MAX_LENGTH}
              value={query}
              onChange={(event) =>
                setQuery(event.target.value.slice(0, SEARCH_MAX_LENGTH))
              }
            />
          </div>

          <div className={styles.filters}>
            <button type="button" className={styles.filterButton}>
              <Filter size={16} aria-hidden />
              Severity
            </button>

            <button type="button" className={styles.filterButton}>
              <SlidersHorizontal size={16} aria-hidden />
              Framework
            </button>

            <button type="button" className={styles.filterButton}>
              Status
            </button>

            <button type="button" className={styles.sortButton}>
              <ArrowUpDown size={16} aria-hidden />
              Sort
            </button>
          </div>
        </section>

        <section className={styles.summary} aria-label="Summary">
          <div className={styles.summaryCard}>
            <span>Total</span>
            <h2>27</h2>
          </div>

          <div className={styles.summaryCard}>
            <span>Critical</span>
            <h2 className={styles.critical}>3</h2>
          </div>

          <div className={styles.summaryCard}>
            <span>High</span>
            <h2 className={styles.high}>7</h2>
          </div>

          <div className={styles.summaryCard}>
            <span>Resolved</span>
            <h2 className={styles.success}>17</h2>
          </div>
        </section>

        <section className={styles.cardsSection} aria-label="Violation list">
          {violationsData.map((violation) => (
            <ViolationCard key={violation.id} violation={violation} />
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
}

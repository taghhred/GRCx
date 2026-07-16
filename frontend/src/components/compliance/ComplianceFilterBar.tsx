/** Filter bar used by Compliance Management sections — API-compatible stub. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type ComplianceFilterValues = Record<string, any>;

export const EMPTY_COMPLIANCE_FILTERS: ComplianceFilterValues = {
  search: "",
  framework: "All",
  department: "All",
  businessUnit: "All",
  status: "All",
  assessmentStatus: "All",
  riskLevel: "All",
  evidenceStatus: "All",
  owner: "All",
  dateFrom: "",
  dateTo: "",
};

interface Props {
  values?: ComplianceFilterValues;
  value?: ComplianceFilterValues;
  options?: Record<string, string[]>;
  onChange?: (patch: ComplianceFilterValues) => void;
  searchPlaceholder?: string;
  showDateRange?: boolean;
  [key: string]: any;
}

export default function ComplianceFilterBar(_props: Props) {
  return <div className="compliance-filter-bar" aria-hidden />;
}

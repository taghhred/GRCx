import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { identityMonitoringData } from "../src/mocks/data/identityData";
import { assetComplianceData } from "../src/mocks/data/complianceData";
import { bcmDashboardData } from "../src/mocks/data/bcmData";
import { drDashboardData } from "../src/mocks/data/drpData";
import {
  DASHBOARD_ORG_TREE,
  DASHBOARD_RESPONSIBILITIES,
} from "../src/mocks/data/dashboardOrgData";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../../backend/data/seeds");
mkdirSync(outDir, { recursive: true });

const writes: Array<[string, unknown]> = [
  ["identity.json", identityMonitoringData],
  ["compliance_assets.json", assetComplianceData],
  ["bcm.json", bcmDashboardData],
  ["dr.json", drDashboardData],
  [
    "dashboard_org.json",
    { orgTree: DASHBOARD_ORG_TREE, responsibilities: DASHBOARD_RESPONSIBILITIES },
  ],
];

for (const [name, data] of writes) {
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2), "utf8");
  console.log("wrote", name);
}
console.log("done");

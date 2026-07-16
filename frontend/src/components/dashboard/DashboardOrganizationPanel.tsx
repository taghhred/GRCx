import { useEffect, useState } from "react";
import type { OrgNode } from "../../mocks/data/dashboardOrgData";
import { DASHBOARD_ORG_TREE } from "../../mocks/data/dashboardOrgData";
import { fetchOrganization } from "../../services/api/dashboardApi";
import styles from "./DashboardOrganizationPanel.module.css";

function OrgCard({ node, root }: { node: OrgNode; root?: boolean }) {
  return (
    <div className={`${styles.node} ${root ? styles.nodeRoot : ""}`}>
      <div className={styles.avatar} aria-hidden>
        {node.name.slice(0, 1)}
      </div>
      <div className={styles.meta}>
        <strong>{node.name}</strong>
        <span>{node.role}</span>
        <em>{node.department}</em>
      </div>
    </div>
  );
}

function OrgBranch({ node, root }: { node: OrgNode; root?: boolean }) {
  const children = node.children ?? [];
  return (
    <li className={styles.branch}>
      <OrgCard node={node} root={root} />
      {children.length > 0 ? (
        <ul className={styles.children} aria-label={`${node.name} reports`}>
          {children.map((child) => (
            <OrgBranch key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function isOrgNode(value: unknown): value is OrgNode {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as OrgNode).id === "string" &&
    typeof (value as OrgNode).name === "string"
  );
}

export default function DashboardOrganizationPanel() {
  const [tree, setTree] = useState<OrgNode>(DASHBOARD_ORG_TREE);

  useEffect(() => {
    let cancelled = false;
    void fetchOrganization().then((data) => {
      if (cancelled) return;
      if (isOrgNode(data.orgTree)) setTree(data.orgTree);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.panel} aria-label="Organization">
      <h2 className={styles.heading}>Organization</h2>
      <div className={styles.chartWrap}>
        <ul className={styles.tree}>
          <OrgBranch node={tree} root />
        </ul>
      </div>
    </section>
  );
}

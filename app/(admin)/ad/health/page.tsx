import React from "react";
import { getDatabaseHealthReport } from "@/lib/health/actions";
import { DatabaseHealthView } from "@/components/health/database-health-view";

export const metadata = {
  title: "Database Health",
  description: "Live MongoDB health diagnostics, referential integrity auditor, and schema reconciliation.",
};

export default async function DatabaseHealthPage() {
  const report = await getDatabaseHealthReport();

  return <DatabaseHealthView initialReport={report} />;
}

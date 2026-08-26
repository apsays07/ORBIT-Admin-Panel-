import React from "react";
import type { Metadata } from "next";
import { getSecurityOverview } from "@/lib/security/actions";
import { SecurityManagementView } from "@/components/security/security-management-view";

export const metadata: Metadata = {
  title: "Security",
};

export default async function SecurityPage() {
  const data = await getSecurityOverview();
  return <SecurityManagementView data={data} />;
}

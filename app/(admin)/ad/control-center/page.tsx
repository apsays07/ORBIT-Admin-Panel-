import React from "react";
import type { Metadata } from "next";
import { getControlCenterData } from "@/lib/control-center/actions";
import { ControlCenterView } from "@/components/control-center/control-center-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IPO Control Center",
  description: "Reconciliation, issue detection, capital & lot cross-checking, and PAN intelligence.",
};

interface ControlCenterPageProps {
  searchParams: Promise<{
    ipoId?: string;
  }>;
}

export default async function ControlCenterPage({ searchParams }: ControlCenterPageProps) {
  const resolvedParams = await searchParams;
  const initialData = await getControlCenterData({
    selectedIpoId: resolvedParams.ipoId,
  });

  return <ControlCenterView initialData={initialData} />;
}

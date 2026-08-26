import React from "react";
import type { Metadata } from "next";
import { getProfitDistributionData } from "@/lib/profit/actions";
import { ProfitDistributionView } from "@/components/profit/profit-distribution-view";

export const metadata: Metadata = {
  title: "Profit Distribution",
};

interface ProfitPageProps {
  searchParams: Promise<{
    ipoId?: string;
    q?: string;
  }>;
}

export default async function ProfitPage({ searchParams }: ProfitPageProps) {
  const resolvedParams = await searchParams;

  const ipoId = resolvedParams.ipoId || "DEFAULT";
  const query = resolvedParams.q || "";

  const data = await getProfitDistributionData({
    ipoId,
    query,
  });

  return <ProfitDistributionView data={data} initialIpoId={ipoId} />;
}

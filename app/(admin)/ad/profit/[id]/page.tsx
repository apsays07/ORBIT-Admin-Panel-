import React from "react";
import type { Metadata } from "next";
import { getProfitDistributionData } from "@/lib/profit/actions";
import { ProfitDistributionView } from "@/components/profit/profit-distribution-view";

export const metadata: Metadata = {
  title: "Profit Details",
};

interface ProfitDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function ProfitDetailPage({ params, searchParams }: ProfitDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";

  const data = await getProfitDistributionData({
    ipoId: id,
    query,
  });

  return <ProfitDistributionView data={data} initialIpoId={id} />;
}

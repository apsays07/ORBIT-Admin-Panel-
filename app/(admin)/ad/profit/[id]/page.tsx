import React from "react";
import type { Metadata } from "next";
import { getProfitDistributionData } from "@/lib/profit/actions";
import { ProfitDistributionView } from "@/components/profit/profit-distribution-view";
import { validateSession } from "@/lib/auth/session";

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

  const [data, session] = await Promise.all([
    getProfitDistributionData({
      ipoId: id,
      query,
    }),
    validateSession(),
  ]);

  const isAdmin = session.authenticated && (session.role === "SUPER_ADMIN" || session.role === "ADMIN");

  return <ProfitDistributionView data={data} initialIpoId={id} isAdmin={isAdmin} currentUser={session.user} />;
}

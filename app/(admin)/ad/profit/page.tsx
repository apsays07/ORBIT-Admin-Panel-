import React from "react";
import type { Metadata } from "next";
import { getProfitDistributionData } from "@/lib/profit/actions";
import { ProfitDistributionView } from "@/components/profit/profit-distribution-view";
import { validateSession } from "@/lib/auth/session";

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

  const [data, session] = await Promise.all([
    getProfitDistributionData({
      ipoId,
      query,
    }),
    validateSession(),
  ]);

  const isAdmin = session.authenticated && (session.role === "SUPER_ADMIN" || session.role === "ADMIN");

  return <ProfitDistributionView data={data} initialIpoId={ipoId} isAdmin={isAdmin} currentUser={session.user} />;
}

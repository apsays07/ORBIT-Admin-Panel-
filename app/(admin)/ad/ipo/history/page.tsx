import React from "react";
import type { Metadata } from "next";
import { getHistoricalIpos } from "@/lib/ipo/actions";
import { IpoHistoryView } from "@/components/ipo/ipo-history-view";

export const metadata: Metadata = {
  title: "IPO History",
};

interface HistoryPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    page?: string;
    sort?: string;
    order?: "asc" | "desc";
  }>;
}

export default async function IpoHistoryPage({ searchParams }: HistoryPageProps) {
  const resolvedParams = await searchParams;

  const query = resolvedParams.q || "";
  const status = resolvedParams.status || "ALL";
  const category = resolvedParams.category || "ALL";
  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const sortField = resolvedParams.sort || "closeDate";
  const sortOrder = resolvedParams.order || "desc";

  const { ipos, total, totalPages, availableStatuses, metricsSummary } = await getHistoricalIpos({
    query,
    status,
    category,
    page,
    limit: 10,
    sortField,
    sortOrder,
  });

  return (
    <IpoHistoryView
      initialIpos={ipos}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      availableStatuses={availableStatuses}
      metricsSummary={metricsSummary}
    />
  );
}

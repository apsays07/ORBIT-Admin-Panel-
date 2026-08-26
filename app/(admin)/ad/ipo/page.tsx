import React from "react";
import type { Metadata } from "next";
import { getIpos } from "@/lib/ipo/actions";
import { IpoManagementView } from "@/components/ipo/ipo-management-view";

export const metadata: Metadata = {
  title: "IPOs",
};

interface IpoPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    page?: string;
    sort?: string;
    order?: "asc" | "desc";
  }>;
}

export default async function IpoManagementPage({ searchParams }: IpoPageProps) {
  const resolvedParams = await searchParams;

  const query = resolvedParams.q || "";
  const status = resolvedParams.status || "ALL";
  const category = resolvedParams.category || "ALL";
  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const sortField = resolvedParams.sort || "createdAt";
  const sortOrder = resolvedParams.order || "desc";

  const { ipos, total, totalPages, limit, availableStatuses } = await getIpos({
    query,
    status,
    category,
    page,
    limit: 10,
    sortField,
    sortOrder,
  });

  return (
    <IpoManagementView
      initialIpos={ipos}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      limit={limit}
      availableStatuses={availableStatuses}
    />
  );
}

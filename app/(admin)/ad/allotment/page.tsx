import React from "react";
import type { Metadata } from "next";
import { getAllotmentData } from "@/lib/allotment/actions";
import { AllotmentManagementView } from "@/components/allotment/allotment-management-view";

export const metadata: Metadata = {
  title: "Allotment",
};

interface AllotmentPageProps {
  searchParams: Promise<{
    ipoId?: string;
    status?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function AllotmentPage({ searchParams }: AllotmentPageProps) {
  const resolvedParams = await searchParams;

  const ipoId = resolvedParams.ipoId || "DEFAULT";
  const status = resolvedParams.status || "ALL";
  const query = resolvedParams.q || "";
  const sortField = resolvedParams.sort || "default";
  const page = parseInt(resolvedParams.page || "1", 10) || 1;

  const {
    selectedIpo,
    availableIpos,
    applications,
    metrics,
    total,
    totalPages,
  } = await getAllotmentData({
    ipoId,
    status,
    query,
    sortField,
    page,
    limit: 50,
  });

  return (
    <AllotmentManagementView
      selectedIpo={selectedIpo ? JSON.parse(JSON.stringify(selectedIpo)) : null}
      availableIpos={JSON.parse(JSON.stringify(availableIpos))}
      applications={JSON.parse(JSON.stringify(applications))}
      metrics={JSON.parse(JSON.stringify(metrics))}
      total={total}
      currentPage={page}
      totalPages={totalPages}
    />
  );
}

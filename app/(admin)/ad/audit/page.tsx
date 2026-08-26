import React from "react";
import type { Metadata } from "next";
import { getActivityLogs } from "@/lib/audit/actions";
import { ActivityManagementView } from "@/components/audit/activity-management-view";

export const metadata: Metadata = {
  title: "Audit Logs",
};

interface AuditPageProps {
  searchParams: Promise<{
    q?: string;
    eventType?: string;
    category?: string;
    severity?: string;
    page?: string;
    order?: "asc" | "desc";
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const resolvedParams = await searchParams;

  const query = resolvedParams.q || "";
  const eventType = resolvedParams.eventType || "ALL";
  const category = resolvedParams.category || "ALL";
  const severity = resolvedParams.severity || "ALL";
  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const sortOrder = resolvedParams.order || "desc";

  const {
    activities,
    total,
    totalPages,
    metrics,
    availableEventTypes,
    availableCategories,
    availableSeverities,
  } = await getActivityLogs({
    query,
    eventType,
    category,
    severity,
    page,
    limit: 20,
    sortOrder,
  });

  return (
    <ActivityManagementView
      initialActivities={activities}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      metrics={metrics}
      availableEventTypes={availableEventTypes}
      availableCategories={availableCategories}
      availableSeverities={availableSeverities}
    />
  );
}

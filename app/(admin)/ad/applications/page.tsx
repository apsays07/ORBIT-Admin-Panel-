import React from "react";
import type { Metadata } from "next";
import { getApplications, getMembersForSelection } from "@/lib/application/actions";
import { ApplicationManagementView } from "@/components/application/application-management-view";

export const metadata: Metadata = {
  title: "Applications",
};

interface ApplicationsPageProps {
  searchParams: Promise<{
    q?: string;
    search?: string;
    ipoId?: string;
    memberId?: string;
    status?: string;
    fundingStructure?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: string;
    maxAmount?: string;
    page?: string;
    limit?: string;
    sort?: string;
    order?: "asc" | "desc";
  }>;
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const pageStart = Date.now();
  const resolvedParams = await searchParams;

  const query = resolvedParams.q || resolvedParams.search || "";
  const ipoId = resolvedParams.ipoId;
  const memberId = resolvedParams.memberId;
  const status = resolvedParams.status || "ALL";
  const fundingStructure = resolvedParams.fundingStructure || "ALL";
  const dateFrom = resolvedParams.dateFrom;
  const dateTo = resolvedParams.dateTo;
  const minAmount = resolvedParams.minAmount ? parseFloat(resolvedParams.minAmount) : undefined;
  const maxAmount = resolvedParams.maxAmount ? parseFloat(resolvedParams.maxAmount) : undefined;
  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const limit = parseInt(resolvedParams.limit || "500", 10) || 500;
  const sortField = resolvedParams.sort || "createdAt";
  const sortOrder = resolvedParams.order || "desc";

  // Safe timeout helper to guarantee page never hangs in infinite skeleton
  const timeoutPromise = new Promise<{ appsData: any; members: any[] }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          appsData: {
            applications: [],
            total: 0,
            page: 1,
            totalPages: 0,
            limit,
            metrics: {
              totalApplications: 0,
              totalApplicants: 0,
              awaitingAllotment: 0,
              allottedApplications: 0,
              notAllottedApplications: 0,
              totalCapitalPooled: 0,
            },
            availableIpos: [],
            availableStatuses: ["AWAITING", "ALLOTTED", "NOT_ALLOTTED"],
            selectedIpoId: ipoId || "ALL",
          },
          members: [],
        }),
      10000
    )
  );

  let appsData;
  let members = [];

  try {
    const fetchDataPromise = Promise.all([
      getApplications({
        query,
        ipoId,
        memberId,
        status,
        fundingStructure,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        page,
        limit,
        sortField,
        sortOrder,
      }),
      getMembersForSelection(),
    ]).then(([resApps, resMembers]) => ({ appsData: resApps, members: resMembers }));

    const result = await Promise.race([fetchDataPromise, timeoutPromise]);
    appsData = result.appsData;
    members = result.members;
  } catch (err) {
    console.error("[Applications Page] Failed to fetch applications data:", err);
    appsData = {
      applications: [],
      total: 0,
      page: 1,
      totalPages: 0,
      limit,
      metrics: {
        totalApplications: 0,
        totalApplicants: 0,
        awaitingAllotment: 0,
        allottedApplications: 0,
        notAllottedApplications: 0,
        totalCapitalPooled: 0,
      },
      availableIpos: [],
      availableStatuses: ["AWAITING", "ALLOTTED", "NOT_ALLOTTED"],
      selectedIpoId: ipoId || "ALL",
    };
  }

  const {
    applications = [],
    total = 0,
    totalPages = 0,
    metrics = {
      totalApplications: 0,
      totalApplicants: 0,
      awaitingAllotment: 0,
      allottedApplications: 0,
      notAllottedApplications: 0,
      totalCapitalPooled: 0,
    },
    availableIpos = [],
    availableStatuses = ["AWAITING", "ALLOTTED", "NOT_ALLOTTED"],
    selectedIpoId: finalIpoId,
    selectedIpoName,
  } = appsData || {};

  console.log(`[Applications Page] Render completed in ${Date.now() - pageStart}ms`);

  const plainMembers = members.map((m: any) => ({
    id: m.id,
    name: m.name,
    username: m.username,
    panFull: m.panFull,
    panMasked: m.panMasked,
    defaultContribution: m.defaultContribution,
    role: m.role,
    status: m.status,
  }));

  const plainApplications = JSON.parse(JSON.stringify(applications));

  return (
    <ApplicationManagementView
      initialApplications={plainApplications}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      limit={limit}
      metrics={JSON.parse(JSON.stringify(metrics))}
      availableIpos={JSON.parse(JSON.stringify(availableIpos))}
      availableStatuses={availableStatuses}
      selectedIpoId={finalIpoId || ipoId || "ALL"}
      selectedIpoName={selectedIpoName ?? null}
      members={plainMembers}
    />
  );
}

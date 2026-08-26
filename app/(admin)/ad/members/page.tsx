import React from "react";
import type { Metadata } from "next";
import { getMembers } from "@/lib/member/actions";
import { MemberManagementView } from "@/components/member/member-management-view";

export const metadata: Metadata = {
  title: "Members",
};

interface MembersPageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const resolvedParams = await searchParams;

  const query = resolvedParams.q || "";
  const role = resolvedParams.role || "ALL";
  const status = resolvedParams.status || "ALL";
  const page = parseInt(resolvedParams.page || "1", 10) || 1;

  const { members, total, totalPages, metrics, currentUserUsername } = await getMembers({
    query,
    role,
    status,
    page,
    limit: 50,
  });

  return (
    <MemberManagementView
      initialMembers={JSON.parse(JSON.stringify(members))}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      metrics={JSON.parse(JSON.stringify(metrics))}
      currentUserUsername={currentUserUsername}
    />
  );
}

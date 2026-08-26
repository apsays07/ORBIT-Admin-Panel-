import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getMemberDetail } from "@/lib/member/actions";
import { MemberDetailView } from "@/components/member/member-detail-view";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Member Details",
};

interface MemberDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = await params;
  const data = await getMemberDetail(id);

  if (!data) {
    return (
      <div className="py-16 max-w-md mx-auto text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
          <AlertCircle className="h-6 w-6 text-rose-400" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-zinc-200">Member Not Found</h4>
          <p className="text-xs text-zinc-500">
            No syndicate member with ID <code className="font-mono text-zinc-400">{id}</code> exists in the database.
          </p>
        </div>
        <Link href="/ad/members">
          <Button size="sm" variant="outline" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Members
          </Button>
        </Link>
      </div>
    );
  }

  const plainData = JSON.parse(JSON.stringify(data));
  return <MemberDetailView data={plainData} />;
}

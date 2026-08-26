import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllotmentDetail } from "@/lib/allotment/actions";
import { AllotmentDetailView } from "@/components/allotment/allotment-detail-view";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Allotment Details",
};

interface AllotmentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AllotmentDetailPage({ params }: AllotmentDetailPageProps) {
  const { id } = await params;
  const data = await getAllotmentDetail(id);

  if (!data) {
    return (
      <div className="py-16 max-w-md mx-auto text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
          <AlertCircle className="h-6 w-6 text-rose-400" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-zinc-200">Allotment Record Not Found</h4>
          <p className="text-xs text-zinc-500">
            No application or allotment record with ID <code className="font-mono text-zinc-400">{id}</code> exists in the shared database.
          </p>
        </div>
        <Link href="/ad/allotment">
          <Button size="sm" variant="outline" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Allotment
          </Button>
        </Link>
      </div>
    );
  }

  return <AllotmentDetailView data={data} />;
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AllotmentDetailResponse } from "@/lib/allotment/actions";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  User,
  Building,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AllotmentDetailViewProps {
  data: AllotmentDetailResponse;
}

export function AllotmentDetailView({ data }: AllotmentDetailViewProps) {
  const { application, member, ipo } = data;
  const [copiedPan, setCopiedPan] = useState<string | null>(null);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedPan(text);
    setTimeout(() => setCopiedPan(null), 2000);
  }

  function getStatusBadge(status?: string) {
    const st = status || "AWAITING";
    if (st === "ALLOTTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Allotted
        </span>
      );
    }
    if (st === "NOT_ALLOTTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
          <XCircle className="h-3.5 w-3.5" />
          Not Allotted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="h-3.5 w-3.5" />
        Pending Allotment
      </span>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Link href="/ad/allotment">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Allotment
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold text-zinc-100 tracking-tight">
                {application.id}
              </h2>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {application.fundingStructure}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Allotment record for <strong className="text-zinc-200">{application.ipoName}</strong>
            </p>
          </div>
        </div>

        <div>
          {getStatusBadge(application.status || application.allotmentStatus)}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
            ALLOTMENT STATUS
          </span>
          <div className="text-2xl font-semibold text-zinc-100">
            {application.status === "ALLOTTED" ? "Allotted" : application.status === "NOT_ALLOTTED" ? "Not Allotted" : "Pending"}
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {application.allottedIndices?.length ? `${application.allottedIndices.length} Card(s) Allotted` : "No Cards Allotted"}
          </p>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
            LOTS & CAPITAL APPLIED
          </span>
          <div className="text-2xl font-semibold text-emerald-400 t-num">
            ₹{(application.totalContribution || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {application.numberOfPanCards || 1} Lot(s)
          </p>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
            APPLICANT MEMBER
          </span>
          <div className="text-2xl font-semibold text-zinc-100">
            {application.applicantName}
          </div>
          <p className="text-[12px] text-zinc-500 font-mono mt-0.5">
            ID: {application.memberId}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Applicant Profile */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <User className="h-4 w-4 text-zinc-400" />
              Applicant Profile
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Member record from Nexo members
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60">
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500">Name</span>
              <span className="font-semibold text-zinc-200">{member?.name || application.applicantName}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Username</span>
              <span className="text-zinc-200 font-mono">@{member?.username || application.applicantName.replace("@", "")}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Email</span>
              <span className="text-zinc-200">{member?.email || "—"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Phone</span>
              <span className="text-zinc-200">{member?.phone || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* IPO Specifications */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <Building className="h-4 w-4 text-zinc-400" />
              Offering Specifications
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              IPO metadata from Nexo ipos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60">
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500">IPO Name</span>
              <span className="font-semibold text-zinc-200">{ipo?.name || application.ipoName}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Category</span>
              <span className="text-zinc-200">{ipo?.category || "Mainboard"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Lot Size</span>
              <span className="text-zinc-200">{ipo?.metrics?.lotSize || 1}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Allotment Date</span>
              <span className="text-zinc-200">{ipo?.metrics?.allotmentDate || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PAN Numbers Attached */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/80">
          <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-zinc-400" />
            Applied PAN Cards ({application.panNumbers?.length || 0})
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            PAN records submitted for this application
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2.5 font-mono">
            {application.panNumbers && application.panNumbers.length > 0 ? (
              application.panNumbers.map((pan, idx) => {
                const isCardAllotted = application.allottedIndices?.includes(idx);

                return (
                  <div
                    key={pan}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs shadow-xs ${
                      isCardAllotted
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-200"
                    }`}
                  >
                    <span className="text-zinc-500 text-[10px] font-sans">PAN #{idx + 1}:</span>
                    <span className="font-semibold">{pan}</span>
                    {isCardAllotted && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans">
                        Allotted
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(pan)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy PAN"
                    >
                      {copiedPan === pan ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-zinc-500 font-sans">No PAN numbers attached.</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

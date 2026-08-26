"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApplicationDetailResponse } from "@/lib/application/actions";
import { ApplicationRecord } from "@/types/application";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Building,
  CreditCard,
  Users,
  Edit2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { formatCombinedApplicants } from "@/lib/utils";
import { EditApplicationModal } from "@/components/application/edit-application-modal";
import { DeleteApplicationModal } from "@/components/application/delete-application-modal";

interface ApplicationDetailViewProps {
  data: ApplicationDetailResponse;
}

export function ApplicationDetailView({ data }: ApplicationDetailViewProps) {
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationRecord>(data.application);
  const { member, ipo } = data;

  const [copiedPan, setCopiedPan] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedPan(text);
    setTimeout(() => setCopiedPan(null), 2000);
  }

  function handleUpdated(updatedApp: ApplicationRecord) {
    setApplication(updatedApp);
    router.refresh();
  }

  function handleDeleted() {
    router.push("/ad/applications");
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "AWAITING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" />
            Awaiting Allotment
          </span>
        );
      case "ALLOTTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Allotted
          </span>
        );
      case "NOT_ALLOTTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
            <XCircle className="h-3.5 w-3.5" />
            Not Allotted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Link href="/ad/applications">
            <Button
              variant="outline"
              size="sm"
              className="h-8.5 px-3 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Applications
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-zinc-100 tracking-tight font-mono">
                {application.id}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {application.fundingStructure}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Submitted for <strong className="text-zinc-200">{application.ipoName}</strong>
            </p>
          </div>
        </div>

        {/* Header Actions & Status */}
        <div className="flex items-center gap-2.5">
          {getStatusBadge(application.status || application.allotmentStatus || "AWAITING")}

          <Button
            type="button"
            onClick={() => setIsEditOpen(true)}
            variant="outline"
            size="sm"
            className="h-8.5 px-3 text-xs font-medium border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 rounded-xl cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>

          <Button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            variant="outline"
            size="sm"
            className="h-8.5 px-3 text-xs font-medium border-zinc-800 bg-zinc-900/80 hover:bg-rose-950/20 text-rose-400 hover:border-rose-500/40 rounded-xl cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800 rounded-2xl">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
              TOTAL CONTRIBUTION
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-semibold text-emerald-400 t-num font-sans">
              ₹{(application.totalContribution || 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
              {application.numberOfPanCards || 1} PAN Card(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 rounded-2xl">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
              APPLICANT(S)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-semibold text-zinc-100">
              {formatCombinedApplicants(application)}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              ID: {application.memberId}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 rounded-2xl">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
              SUBMITTED ON
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-lg font-semibold text-zinc-200">
              {application.createdAt ? new Date(application.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }) : "—"}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              {application.createdAt ? new Date(application.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linked Applicant Profile */}
        <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <MemberAvatar
                src={member?.avatar}
                name={member?.name || application.applicantName}
                className="h-10 w-10 rounded-xl border border-zinc-800 text-xs shrink-0"
              />
              <div>
                <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
                  Applicant Profile (Nexo Member)
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Resolved from Nexo members collection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60">
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500 font-sans">Member Name</span>
              <span className="font-semibold text-zinc-200 font-sans">{member?.name || application.applicantName}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Username</span>
              <span className="text-zinc-200">@{member?.username || application.applicantName.replace("@", "")}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Email</span>
              <span className="text-zinc-200">{member?.email || "—"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Phone</span>
              <span className="text-zinc-200">{member?.phone || "—"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Role / Status</span>
              <span className="text-zinc-200 font-sans">{member?.role || "MEMBER"} ({member?.status || "ACTIVE"})</span>
            </div>
          </CardContent>
        </Card>

        {/* Linked IPO Offering */}
        <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <Building className="h-4 w-4 text-zinc-400" />
              Target IPO Offering
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Resolved from Nexo ipos collection
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60">
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500 font-sans">IPO Name</span>
              <span className="font-semibold text-zinc-200 font-sans">{ipo?.name || application.ipoName}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Category</span>
              <span className="text-zinc-200 font-sans">{ipo?.category || "Mainboard"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Min Investment</span>
              <span className="text-zinc-200">₹{(ipo?.metrics?.minInvestment || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Lot Size</span>
              <span className="text-zinc-200">{ipo?.metrics?.lotSize || 1}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Bidding Closes</span>
              <span className="text-zinc-200 font-sans">{ipo?.metrics?.closeDate || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PAN Cards Associated */}
      <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
        <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-zinc-400" />
              Attached PAN Cards ({application.panNumbers?.length || 0})
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              PAN numbers utilized for this application bid
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2.5 font-mono">
            {application.panNumbers && application.panNumbers.length > 0 ? (
              application.panNumbers.map((pan, idx) => (
                <div
                  key={pan}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 shadow-xs"
                >
                  <span className="text-zinc-500 text-[10px] font-sans">PAN #{idx + 1}:</span>
                  <span className="font-semibold text-zinc-100">{pan}</span>
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
              ))
            ) : (
              <span className="text-xs text-zinc-500 font-sans">No PAN records attached.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Multi-Friend Split Contributors (if applicable) */}
      {application.contributors && application.contributors.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
          <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" />
                Funding Breakdown & Member Contributors
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Split contributions recorded for this multi-card pooled application
              </CardDescription>
            </div>
            <span className="text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 font-sans">
              {application.fundingStructure}
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-[13px] text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800 font-sans">
                <tr>
                  <th className="py-2.5 px-4">Contributor Member</th>
                  <th className="py-2.5 px-3 font-mono">Member ID</th>
                  <th className="py-2.5 px-3">Contribution</th>
                  <th className="py-2.5 px-4 text-right">Pool Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {application.contributors.map((c, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-zinc-200">
                      @{c.memberName}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 text-[11px]">
                      {c.memberId}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-100 font-semibold t-num">
                      ₹{c.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-4 text-right text-indigo-300 font-semibold t-num font-sans">
                      {c.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <EditApplicationModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          application={application}
          onUpdated={handleUpdated}
        />
      )}

      {/* Delete Modal */}
      {isDeleteOpen && (
        <DeleteApplicationModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          application={application}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

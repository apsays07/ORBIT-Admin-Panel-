"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ApplicationRecord } from "@/types/application";
import { quickUpdateApplicationStatus } from "@/lib/application/actions";
import { useToast } from "@/components/ui/toast";
import {
  X,
  User,
  Building,
  CreditCard,
  Calendar,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Edit2,
  Trash2,
  Users,
  Code2,
  Loader2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { cn, formatCombinedApplicants } from "@/lib/utils";

interface ApplicationDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationRecord | null;
  onEdit: (app: ApplicationRecord) => void;
  onDelete: (app: ApplicationRecord) => void;
  onStatusChanged: (updatedApp: ApplicationRecord) => void;
}

export function ApplicationDetailsDrawer({
  isOpen,
  onClose,
  application,
  onEdit,
  onDelete,
  onStatusChanged,
}: ApplicationDetailsDrawerProps) {
  const toast = useToast();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !application || !mounted) return null;

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast.success("Copied", `${label} copied to clipboard.`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      toast.error("Copy Failed", "Could not copy text.");
    }
  }

  async function handleStatusChange(
    newStatus: "AWAITING" | "ALLOTTED" | "NOT_ALLOTTED"
  ) {
    if (!application) return;
    setIsUpdatingStatus(true);
    try {
      const res = await quickUpdateApplicationStatus(application.id, newStatus);
      if (res.success) {
        const updated: ApplicationRecord = {
          ...application,
          status: newStatus,
          allotmentStatus: newStatus,
          updatedAt: new Date().toISOString(),
        };
        toast.success("Status Updated", `Application marked as ${newStatus.replace("_", " ")}.`);
        onStatusChanged(updated);
      } else {
        toast.error("Update Failed", res.error || "Could not update status.");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function getStatusBadge(status?: string) {
    switch (status) {
      case "ALLOTTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            ALLOTTED
          </span>
        );
      case "NOT_ALLOTTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            <XCircle className="h-3.5 w-3.5" />
            NOT ALLOTTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" />
            AWAITING ALLOTMENT
          </span>
        );
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 font-sans"
    >
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Centered Modal Dialog Panel */}
      <div className="relative w-full max-w-xl max-h-[88vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-zinc-800/80 flex items-start justify-between bg-zinc-900/60 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                APPLICATION DETAILS
              </span>
              <span className="text-xs font-mono text-zinc-500">{application.id}</span>
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              {formatCombinedApplicants(application)}
            </h2>
            <p className="text-xs text-zinc-400">
              Offering: <strong className="text-zinc-200">{application.ipoName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status & Quick Edit Action */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-zinc-400">Current Status</div>
              <div>{getStatusBadge(application.status || application.allotmentStatus)}</div>
            </div>

            {/* Quick Status Selector */}
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-zinc-400">Quick Change:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isUpdatingStatus || application.status === "AWAITING"}
                  onClick={() => handleStatusChange("AWAITING")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    application.status === "AWAITING"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                  )}
                >
                  Awaiting
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus || application.status === "ALLOTTED"}
                  onClick={() => handleStatusChange("ALLOTTED")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    application.status === "ALLOTTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                  )}
                >
                  Allotted
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus || application.status === "NOT_ALLOTTED"}
                  onClick={() => handleStatusChange("NOT_ALLOTTED")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    application.status === "NOT_ALLOTTED"
                      ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                  )}
                >
                  Not Allotted
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Applicant Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider font-sans flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              Applicant Profile
            </h3>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/60">
                <MemberAvatar
                  src={application.memberAvatar}
                  name={application.applicantName}
                  className="h-10 w-10 rounded-xl text-xs"
                />
                <div>
                  <div className="font-semibold text-zinc-100 text-sm">
                    {formatCombinedApplicants(application)}
                  </div>
                  <div className="text-zinc-400 font-mono text-[11px]">
                    ID: {application.memberId}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Funding Structure</span>
                  <span className="text-zinc-200 font-mono font-medium">
                    {application.fundingStructure}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Participating Users</span>
                  <span className="text-zinc-200 font-mono font-medium">
                    {application.contributors?.length || 1} Member(s)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Application Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider font-sans flex items-center gap-2">
              <Building className="h-4 w-4 text-indigo-400" />
              Application Details
            </h3>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Target IPO</span>
                <span className="font-semibold text-zinc-200">{application.ipoName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">IPO ID</span>
                <span className="font-mono text-zinc-400 text-[11px]">{application.ipoId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Capital Contribution</span>
                <span className="font-mono font-semibold text-emerald-400 text-sm t-num">
                  ₹{(application.totalContribution || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">PAN Cards Attached</span>
                <span className="font-mono text-zinc-200">{application.numberOfPanCards || application.panNumbers?.length || 1}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Submitted On</span>
                <span className="text-zinc-200">
                  {application.createdAt ? new Date(application.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "—"}
                </span>
              </div>
              {application.updatedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Last Updated</span>
                  <span className="text-zinc-400 text-[11px]">
                    {new Date(application.updatedAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Attached PAN Numbers */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider font-sans flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              Attached PAN Cards ({application.panNumbers?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {application.panNumbers && application.panNumbers.length > 0 ? (
                application.panNumbers.map((pan, idx) => (
                  <div
                    key={pan}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 shadow-xs"
                  >
                    <span className="text-zinc-500 text-[10px]">#{idx + 1}:</span>
                    <span className="font-semibold text-zinc-100">{pan}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(pan, `pan_${idx}`)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy PAN"
                    >
                      {copiedText === `pan_${idx}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-xs text-zinc-500">No PAN records attached.</span>
              )}
            </div>
          </div>

          {/* Section 4: Split Contributors (if multi-friend) */}
          {application.contributors && application.contributors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider font-sans flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                Split Contributors ({application.contributors.length})
              </h3>
              <div className="rounded-2xl border border-zinc-800/80 overflow-hidden">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/80 text-[11px] font-medium text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Member</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3 text-right">Share %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {application.contributors.map((c, i) => (
                      <tr key={i} className="hover:bg-zinc-900/40 font-mono">
                        <td className="py-2.5 px-3 font-sans text-zinc-200">@{c.memberName}</td>
                        <td className="py-2.5 px-3 text-zinc-100 font-semibold t-num">
                          ₹{c.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right text-indigo-300 font-semibold t-num">
                          {c.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Raw Record Metadata Toggle */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>{showRawJson ? "Hide Raw Database Attributes" : "Inspect Raw Database Attributes"}</span>
            </button>

            {showRawJson && (
              <pre className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(application, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onDelete(application)}
            className="h-9.5 px-4 text-xs font-medium border-zinc-800 bg-zinc-900 text-rose-400 hover:bg-rose-950/20 hover:border-rose-500/40 rounded-xl cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9.5 px-4 text-xs font-medium border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl cursor-pointer"
            >
              Close
            </Button>

            <Button
              type="button"
              onClick={() => {
                onClose();
                onEdit(application);
              }}
              className="h-9.5 px-4 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Application
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

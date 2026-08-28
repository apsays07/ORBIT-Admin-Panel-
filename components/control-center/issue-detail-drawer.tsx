"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  AlertTriangle,
  Coins,
  Layers,
  ArrowRightLeft,
  Building,
  User,
  CreditCard,
  FileSpreadsheet,
  Copy,
  Check,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlCenterIssue, ControlCenterIssueStatus } from "@/types/control-center";
import { updateControlCenterIssueStatus } from "@/lib/control-center/actions";
import { useToast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface IssueDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  issue: ControlCenterIssue | null;
  onOpenCompareRecords?: (issue: ControlCenterIssue) => void;
  onOpenMember360?: (memberId: string) => void;
  onOpenApplication360?: (applicationId: string) => void;
  onStatusUpdated?: (issueId: string, newStatus: ControlCenterIssueStatus) => void;
}

export function IssueDetailDrawer({
  isOpen,
  onClose,
  issue,
  onOpenCompareRecords,
  onOpenMember360,
  onOpenApplication360,
  onStatusUpdated,
}: IssueDetailDrawerProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ControlCenterIssueStatus>("OPEN");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (issue) {
      setCurrentStatus(issue.status);
    }
  }, [issue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !issue) return null;

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  async function handleSaveStatus(newStatus: ControlCenterIssueStatus) {
    if (!issue) return;
    setIsSaving(true);
    try {
      const res = await updateControlCenterIssueStatus({
        issueId: issue.id,
        status: newStatus,
        actionTaken: `Admin marked as ${newStatus}`,
        previousValue: issue.status,
        newValue: newStatus,
      });

      if (res.success) {
        setCurrentStatus(newStatus);
        toast.showToast(
          "success",
          "Issue Status Updated",
          newStatus === "KNOWN_EXCEPTION"
            ? "Marked as Known Exception"
            : `Marked as ${newStatus}`
        );
        if (onStatusUpdated) {
          onStatusUpdated(issue.id, newStatus);
        }
      } else {
        toast.showToast("error", "Update Failed", res.error || "Failed to update status");
      }
    } catch {
      toast.showToast("error", "Update Error", "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  }

  function renderPriorityPill(severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW") {
    if (severity === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
          CRITICAL PRIORITY
        </span>
      );
    }
    if (severity === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          HIGH PRIORITY
        </span>
      );
    }
    if (severity === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          MEDIUM PRIORITY
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        LOW PRIORITY
      </span>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150 cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-10">
        <div className="w-screen max-w-lg bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
          {/* 1. Header */}
          <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {renderPriorityPill(issue.severity)}
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                  {issue.type.replace(/_/g, " ")}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-100 mt-1">
                {issue.title}
              </h3>
              <p className="text-xs text-zinc-400">
                {issue.memberUsername ? `@${issue.memberUsername}` : issue.memberName || "Member"} • {issue.ipoName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 2. Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Financial Impact Banner */}
            {issue.affectedAmount ? (
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-400 uppercase font-mono tracking-wider block">
                    Financial Impact (Delta)
                  </span>
                  <span className="text-xl font-bold font-mono text-rose-300 mt-0.5 block">
                    ₹{formatNumber(issue.affectedAmount)}
                  </span>
                </div>
                {issue.affectedLots ? (
                  <span className="text-xs font-mono text-purple-300 bg-purple-950/40 px-2 py-1 rounded-md border border-purple-800/50">
                    {issue.affectedLots} Lots Affected
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* DETAILS (Expected vs Recorded vs Difference) */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2.5">
              <span className="text-[10.5px] font-bold text-zinc-400 uppercase font-mono tracking-wider block">
                Financial Breakdown
              </span>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Expected</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {typeof issue.expectedValue === "number" ? `₹${formatNumber(issue.expectedValue)}` : issue.expectedValue || "—"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Recorded</span>
                  <span className="font-mono font-bold text-rose-400">
                    {typeof issue.actualValue === "number" ? `₹${formatNumber(issue.actualValue)}` : issue.actualValue || "—"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Difference</span>
                  <span className="font-mono font-bold text-amber-400">
                    {issue.affectedAmount ? `₹${formatNumber(issue.affectedAmount)}` : issue.discrepancyDelta || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* WHY THIS WAS FLAGGED */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1.5">
              <span className="text-[10.5px] font-bold text-zinc-400 uppercase font-mono tracking-wider block">
                Why this was flagged
              </span>
              <p className="text-zinc-300 leading-relaxed font-sans">
                {issue.exactReason}
              </p>
              {issue.priorityReason && (
                <div className="text-[11px] font-mono text-purple-300/90 pt-1.5 border-t border-zinc-800/60">
                  <strong>Reason:</strong> {issue.priorityReason}
                </div>
              )}
            </div>

            {/* SOURCE RECORDS */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
              <span className="text-[10.5px] font-bold text-zinc-400 uppercase font-mono tracking-wider block">
                Source Records
              </span>

              <div className="space-y-1.5">
                {issue.applicationId && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-850">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" />
                      <span className="font-mono text-zinc-200">
                        Application #{issue.applicationId.slice(-6)}
                      </span>
                    </div>
                    {onOpenApplication360 && (
                      <button
                        type="button"
                        onClick={() => onOpenApplication360(issue.applicationId!)}
                        className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Diagnose 360°</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {issue.memberId && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-850">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-mono text-zinc-200">
                        {issue.memberUsername ? `@${issue.memberUsername}` : issue.memberName}
                      </span>
                    </div>
                    {onOpenMember360 && (
                      <button
                        type="button"
                        onClick={() => onOpenMember360(issue.memberId!)}
                        className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Member 360°</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {issue.pan && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-850">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-purple-400" />
                      <span className="font-mono text-zinc-200">{issue.pan}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(issue.pan!, "pan")}
                      className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{copiedKey === "pan" ? "Copied" : "Copy"}</span>
                      {copiedKey === "pan" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Sticky Bottom Action Bar */}
          <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {onOpenCompareRecords && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenCompareRecords(issue)}
                className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
                <span>Compare Records</span>
              </Button>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => handleSaveStatus("INVESTIGATING")}
                className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded-lg cursor-pointer"
              >
                Investigate
              </Button>

              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => handleSaveStatus("KNOWN_EXCEPTION")}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
              >
                Known Exception
              </Button>

              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => handleSaveStatus("RESOLVED")}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
              >
                Resolve
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

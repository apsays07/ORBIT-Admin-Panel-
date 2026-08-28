"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  FileSpreadsheet,
  Building,
  User,
  CreditCard,
  Coins,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Application360Data } from "@/types/control-center";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface Application360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationData: Application360Data | null;
  isLoading?: boolean;
}

export function Application360Modal({
  isOpen,
  onClose,
  applicationData,
  isLoading = false,
}: Application360ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  if (!mounted || !isOpen) return null;

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">
                  Application 360° View
                </h3>
                <span className="font-mono text-xs text-blue-400 font-semibold">
                  #{applicationData?.applicationId.slice(-6)}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                  DIAGNOSTIC
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {applicationData?.ipoName} • {applicationData?.applicantUsername ? `@${applicationData.applicantUsername}` : applicationData?.applicantName}
              </p>
            </div>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-zinc-500 font-mono animate-pulse">
              Running 5-point data consistency validation...
            </div>
          ) : !applicationData ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              Application record not found.
            </div>
          ) : (
            <>
              {/* 1. DATA CONSISTENCY CHECKLIST */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-purple-400" />
                    <span>Data Consistency Checklist</span>
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">5-POINT AUDIT</span>
                </div>

                <div className="space-y-2">
                  {applicationData.consistencyChecklist.map((check, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-2.5 rounded-lg border text-xs flex items-start justify-between gap-3",
                        check.status === "PASS"
                          ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                          : check.status === "WARN"
                          ? "bg-amber-950/20 border-amber-800/40 text-amber-300"
                          : "bg-rose-950/20 border-rose-800/40 text-rose-300"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {check.status === "PASS" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : check.status === "WARN" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold">{check.label}</span>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{check.message}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase font-bold shrink-0">
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Key Numbers & Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[10.5px] text-zinc-500 block">Declared Lots</span>
                  <span className="font-mono font-bold text-zinc-100 text-base">
                    {applicationData.numberOfPanCards} Lot(s)
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Structure: {applicationData.fundingStructure}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[10.5px] text-zinc-500 block">Total Contribution</span>
                  <span className="font-mono font-bold text-zinc-100 text-base">
                    ₹{formatNumber(applicationData.totalContribution)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Expected: ₹{formatNumber(applicationData.expectedContribution)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[10.5px] text-zinc-500 block">Allotted Lots</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {applicationData.allottedLots} Lot(s)
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Status: {applicationData.status}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[10.5px] text-zinc-500 block">Profit Allotted Lots</span>
                  <span className="font-mono font-bold text-purple-300 text-base">
                    {applicationData.profitLots} Lot(s)
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    {applicationData.realizedProfit ? `₹${formatNumber(applicationData.realizedProfit)} profit` : "No payout record"}
                  </span>
                </div>
              </div>

              {/* 3. Associated Genuine PAN Cards */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                  Attached Genuine PAN Cards ({applicationData.panNumbers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {applicationData.panNumbers.length === 0 ? (
                    <span className="text-xs text-rose-400">No genuine PAN cards attached.</span>
                  ) : (
                    applicationData.panNumbers.map((pan) => (
                      <button
                        key={pan}
                        type="button"
                        onClick={() => handleCopy(pan, pan)}
                        className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono font-semibold text-zinc-200 hover:text-purple-300 hover:border-purple-500/40 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{pan}</span>
                        {copiedKey === pan ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-zinc-500" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Active Issues Linked to Application */}
              {applicationData.relatedIssues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wider font-mono">
                    Related Discrepancies ({applicationData.relatedIssues.length})
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {applicationData.relatedIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 flex items-start justify-between gap-3"
                      >
                        <div>
                          <span className="font-semibold text-zinc-100">{issue.title}</span>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{issue.exactReason}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                          {issue.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <Link
            href={`/ad/applications?query=${applicationData?.applicationId || ""}`}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            <span>Open Application in Applications Manager</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

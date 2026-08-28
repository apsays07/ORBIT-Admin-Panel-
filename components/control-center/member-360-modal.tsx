"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  User,
  CreditCard,
  Building,
  Coins,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Copy,
  Check,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Member360Data } from "@/types/control-center";
import { formatCurrency, formatLots, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface Member360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberData: Member360Data | null;
  isLoading?: boolean;
}

export function Member360Modal({
  isOpen,
  onClose,
  memberData,
  isLoading = false,
}: Member360ModalProps) {
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
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">
                  {memberData?.name || "Member 360° Profile"}
                </h3>
                {memberData?.username && (
                  <span className="text-xs text-purple-300 font-mono font-medium">
                    @{memberData.username}
                  </span>
                )}
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  MEMBER 360°
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {memberData?.panFull || memberData?.panMasked || "No PAN on file"} • Role: {memberData?.role || "MEMBER"}
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
              Compiling comprehensive Member 360° dossier...
            </div>
          ) : !memberData ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              Member record not found.
            </div>
          ) : (
            <>
              {/* 1. Financial Snapshot Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[10.5px] text-zinc-500 block">Total Capital Deployed</span>
                  <span className="font-mono font-bold text-zinc-100 text-base">
                    ₹{formatNumber(memberData.totalCapitalDeployed)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Across {memberData.totalIposParticipated} IPOs
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[10.5px] text-zinc-500 block">Current Blocked Capital</span>
                  <span className="font-mono font-bold text-indigo-300 text-base">
                    ₹{formatNumber(memberData.currentBlockedCapital)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Active bidding funds
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[10.5px] text-zinc-500 block">Total Allotted Lots</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {memberData.totalAllottedLots} Lots
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Verified allotments
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[10.5px] text-zinc-500 block">Realized Profit</span>
                  <span className="font-mono font-bold text-emerald-300 text-base">
                    ₹{formatNumber(memberData.totalProfitRealized)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    Syndicate payouts
                  </span>
                </div>
              </div>

              {/* 2. Active Issues Alert (if any) */}
              {memberData.activeIssues.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                  <div className="flex items-center justify-between text-xs text-rose-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                      <span>{memberData.activeIssues.length} Active Issue{memberData.activeIssues.length === 1 ? "" : "s"} Requiring Action</span>
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {memberData.activeIssues.map((issue) => (
                      <div key={issue.id} className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-zinc-300">
                        <div>
                          <span className="font-semibold text-zinc-200">{issue.title}</span>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{issue.exactReason}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {issue.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. 7-Step Lifecycle Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                  Syndicate Application Lifecycle
                </h4>
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {memberData.lifecycleTimeline.map((step, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs space-y-1",
                          step.status === "COMPLETE"
                            ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                            : step.status === "CURRENT"
                            ? "bg-purple-950/25 border-purple-700/50 text-purple-200"
                            : step.status === "ALERT"
                            ? "bg-rose-950/20 border-rose-800/40 text-rose-300"
                            : "bg-zinc-950/60 border-zinc-800/60 text-zinc-500"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{step.title}</span>
                          <span className="text-[9.5px] font-mono uppercase">
                            {step.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Applications in Current IPO */}
              {memberData.currentIpoApplications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                    Applications in Active Offering ({memberData.currentIpoApplications.length})
                  </h4>
                  <div className="space-y-2">
                    {memberData.currentIpoApplications.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200">
                              {app.lots} Lot(s) • ₹{formatNumber(app.amount)}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500">
                              #{app.id.slice(-6)}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                              {app.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {app.panNumbers.map((pan) => (
                              <span
                                key={pan}
                                className="font-mono text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300"
                              >
                                {pan}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Link
                          href={`/ad/applications?query=${app.id}`}
                          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 shrink-0 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
                        >
                          <span>Open Form</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Historical Participation Log */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                  Historical Syndicate Offerings ({memberData.previousIpoHistory.length})
                </h4>
                {memberData.previousIpoHistory.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center text-xs text-zinc-500">
                    No previous IPO applications recorded.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-[10.5px] font-mono text-zinc-400 uppercase">
                          <th className="py-2 px-2.5">Offering</th>
                          <th className="py-2 px-2.5 text-right">Lots</th>
                          <th className="py-2 px-2.5 text-right">Contribution</th>
                          <th className="py-2 px-2.5">Allotment</th>
                          <th className="py-2 px-2.5 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {memberData.previousIpoHistory.map((h, i) => (
                          <tr key={i} className="hover:bg-zinc-800/30">
                            <td className="py-2 px-2.5 font-medium text-zinc-200">{h.ipoName}</td>
                            <td className="py-2 px-2.5 text-right font-mono text-zinc-300">{h.lots}</td>
                            <td className="py-2 px-2.5 text-right font-mono text-zinc-200">₹{formatNumber(h.amount)}</td>
                            <td className="py-2 px-2.5">
                              <span
                                className={cn(
                                  "px-1.5 py-0.2 rounded text-[10px] font-mono",
                                  h.isAllotted
                                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                    : "bg-zinc-800 text-zinc-400"
                                )}
                              >
                                {h.isAllotted ? "ALLOTTED" : "NOT ALLOTTED"}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-semibold text-emerald-400">
                              {h.profit ? `₹${formatNumber(h.profit)}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <Link
            href={`/ad/members/${memberData?.memberId || ""}`}
            className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
          >
            <span>Open Full Member Account Profile</span>
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

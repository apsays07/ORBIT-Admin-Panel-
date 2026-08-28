"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Scale,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  Layers,
  Building,
  User,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlCenterIssue } from "@/types/control-center";
import { formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface CompareRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: ControlCenterIssue | null;
}

export function CompareRecordsModal({
  isOpen,
  onClose,
  issue,
}: CompareRecordsModalProps) {
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

  if (!mounted || !isOpen || !issue) return null;

  const expectedLots = issue.type === "LOT_MISMATCH" ? issue.expectedValue : (issue.affectedLots || 1);
  const actualLots = issue.type === "LOT_MISMATCH" ? issue.actualValue : (issue.affectedLots || 1);
  const expectedAmount = issue.expectedValue || (issue.affectedAmount ? Number(issue.actualValue || 0) + Number(issue.affectedAmount) : 0);
  const actualAmount = issue.actualValue || 0;

  const isAmountDifferent = expectedAmount !== actualAmount;
  const isLotsDifferent = expectedLots !== actualLots;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                  Compare Operational Records
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  DIFF INSPECTOR
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {issue.ipoName} • {issue.memberUsername ? `@${issue.memberUsername}` : issue.memberName || "Member"}
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

        {/* Comparison Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary Alert */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
            <p className="font-semibold text-zinc-200">{issue.title}</p>
            <p className="text-zinc-400 text-[11.5px] mt-0.5">{issue.exactReason}</p>
          </div>

          {/* Side-by-Side Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left: Expected / Primary Record */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <span className="text-xs font-bold text-zinc-200 uppercase font-mono">
                  Application Formula / Expected
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  SOURCE A
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10.5px] text-zinc-500 block">Lots Declared</span>
                  <span className={cn("font-mono font-bold text-sm", isLotsDifferent ? "text-amber-400 font-semibold" : "text-zinc-200")}>
                    {expectedLots} Lot(s)
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-zinc-500 block">Expected Contribution</span>
                  <span className={cn("font-mono font-bold text-sm", isAmountDifferent ? "text-emerald-400 font-semibold" : "text-zinc-200")}>
                    {typeof expectedAmount === "number" ? `₹${formatNumber(expectedAmount)}` : expectedAmount}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-zinc-500 block">Status</span>
                  <span className="font-mono text-zinc-300">Verified / Registered</span>
                </div>
              </div>
            </div>

            {/* Right: Actual / Recorded Value */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <span className="text-xs font-bold text-rose-300 uppercase font-mono">
                  Recorded in Ledger
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  SOURCE B (ACTUAL)
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10.5px] text-zinc-500 block">Lots Recorded</span>
                  <span className={cn("font-mono font-bold text-sm", isLotsDifferent ? "text-rose-400 font-semibold" : "text-zinc-200")}>
                    {actualLots} Lot(s)
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-zinc-500 block">Recorded Contribution</span>
                  <span className={cn("font-mono font-bold text-sm", isAmountDifferent ? "text-rose-400 font-semibold" : "text-zinc-200")}>
                    {typeof actualAmount === "number" ? `₹${formatNumber(actualAmount)}` : actualAmount}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] text-zinc-500 block">Status</span>
                  <span className="font-mono text-zinc-300">{issue.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Difference Highlight Box */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
            <span className="text-xs font-bold text-rose-300 uppercase font-mono tracking-wider block">
              Field Differences (Mismatches)
            </span>

            <div className="space-y-1.5 text-xs">
              {isAmountDifferent && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 font-mono text-xs">
                  <span className="text-zinc-400">Capital Delta:</span>
                  <span className="font-bold text-rose-400">
                    Expected ₹{formatNumber(Number(expectedAmount))} ≠ Recorded ₹{formatNumber(Number(actualAmount))} (Diff: ₹{formatNumber(Number(issue.affectedAmount || Math.abs(Number(expectedAmount) - Number(actualAmount))) )})
                  </span>
                </div>
              )}

              {isLotsDifferent && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 font-mono text-xs">
                  <span className="text-zinc-400">Lot Count Delta:</span>
                  <span className="font-bold text-amber-400">
                    {expectedLots} lots ≠ {actualLots} lots (Diff: {issue.affectedLots || Math.abs(Number(expectedLots) - Number(actualLots))} lots)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/40 flex justify-end text-xs shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            Close Comparison
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

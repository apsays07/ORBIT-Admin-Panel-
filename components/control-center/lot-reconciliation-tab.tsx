"use client";

import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Search,
  Eye,
  Copy,
  Check,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LotReconciliationSummary,
  LotDiscrepancyItem,
  ControlCenterIssue,
} from "@/types/control-center";
import { formatLots, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface LotReconciliationTabProps {
  summary: LotReconciliationSummary;
  selectedIpoName: string;
  onExplainNumber: (metricKey: string) => void;
  onViewIssueDetails: (issue: ControlCenterIssue) => void;
}

export function LotReconciliationTab({
  summary,
  selectedIpoName,
  onExplainNumber,
  onViewIssueDetails,
}: LotReconciliationTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPan, setCopiedPan] = useState<string | null>(null);

  function handleCopyPan(pan: string) {
    navigator.clipboard.writeText(pan);
    setCopiedPan(pan);
    setTimeout(() => setCopiedPan(null), 1500);
  }

  const filteredDiscrepancies = summary.discrepancies.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.memberName.toLowerCase().includes(q) ||
      (item.memberUsername && item.memberUsername.toLowerCase().includes(q)) ||
      item.panNumbers.some((p) => p.toLowerCase().includes(q)) ||
      item.reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* 1. Comparison Matrix Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Application Lots */}
        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Application Lots</span>
            <button
              type="button"
              onClick={() => onExplainNumber("total_lots")}
              className="text-[9.5px] text-blue-400 hover:text-blue-300 font-mono inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-blue-500/10 border border-blue-500/20 cursor-pointer"
            >
              <span>Explain</span>
            </button>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-zinc-100">
            {summary.totalApplicationLots}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Declared across bids</span>
        </div>

        {/* Confirmed Lots */}
        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Confirmed Lots</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-indigo-300">
            {summary.totalConfirmedLots}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Submitted & active</span>
        </div>

        {/* Allotted Lots */}
        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Allotted Lots</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-emerald-400">
            {summary.totalAllottedLots}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Allotment confirmed</span>
        </div>

        {/* Profit Lots */}
        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Profit Lots</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-purple-300">
            {summary.totalProfitLots}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Calculated in payout</span>
        </div>

        {/* Sold Lots */}
        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Sold Lots</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-emerald-300">
            {summary.totalSoldLots}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Finalized & settled</span>
        </div>
      </div>

      {/* Discrepancy Banner */}
      {summary.discrepancies.length > 0 ? (
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 to-zinc-900/60 border border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-100">
                {summary.discrepancies.length} Lot Inconsistenc{summary.discrepancies.length === 1 ? "y" : "ies"} Detected
              </span>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Mismatches detected between declared application lot quantities, allotted lots, or profit distribution lots.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>All lot counts across applications, allotments, and profit distributions are perfectly synchronized for {selectedIpoName}.</span>
        </div>
      )}

      {/* Lot Discrepancy Table */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-5 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Lot Quantity Cross-Check
            </h4>
            <p className="text-xs text-zinc-400">
              Cross-section comparison for {selectedIpoName}
            </p>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member, PAN..."
              className="pl-8 pr-3 bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:ring-purple-500/30"
            />
          </div>
        </div>

        {filteredDiscrepancies.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            {summary.discrepancies.length === 0
              ? "No lot mismatches detected."
              : "No lot mismatches matching your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">PAN Card(s)</th>
                  <th className="py-2.5 px-3 text-right">Application Lots</th>
                  <th className="py-2.5 px-3 text-right">Allotted Lots</th>
                  <th className="py-2.5 px-3 text-right">Profit Lots</th>
                  <th className="py-2.5 px-3 text-right">Delta</th>
                  <th className="py-2.5 px-3">Discrepancy Reason</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredDiscrepancies.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-200">
                        {item.memberUsername ? `@${item.memberUsername}` : item.memberName}
                      </div>
                      {item.applicationId && (
                        <span className="text-[10px] font-mono text-zinc-500">
                          #{item.applicationId.slice(-6)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {item.panNumbers.length > 0 ? (
                          item.panNumbers.map((pan) => (
                            <button
                              key={pan}
                              type="button"
                              onClick={() => handleCopyPan(pan)}
                              className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-zinc-100 cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>{pan}</span>
                              {copiedPan === pan ? (
                                <Check className="h-2.5 w-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 text-zinc-500" />
                              )}
                            </button>
                          ))
                        ) : (
                          <span className="text-zinc-500 text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-zinc-300">
                      {item.applicationLots}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                      {item.allottedLots}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-purple-300">
                      {item.profitLots}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                      {item.discrepancyDelta}
                    </td>
                    <td className="py-3 px-3 text-zinc-400 max-w-[280px] truncate" title={item.reason}>
                      {item.reason}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onViewIssueDetails({
                            id: `issue_${item.id}`,
                            severity: "HIGH",
                            priorityReason: `Lot quantity mismatch of ${Math.abs(item.discrepancyDelta)} lot(s) across application, allotment, or profit payout stages.`,
                            type: "LOT_MISMATCH",
                            title: `Lot Mismatch: ${item.memberUsername ? `@${item.memberUsername}` : item.memberName}`,
                            exactReason: item.reason,
                            ipoId: item.ipoId,
                            ipoName: item.ipoName,
                            memberId: item.memberId,
                            memberName: item.memberName,
                            memberUsername: item.memberUsername,
                            pan: item.panNumbers[0],
                            applicationId: item.applicationId,
                            detectedAt: new Date().toISOString(),
                            status: "OPEN",
                            affectedLots: Math.abs(item.discrepancyDelta),
                            expectedValue: item.allottedLots,
                            actualValue: item.profitLots || item.applicationLots,
                            discrepancyDelta: item.discrepancyDelta,
                          })
                        }
                        className="h-7 px-2.5 text-[11px] bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/25 rounded-lg cursor-pointer"
                      >
                        <span>View</span>
                        <Eye className="h-3 w-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

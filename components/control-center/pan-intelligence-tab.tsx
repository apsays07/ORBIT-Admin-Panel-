"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Users,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Download,
  Building,
  User,
  History,
  ShieldAlert,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanIntelligenceSummary } from "@/types/control-center";
import { cn } from "@/lib/utils";

interface PanIntelligenceTabProps {
  summary: PanIntelligenceSummary;
  selectedIpoName: string;
  onOpenPanTimeline?: (pan: string) => void;
}

type PanFilter = "ALL" | "RECENT" | "2_PLUS" | "3_PLUS";

export function PanIntelligenceTab({
  summary,
  selectedIpoName,
  onOpenPanTimeline,
}: PanIntelligenceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<PanFilter>("ALL");
  const [copiedPan, setCopiedPan] = useState<string | null>(null);

  function handleCopyPan(pan: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(pan);
    setCopiedPan(pan);
    setTimeout(() => setCopiedPan(null), 1500);
  }

  // Filter Missing PANs
  const filteredMissingPans = useMemo(() => {
    let list = [...summary.missingGenuinePans];

    if (activeFilter === "RECENT") {
      list = list.filter((item) => item.appliedRecently);
    } else if (activeFilter === "2_PLUS") {
      list = list.filter((item) => item.previousIposCount >= 2);
    } else if (activeFilter === "3_PLUS") {
      list = list.filter((item) => item.previousIposCount >= 3);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        return (
          item.pan.toLowerCase().includes(q) ||
          item.memberName.toLowerCase().includes(q) ||
          (item.memberUsername && item.memberUsername.toLowerCase().includes(q)) ||
          item.lastIpoName.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [summary.missingGenuinePans, activeFilter, searchQuery]);

  // Export Missing PANs to CSV
  function handleExportMissingPans() {
    if (filteredMissingPans.length === 0) return;

    const headers = [
      "#",
      "PAN Card",
      "Member",
      "Member Username",
      "Previous IPOs Count",
      "Last Applied IPO",
      "Last Application Date",
      "Status in Current IPO",
    ];

    const rows = filteredMissingPans.map((item, index) => [
      String(index + 1),
      `"${item.pan}"`,
      `"${item.memberName.replace(/"/g, '""')}"`,
      item.memberUsername ? `"@${item.memberUsername}"` : '""',
      String(item.previousIposCount),
      `"${item.lastIpoName.replace(/"/g, '""')}"`,
      `"${item.lastApplicationDate}"`,
      '"Not Applied"',
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `control-center-missing-pans-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* 1. Top Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Historical Unique PANs</span>
            <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-200">
            {summary.totalHistoricalGenuinePans}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Excludes dummy XUSER...X</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Current Applicants</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
            {summary.currentApplicantsCount}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">{summary.historicalApplicantsReAppliedCount} re-applied • {summary.newApplicantsCount} new</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400 text-xs font-medium">
            <span>Missing in {selectedIpoName}</span>
            <History className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-purple-300">
            {summary.missingGenuinePansCount}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Prior syndicate applicants</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Multi-Member PANs</span>
            <Users className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div
            className={cn(
              "mt-2 text-xl font-bold font-mono",
              summary.multiMemberPanConflictsCount > 0 ? "text-amber-400" : "text-zinc-200"
            )}
          >
            {summary.multiMemberPanConflictsCount}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Possible shared duplicates</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Duplicate Applications</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div
            className={cn(
              "mt-2 text-xl font-bold font-mono",
              summary.duplicatePanApplicationsCount > 0 ? "text-rose-400" : "text-zinc-200"
            )}
          >
            {summary.duplicatePanApplicationsCount}
          </div>
          <span className="text-[10.5px] text-zinc-500 mt-1">Same PAN in same IPO</span>
        </div>
      </div>

      {/* Section 2: Multi-Member PAN Conflicts */}
      {summary.multiMemberConflicts.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/60 border border-amber-900/30 p-4 sm:p-5 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider font-mono">
            <AlertTriangle className="h-4 w-4" />
            <span>Possible Duplicate / Multi-Member Associations ({summary.multiMemberConflicts.length})</span>
          </div>
          <p className="text-xs text-zinc-400">
            The following genuine PAN cards are claimed by multiple distinct member accounts. They are flagged as possible duplicates for administrative review:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {summary.multiMemberConflicts.map((conflict) => (
              <div
                key={conflict.pan}
                className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/90 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-100 text-sm">{conflict.pan}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {conflict.classification}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onOpenPanTimeline && (
                      <button
                        type="button"
                        onClick={() => onOpenPanTimeline(conflict.pan)}
                        className="text-[10.5px] text-purple-400 hover:text-purple-300 font-mono inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 cursor-pointer"
                      >
                        <History className="h-3 w-3" />
                        <span>Timeline</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleCopyPan(conflict.pan, e)}
                      className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer inline-flex items-center gap-1"
                    >
                      {copiedPan === conflict.pan ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
                  {conflict.members.map((m) => (
                    <div
                      key={m.memberId}
                      className="flex items-center justify-between text-xs text-zinc-300"
                    >
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-zinc-500" />
                        <span className="font-medium">
                          {m.memberUsername ? `@${m.memberUsername}` : m.memberName}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {m.applicationCount} bid{m.applicationCount === 1 ? "" : "s"} • Last: {m.lastIpoName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Missing Genuine PANs in Current IPO with Filters */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-5 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Historical Applicants Not Applied in {selectedIpoName}
            </h4>
            <p className="text-xs text-zinc-400">
              Click &quot;Why is this PAN listed?&quot; to inspect full historical timeline (excludes dummy XUSER...X)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search missing PANs..."
                className="pl-8 pr-3 bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:ring-purple-500/30"
              />
            </div>

            {filteredMissingPans.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMissingPans}
                className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
                <span>Export CSV ({filteredMissingPans.length})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={cn(
              "px-3 py-1 rounded-lg border transition-all cursor-pointer",
              activeFilter === "ALL"
                ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
            )}
          >
            All ({summary.missingGenuinePans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("RECENT")}
            className={cn(
              "px-3 py-1 rounded-lg border transition-all cursor-pointer",
              activeFilter === "RECENT"
                ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
            )}
          >
            Applied Recently (Last 60 Days)
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("2_PLUS")}
            className={cn(
              "px-3 py-1 rounded-lg border transition-all cursor-pointer",
              activeFilter === "2_PLUS"
                ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
            )}
          >
            Applied in 2+ IPOs
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("3_PLUS")}
            className={cn(
              "px-3 py-1 rounded-lg border transition-all cursor-pointer",
              activeFilter === "3_PLUS"
                ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
            )}
          >
            Applied in 3+ IPOs
          </button>
        </div>

        {filteredMissingPans.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            {summary.missingGenuinePans.length === 0
              ? "All historical genuine PANs have participated in this IPO!"
              : "No missing PANs matching your filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">PAN Card</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 text-right">Previous IPOs</th>
                  <th className="py-2.5 px-3">Last Applied Offering</th>
                  <th className="py-2.5 px-3">Last Applied Date</th>
                  <th className="py-2.5 px-3 text-right">Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredMissingPans.map((item, idx) => (
                  <tr key={item.pan} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-zinc-600">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={(e) => handleCopyPan(item.pan, e)}
                        className="font-mono font-semibold text-zinc-100 hover:text-purple-300 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.pan}</span>
                        {copiedPan === item.pan ? (
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-2.5 w-2.5 text-zinc-500" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-zinc-200">
                        {item.memberUsername ? `@${item.memberUsername}` : item.memberName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-purple-300">
                      {item.previousIposCount} IPOs
                    </td>
                    <td className="py-3 px-3 text-zinc-300">{item.lastIpoName}</td>
                    <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                      {item.lastApplicationDate || "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onOpenPanTimeline && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenPanTimeline(item.pan)}
                          className="h-7 px-2.5 text-[11px] bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/25 rounded-lg cursor-pointer"
                        >
                          <HelpCircle className="h-3 w-3 mr-1" />
                          <span>Why Listed?</span>
                        </Button>
                      )}
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

"use client";

import React, { useState, useMemo } from "react";
import {
  detectIpoApplicantGap,
  filterAndSortGapApplicants,
  GapDetectionIpo,
  GapDetectionApplication,
  MissingApplicantPanItem,
  GapParticipationFilter,
  GapSortOption,
} from "@/lib/calculations";
import {
  Users,
  Search,
  ChevronDown,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Building,
  Layers,
  Sparkles,
  ArrowUpRight,
  Filter,
  X,
  Copy,
  Check,
  ShieldAlert,
  HelpCircle,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PreviousApplicantsGapViewProps {
  allIpos: GapDetectionIpo[];
  allApplications: GapDetectionApplication[];
  defaultSelectedIpoId?: string;
}

export function PreviousApplicantsGapView({
  allIpos = [],
  allApplications = [],
  defaultSelectedIpoId,
}: PreviousApplicantsGapViewProps) {
  // Current Target IPO State
  const [selectedIpoId, setSelectedIpoId] = useState<string>(() => {
    if (defaultSelectedIpoId) return defaultSelectedIpoId;
    const openIpo = allIpos.find((i) => i.status === "APPLICATION_OPEN" || i.status === "OPEN");
    return openIpo ? openIpo.id : allIpos[0]?.id || "";
  });

  // Controls State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<GapParticipationFilter>("ALL");
  const [sortOption, setSortOption] = useState<GapSortOption>("most_previous");

  // Detail Modal / Drawer State
  const [selectedPanItem, setSelectedPanItem] = useState<MissingApplicantPanItem | null>(null);
  const [copiedPan, setCopiedPan] = useState<string | null>(null);

  // 1. Authoritative Gap Calculation
  const gapResult = useMemo(() => {
    return detectIpoApplicantGap({
      allIpos,
      allApplications,
      selectedCurrentIpoId: selectedIpoId,
    });
  }, [allIpos, allApplications, selectedIpoId]);

  const {
    isCurrentIpoSelected,
    selectedIpoName,
    totalHistoricalIposConsidered,
    historicalUniquePansCount,
    currentIpoApplicantsCount,
    previousPansAppliedToCurrentCount,
    missingPansCount,
    missingApplicants,
    availableIpos,
  } = gapResult;

  // 2. Filtered and Sorted Missing Applicants List
  const filteredApplicants = useMemo(() => {
    return filterAndSortGapApplicants({
      items: missingApplicants,
      filter: activeFilter,
      searchQuery,
      sortOption,
    });
  }, [missingApplicants, activeFilter, searchQuery, sortOption]);

  // Copy PAN helper
  function handleCopyPan(pan: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(pan);
    setCopiedPan(pan);
    setTimeout(() => setCopiedPan(null), 1800);
  }

  // Export to CSV
  function handleExportCsv() {
    if (filteredApplicants.length === 0) return;

    const headers = [
      "#",
      "PAN Card",
      "Member",
      "Member Username",
      "Previous IPOs Count",
      "Total Applications",
      "Last Applied IPO",
      "Last Application Date",
      "Priority",
      "Status in Current IPO",
    ];

    const rows = filteredApplicants.map((item, index) => [
      String(index + 1),
      `"${item.pan}"`,
      `"${item.memberName.replace(/"/g, '""')}"`,
      item.memberUsername ? `"@${item.memberUsername}"` : '""',
      String(item.previousIpoCount),
      String(item.totalApplicationsCount),
      `"${item.lastAppliedIpoName.replace(/"/g, '""')}"`,
      `"${item.formattedLastDate}"`,
      `"${item.priority}"`,
      '"Not Applied"',
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeIpoName = (selectedIpoName || "IPO").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.setAttribute("href", url);
    link.setAttribute("download", `missing-pan-applicants-${safeIpoName}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Priority Badge Renderer
  function renderPriorityBadge(priority: "HIGH" | "MEDIUM" | "LOW") {
    if (priority === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          HIGH
        </span>
      );
    }
    if (priority === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
        LOW
      </span>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Section Container Card */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-5 backdrop-blur-md shadow-xs space-y-4">
        {/* Header Strip & Current IPO Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800/70">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-100 tracking-tight">
                Previous Applicants Not Applied in Current IPO
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                GAP DETECTOR
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Automatically identify historical PAN cards that participated in previous offerings but have not yet applied for the selected IPO.
            </p>
          </div>

          {/* Current IPO Selector */}
          <div className="flex items-center gap-2 self-start lg:self-auto bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800/90 shadow-2xs">
            <div className="flex items-center gap-1.5 px-2 text-xs text-zinc-400 font-medium shrink-0">
              <Building className="h-3.5 w-3.5 text-indigo-400" />
              <span>Current IPO:</span>
            </div>
            <div className="relative">
              <select
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                className="h-9 rounded-lg border border-zinc-700/80 bg-zinc-900 pl-3 pr-8 text-xs font-semibold text-zinc-100 hover:border-zinc-600 focus:outline-hidden transition-all appearance-none cursor-pointer shadow-xs max-w-[240px] truncate"
              >
                {availableIpos.length === 0 && <option value="">No IPOs Available</option>}
                {availableIpos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id} className="bg-zinc-900 text-zinc-100">
                    {ipo.name} {ipo.status === "APPLICATION_OPEN" || ipo.status === "OPEN" ? "• Active" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Dynamic KPI Strip & Reconciliation Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Main Primary KPI: Missing Applicants */}
          <div className="rounded-xl bg-gradient-to-br from-purple-950/25 to-zinc-900/60 border border-purple-900/30 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-purple-300 text-xs font-medium">
              <span>Previous Applicants Not Applied</span>
              <AlertTriangle className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-100 font-mono">
                {missingPansCount}
              </span>
              <span className="text-xs text-purple-300 font-medium">
                {missingPansCount === 1 ? "PAN missing" : "PANs missing"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1.5">
              <span>Across {totalHistoricalIposConsidered} previous {totalHistoricalIposConsidered === 1 ? "offering" : "offerings"}</span>
            </p>
          </div>

          {/* Reconciliation Metric 1: Historical Unique PANs */}
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-zinc-400 text-xs font-medium">
              <span>Historical Unique PANs</span>
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-200 font-mono tracking-tight">
              {historicalUniquePansCount}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Distinct PANs used in prior IPOs
            </p>
          </div>

          {/* Reconciliation Metric 2: Current IPO Applicants */}
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-emerald-400 text-xs font-medium">
              <span>Current IPO Applicants</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono tracking-tight">
              {currentIpoApplicantsCount}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              {previousPansAppliedToCurrentCount} re-applied from history · {currentIpoApplicantsCount - previousPansAppliedToCurrentCount} new
            </p>
          </div>
        </div>

        {/* Dynamic Contextual Message Banner */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300">
          <div className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
          <p className="leading-normal">
            {missingPansCount > 0 ? (
              <>
                <strong className="text-zinc-100 font-semibold">{missingPansCount} historical {missingPansCount === 1 ? "PAN" : "PANs"}</strong> have not yet been used for <strong className="text-purple-300 font-semibold">{selectedIpoName || "this IPO"}</strong>.
              </>
            ) : (
              <>
                All historical PANs are currently represented in <strong className="text-emerald-300 font-semibold">{selectedIpoName || "this IPO"}</strong>.
              </>
            )}
          </p>
        </div>

        {/* Filter, Search, Sort & Export Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search missing PANs by PAN, member, or previous IPO..."
              className="pl-9 pr-8 bg-zinc-950 border-zinc-800 text-xs h-9 text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-purple-500/30 focus-visible:border-purple-500/50 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Participation Filter Pills */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-2xs">
              {[
                { label: "All", value: "ALL" },
                { label: "Applied recently", value: "RECENT" },
                { label: "Applied 2+ IPOs", value: "2_PLUS" },
                { label: "Applied 3+ IPOs", value: "3_PLUS" },
              ].map((f) => {
                const isActive = activeFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setActiveFilter(f.value as GapParticipationFilter)}
                    className={cn(
                      "px-2.5 py-1 text-[11.5px] font-medium rounded-lg transition-all cursor-pointer select-none",
                      isActive
                        ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs border border-zinc-700/60"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as GapSortOption)}
                className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 pl-3 pr-8 text-[11.5px] font-medium text-zinc-300 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-2xs"
              >
                <option value="most_previous" className="bg-zinc-900 text-zinc-200">Sort: Most Previous IPOs</option>
                <option value="most_recent" className="bg-zinc-900 text-zinc-200">Sort: Most Recent Application</option>
                <option value="pan_asc" className="bg-zinc-900 text-zinc-200">Sort: PAN (A-Z)</option>
                <option value="member_asc" className="bg-zinc-900 text-zinc-200">Sort: Member (A-Z)</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredApplicants.length === 0}
              className="h-9 px-3 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-xl gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40"
              title="Export missing applicants to CSV"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" />
              <span>Export ({filteredApplicants.length})</span>
            </Button>
          </div>
        </div>

        {/* Main Applicants Table / Empty State */}
        {!isCurrentIpoSelected ? (
          <div className="p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-xl">
            <Building className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-zinc-300">No Current IPO Selected</h4>
            <p className="text-xs text-zinc-500 mt-1">
              Select an active offering from the dropdown above to calculate missing applicants.
            </p>
          </div>
        ) : totalHistoricalIposConsidered === 0 ? (
          <div className="p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-xl">
            <Clock className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-zinc-300">No Previous Applicant History</h4>
            <p className="text-xs text-zinc-500 mt-1">
              Historical IPO participation will appear here once previous IPO applications are available.
            </p>
          </div>
        ) : missingPansCount === 0 ? (
          <div className="p-8 text-center bg-zinc-950/40 border border-emerald-900/30 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200">Everyone is Accounted For</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              All previous IPO applicant PANs have successfully applied to <strong className="text-zinc-200">{selectedIpoName}</strong>.
            </p>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-xl">
            <Search className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-zinc-300">No Matching Applicants Found</h4>
            <p className="text-xs text-zinc-500 mt-1">
              Try clearing your search query or selecting &quot;All&quot; participation filter.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-zinc-800/90 bg-zinc-900/80 text-zinc-400 font-semibold text-[11px] tracking-wider uppercase">
                    <th className="py-3 px-3.5 w-12 text-center font-mono">#</th>
                    <th className="py-3 px-3.5">PAN Card</th>
                    <th className="py-3 px-3.5">Member</th>
                    <th className="py-3 px-3.5 text-center">Previous IPOs</th>
                    <th className="py-3 px-3.5">Last Applied IPO</th>
                    <th className="py-3 px-3.5">Last Application Date</th>
                    <th className="py-3 px-3.5 text-center">Priority</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-normal">
                  {filteredApplicants.map((item, index) => {
                    const rowNumber = String(index + 1).padStart(2, "0");
                    const isCopied = copiedPan === item.pan;

                    return (
                      <tr
                        key={item.pan}
                        onClick={() => setSelectedPanItem(item)}
                        className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      >
                        {/* # Index */}
                        <td className="py-3 px-3.5 text-center text-zinc-500 font-mono text-[11px]">
                          {rowNumber}
                        </td>

                        {/* PAN Card */}
                        <td className="py-3 px-3.5 font-mono font-semibold text-zinc-100 tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-200">
                              {item.pan}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyPan(item.pan, e)}
                              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy PAN"
                            >
                              {isCopied ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Member */}
                        <td className="py-3 px-3.5">
                          <div className="font-medium text-zinc-200">
                            {item.displayMember}
                          </div>
                          {item.memberName && item.memberName !== item.displayMember && (
                            <div className="text-[10.5px] text-zinc-500 truncate max-w-[150px]">
                              {item.memberName}
                            </div>
                          )}
                        </td>

                        {/* Previous IPOs Count */}
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-zinc-900 text-purple-300 border border-purple-500/20">
                            {item.previousIpoCount} {item.previousIpoCount === 1 ? "IPO" : "IPOs"}
                          </span>
                        </td>

                        {/* Last Applied IPO */}
                        <td className="py-3 px-3.5 text-zinc-300 font-medium">
                          {item.lastAppliedIpoName}
                        </td>

                        {/* Last Application Date */}
                        <td className="py-3 px-3.5 text-zinc-400 font-mono text-[11.5px]">
                          {item.formattedLastDate}
                        </td>

                        {/* Priority Badge */}
                        <td className="py-3 px-3.5 text-center">
                          {renderPriorityBadge(item.priority)}
                        </td>

                        {/* Action Details */}
                        <td className="py-3 px-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPanItem(item);
                            }}
                            className="h-7 px-2.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Count */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
              <div>
                Showing <strong className="text-zinc-200">{filteredApplicants.length}</strong> of <strong className="text-zinc-200">{missingPansCount}</strong> missing applicants
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                Reconciliation status: Verified ({historicalUniquePansCount} historical − {previousPansAppliedToCurrentCount} re-applied = {missingPansCount} missing)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PAN Detail Drawer / Modal */}
      {selectedPanItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 shrink-0" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-start justify-between gap-3 bg-zinc-900/50 shrink-0">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">
                  APPLICANT PROFILE
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-lg font-bold text-zinc-100 font-mono tracking-wider">
                    {selectedPanItem.pan}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopyPan(selectedPanItem.pan)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Copy PAN"
                  >
                    {copiedPan === selectedPanItem.pan ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {renderPriorityBadge(selectedPanItem.priority)}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Member: <span className="font-semibold text-zinc-200">{selectedPanItem.displayMember}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPanItem(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Current IPO Target Status Card */}
              <div className="rounded-xl bg-purple-950/20 border border-purple-900/30 p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-purple-400 font-mono tracking-wider">
                    CURRENT IPO
                  </span>
                  <div className="text-sm font-semibold text-zinc-100">
                    {selectedIpoName}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Not Applied
                </span>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3">
                  <span className="text-[10.5px] text-zinc-500 font-medium block">
                    Previous IPO Applications
                  </span>
                  <span className="text-base font-bold text-zinc-100 font-mono mt-1 block">
                    {selectedPanItem.previousIpoCount} {selectedPanItem.previousIpoCount === 1 ? "IPO" : "IPOs"}
                  </span>
                  <span className="text-[10.5px] text-zinc-500">
                    {selectedPanItem.totalApplicationsCount} filings
                  </span>
                </div>

                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3">
                  <span className="text-[10.5px] text-zinc-500 font-medium block">
                    Last Applied Date
                  </span>
                  <span className="text-sm font-bold text-zinc-100 font-mono mt-1 block">
                    {selectedPanItem.formattedLastDate}
                  </span>
                  <span className="text-[10.5px] text-zinc-500 truncate block">
                    {selectedPanItem.lastAppliedIpoName}
                  </span>
                </div>
              </div>

              {/* Historical Participation Timeline */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                    Historical Participation Records ({selectedPanItem.participationHistory.length})
                  </h4>
                  <span className="text-[10.5px] text-zinc-500">
                    Chronological order
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedPanItem.participationHistory.map((rec, i) => {
                    const isAllotted = rec.isAllotted || rec.status === "ALLOTTED";

                    return (
                      <div
                        key={rec.ipoId + i}
                        className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-zinc-200 text-xs">
                            {rec.ipoName}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                            <Calendar className="h-3 w-3 text-zinc-500" />
                            <span>{formatDisplayDate(rec.applicationDate)}</span>
                            {rec.category && (
                              <span className="text-zinc-600">• {rec.category}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isAllotted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              Allotted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                              <Clock className="h-3 w-3 text-zinc-400" />
                              Applied
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPanItem(null)}
                className="h-8 px-4 text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  Search,
  Download,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  X,
  Building,
  User,
  CreditCard,
  Layers,
  Coins,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ControlCenterIssue,
  ControlCenterSeverity,
  ControlCenterIssueStatus,
  ImpactSummary,
} from "@/types/control-center";
import { performBulkIssueAction } from "@/lib/control-center/actions";
import { useToast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface IssuesCenterTabProps {
  issues: ControlCenterIssue[];
  impactSummary: ImpactSummary;
  selectedIpoName: string;
  onViewIssueDetails: (issue: ControlCenterIssue) => void;
  onOpenMember360: (memberId: string) => void;
  onOpenApplication360: (applicationId: string) => void;
  onStatusUpdated?: (issueId: string, newStatus: ControlCenterIssueStatus) => void;
}

type QuickFilterChip = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "CAPITAL" | "LOTS" | "OPEN" | "KNOWN_EXCEPTION" | "RESOLVED";

export function IssuesCenterTab({
  issues,
  impactSummary,
  selectedIpoName,
  onViewIssueDetails,
  onOpenMember360,
  onOpenApplication360,
  onStatusUpdated,
}: IssuesCenterTabProps) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<QuickFilterChip>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ControlCenterIssueStatus>("ALL");

  // Multi-select for bulk actions
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.type)));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Quick Chip filter
      if (activeChip === "CRITICAL" && issue.severity !== "CRITICAL") return false;
      if (activeChip === "HIGH" && issue.severity !== "HIGH") return false;
      if (activeChip === "MEDIUM" && issue.severity !== "MEDIUM") return false;
      if (activeChip === "CAPITAL" && issue.type !== "CAPITAL_MISMATCH") return false;
      if (activeChip === "LOTS" && issue.type !== "LOT_MISMATCH") return false;
      if (activeChip === "OPEN" && (issue.status !== "OPEN" && issue.status !== "INVESTIGATING")) return false;
      if (activeChip === "KNOWN_EXCEPTION" && issue.status !== "KNOWN_EXCEPTION") return false;
      if (activeChip === "RESOLVED" && issue.status !== "RESOLVED") return false;

      // 2. Dropdown Status & Type filters
      if (statusFilter !== "ALL" && issue.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && issue.type !== typeFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = issue.title.toLowerCase().includes(q);
        const matchesReason = issue.exactReason.toLowerCase().includes(q);
        const matchesMember =
          (issue.memberName && issue.memberName.toLowerCase().includes(q)) ||
          (issue.memberUsername && issue.memberUsername.toLowerCase().includes(q));
        const matchesPan = issue.pan && issue.pan.toLowerCase().includes(q);
        const matchesIpo = issue.ipoName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesReason && !matchesMember && !matchesPan && !matchesIpo) {
          return false;
        }
      }

      return true;
    });
  }, [issues, activeChip, statusFilter, typeFilter, searchQuery]);

  function handleClearAllFilters() {
    setActiveChip("ALL");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setSearchQuery("");
  }

  function handleToggleSelect(issueId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedIssueIds((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]
    );
  }

  function handleSelectAll() {
    if (selectedIssueIds.length === filteredIssues.length) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(filteredIssues.map((i) => i.id));
    }
  }

  async function handleBulkAction(status: ControlCenterIssueStatus) {
    if (selectedIssueIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await performBulkIssueAction({
        issueIds: selectedIssueIds,
        status,
      });
      if (res.success) {
        toast.showToast("success", "Bulk Action Complete", `Marked ${selectedIssueIds.length} issues as ${status}`);
        setSelectedIssueIds([]);
        if (onStatusUpdated) {
          selectedIssueIds.forEach((id) => onStatusUpdated(id, status));
        }
      } else {
        toast.showToast("error", "Bulk Action Failed", res.error || "Failed to update issues");
      }
    } catch {
      toast.showToast("error", "Bulk Action Error", "Failed to perform bulk update");
    } finally {
      setIsBulkOperating(false);
    }
  }

  // Export filtered issues to CSV
  function handleExportCsv() {
    if (filteredIssues.length === 0) return;

    const headers = [
      "Issue ID",
      "Severity",
      "Priority Reason",
      "Type",
      "Title",
      "Exact Reason",
      "Offering",
      "Member",
      "PAN Card",
      "Impact Amount",
      "Affected Lots",
      "Status",
      "Detected At",
    ];

    const rows = filteredIssues.map((issue) => [
      `"${issue.id}"`,
      `"${issue.severity}"`,
      `"${(issue.priorityReason || "").replace(/"/g, '""')}"`,
      `"${issue.type}"`,
      `"${issue.title.replace(/"/g, '""')}"`,
      `"${issue.exactReason.replace(/"/g, '""')}"`,
      `"${issue.ipoName.replace(/"/g, '""')}"`,
      issue.memberUsername ? `"@${issue.memberUsername}"` : `"${issue.memberName || ""}"`,
      issue.pan ? `"${issue.pan}"` : '""',
      issue.affectedAmount ? String(issue.affectedAmount) : "0",
      issue.affectedLots ? String(issue.affectedLots) : "0",
      `"${issue.status}"`,
      `"${issue.detectedAt}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `control-center-issues-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function renderPriorityPill(severity: ControlCenterSeverity) {
    if (severity === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
          CRITICAL
        </span>
      );
    }
    if (severity === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          HIGH
        </span>
      );
    }
    if (severity === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold font-mono text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        LOW
      </span>
    );
  }

  function renderStatusPill(status: ControlCenterIssueStatus) {
    switch (status) {
      case "OPEN":
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20">Open</span>;
      case "INVESTIGATING":
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20">Investigating</span>;
      case "KNOWN_EXCEPTION":
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">Exception</span>;
      case "RESOLVED":
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">Resolved</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-zinc-400 bg-zinc-800 border border-zinc-700">Ignored</span>;
    }
  }

  return (
    <div className="space-y-3">
      {/* 1. Filter Toolbar & Compact Chips Bar */}
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-3.5 space-y-3">
        {/* Top Controls: Search + Dropdowns + Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/70">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues, members, PAN..."
                className="pl-8 pr-3 bg-zinc-950 border-zinc-800 text-xs h-7.5 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:ring-purple-500/30"
              />
            </div>

            {(activeChip !== "ALL" || statusFilter !== "ALL" || typeFilter !== "ALL" || searchQuery) && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 underline whitespace-nowrap cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {availableTypes.length > 1 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-7.5 px-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-[11px] font-medium text-zinc-300 cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-7.5 text-xs bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg cursor-pointer"
            >
              <Download className="h-3 w-3 mr-1 text-purple-400" />
              <span>Export CSV ({filteredIssues.length})</span>
            </Button>
          </div>
        </div>

        {/* Compact Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button
            type="button"
            onClick={() => setActiveChip("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap",
              activeChip === "ALL"
                ? "bg-zinc-100 text-zinc-900 font-semibold"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
            )}
          >
            All ({issues.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveChip("CRITICAL")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1",
              activeChip === "CRITICAL"
                ? "bg-rose-500 text-white font-semibold"
                : "bg-zinc-950 text-rose-400 border border-zinc-800 hover:bg-zinc-850"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span>Critical ({impactSummary.criticalIssuesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChip("HIGH")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1",
              activeChip === "HIGH"
                ? "bg-amber-500 text-zinc-950 font-semibold"
                : "bg-zinc-950 text-amber-400 border border-zinc-800 hover:bg-zinc-850"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>High ({impactSummary.highIssuesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChip("CAPITAL")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap",
              activeChip === "CAPITAL"
                ? "bg-purple-500 text-white font-semibold"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
            )}
          >
            Capital Mismatches
          </button>

          <button
            type="button"
            onClick={() => setActiveChip("LOTS")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap",
              activeChip === "LOTS"
                ? "bg-indigo-500 text-white font-semibold"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
            )}
          >
            Lot Mismatches
          </button>

          <button
            type="button"
            onClick={() => setActiveChip("KNOWN_EXCEPTION")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1",
              activeChip === "KNOWN_EXCEPTION"
                ? "bg-indigo-600 text-white font-semibold"
                : "bg-zinc-950 text-indigo-400 border border-zinc-800 hover:bg-zinc-850"
            )}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Exceptions ({impactSummary.knownExceptionsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChip("RESOLVED")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ml-auto",
              activeChip === "RESOLVED"
                ? "bg-emerald-500 text-white font-semibold"
                : "bg-zinc-950 text-emerald-400 border border-zinc-800 hover:bg-zinc-850"
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Resolved ({impactSummary.resolvedIssuesCount})</span>
          </button>
        </div>
      </div>

      {/* 2. Bulk Action Sticky Bar (When Selected) */}
      {selectedIssueIds.length > 0 && (
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-purple-200">
            {selectedIssueIds.length} Issue{selectedIssueIds.length === 1 ? "" : "s"} Selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isBulkOperating}
              onClick={() => handleBulkAction("RESOLVED")}
              className="h-6.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-md cursor-pointer"
            >
              Resolve
            </Button>
            <Button
              size="sm"
              disabled={isBulkOperating}
              onClick={() => handleBulkAction("KNOWN_EXCEPTION")}
              className="h-6.5 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-md cursor-pointer"
            >
              Known Exception
            </Button>
            <Button
              size="sm"
              disabled={isBulkOperating}
              onClick={() => handleBulkAction("IGNORED")}
              className="h-6.5 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md cursor-pointer"
            >
              Ignore
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIssueIds([])}
              className="h-6.5 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* 3. High-Density All Issues Table */}
      <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden shadow-2xs">
        {filteredIssues.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            {issues.length === 0
              ? "✓ ALL CLEAR — No operational issues detected."
              : "No issues match your active filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[10.5px] font-mono text-zinc-400 uppercase bg-zinc-950/60">
                  <th className="py-2.5 px-3 w-8">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-zinc-500 hover:text-zinc-300 cursor-pointer block"
                    >
                      {selectedIssueIds.length === filteredIssues.length && filteredIssues.length > 0 ? (
                        <CheckSquare className="h-3.5 w-3.5 text-purple-400" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Issue Diagnosis</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Offering</th>
                  <th className="py-2.5 px-3 text-right">Impact</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 font-mono text-zinc-500">Detected</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => onViewIssueDetails(issue)}
                    className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3" onClick={(e) => handleToggleSelect(issue.id, e)}>
                      <button type="button" className="text-zinc-500 group-hover:text-zinc-300 cursor-pointer block">
                        {selectedIssueIds.includes(issue.id) ? (
                          <CheckSquare className="h-3.5 w-3.5 text-purple-400" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {renderPriorityPill(issue.severity)}
                    </td>

                    <td className="py-2.5 px-3 max-w-[280px]">
                      <span className="font-semibold text-zinc-100 block truncate group-hover:text-purple-300 transition-colors">
                        {issue.title}
                      </span>
                      <span className="text-[11px] text-zinc-500 block truncate font-mono mt-0.5">
                        {issue.exactReason}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-medium text-zinc-300">
                        {issue.memberUsername ? `@${issue.memberUsername}` : issue.memberName || "—"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                      {issue.ipoName}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                      {issue.affectedAmount ? (
                        <span className="font-bold text-rose-400">
                          ₹{formatNumber(issue.affectedAmount)}
                        </span>
                      ) : issue.affectedLots ? (
                        <span className="text-purple-300 font-medium">
                          {issue.affectedLots} lots
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {renderStatusPill(issue.status)}
                    </td>

                    <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(issue.detectedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span className="text-[11px] text-purple-400 group-hover:text-purple-300 font-medium inline-flex items-center gap-0.5">
                        <span>View</span>
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
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

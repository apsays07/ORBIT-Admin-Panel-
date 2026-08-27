"use client";

import React, { useState, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuditRecord, AuditMetricsSummary } from "@/types/audit";
import {
  Activity,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Info,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivityManagementViewProps {
  initialActivities: AuditRecord[];
  total: number;
  currentPage: number;
  totalPages: number;
  metrics: AuditMetricsSummary;
  availableEventTypes: string[];
  availableCategories: string[];
  availableSeverities: string[];
}

export function ActivityManagementView({
  initialActivities,
  total,
  currentPage,
  totalPages,
  metrics,
  availableEventTypes,
  availableCategories,
  availableSeverities,
}: ActivityManagementViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedEventType, setSelectedEventType] = useState(searchParams.get("eventType") || "ALL");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "ALL");
  const [selectedSeverity, setSelectedSeverity] = useState(searchParams.get("severity") || "ALL");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  function applyFilters(
    newQuery: string,
    newEventType: string,
    newCategory: string,
    newSeverity: string,
    newPage: number = 1
  ) {
    const params = new URLSearchParams();
    if (newQuery.trim()) params.set("q", newQuery.trim());
    if (newEventType && newEventType !== "ALL") params.set("eventType", newEventType);
    if (newCategory && newCategory !== "ALL") params.set("category", newCategory);
    if (newSeverity && newSeverity !== "ALL") params.set("severity", newSeverity);
    if (newPage > 1) params.set("page", String(newPage));

    startTransition(() => {
      router.push(`/ad/audit?${params.toString()}`);
    });
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      applyFilters(val, selectedEventType, selectedCategory, selectedSeverity, 1);
    }, 250);
  }

  function handleClearSearch() {
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters("", selectedEventType, selectedCategory, selectedSeverity, 1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters(searchQuery, selectedEventType, selectedCategory, selectedSeverity, 1);
  }

  function handleEventTypeChange(val: string) {
    setSelectedEventType(val);
    applyFilters(searchQuery, val, selectedCategory, selectedSeverity, 1);
  }

  function handleCategoryChange(val: string) {
    setSelectedCategory(val);
    applyFilters(searchQuery, selectedEventType, val, selectedSeverity, 1);
  }

  function handleSeverityChange(val: string) {
    setSelectedSeverity(val);
    applyFilters(searchQuery, selectedEventType, selectedCategory, val, 1);
  }

  function handlePageChange(newPage: number) {
    applyFilters(searchQuery, selectedEventType, selectedCategory, selectedSeverity, newPage);
  }

  function formatTimestamp(ts?: string) {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return ts;
    }
  }

  function getSeverityBadge(severity?: string, isSecurity?: boolean) {
    if (isSecurity || severity === "ERROR") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
          <ShieldAlert className="h-3 w-3" />
          SECURITY / ERROR
        </span>
      );
    }
    if (severity === "SUCCESS") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          SUCCESS
        </span>
      );
    }
    if (severity === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
          <AlertCircle className="h-3 w-3" />
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
        <Info className="h-3 w-3" />
        INFO
      </span>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-zinc-100">
              Activity & Audit
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono tracking-wide">
              {metrics.totalActivities.toLocaleString("en-IN")} LOGS
            </span>
          </div>
          <p className="text-[13.5px] text-zinc-400 font-normal mt-1 leading-relaxed">
            Track administrative actions and system security events across the shared platform.
          </p>
        </div>
      </div>

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-sans">
        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">
            TOTAL AUDIT LOGS
          </span>
          <div className="text-2xl font-semibold text-zinc-100 t-num">
            {metrics.totalActivities.toLocaleString("en-IN")}
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Immutable system logs
          </p>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-rose-400 uppercase tracking-wider block font-medium flex items-center justify-between">
            <span>SECURITY EVENTS</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </span>
          <div className="text-2xl font-semibold text-rose-400 t-num">
            {metrics.securityEventsCount.toLocaleString("en-IN")}
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Logins & access events
          </p>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-indigo-400 uppercase tracking-wider block font-medium flex items-center justify-between">
            <span>ADMIN ACTIONS</span>
            <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
          </span>
          <div className="text-2xl font-semibold text-indigo-300 t-num">
            {metrics.adminActionsCount.toLocaleString("en-IN")}
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Authorized admin changes
          </p>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-emerald-400 uppercase tracking-wider block font-medium flex items-center justify-between">
            <span>ACTIVE ACTORS</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </span>
          <div className="text-2xl font-semibold text-emerald-400 t-num">
            {metrics.activeActorsCount}
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Admins & syndicate users
          </p>
        </Card>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by actor, action, resource name or ID..."
            className="pl-10 pr-9 h-10 bg-zinc-950 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-10 rounded-xl border border-zinc-800 bg-zinc-950/90 pl-3 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-xs"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c} className="bg-zinc-900 text-zinc-200">
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Severity Filter */}
          <div className="relative">
            <select
              value={selectedSeverity}
              onChange={(e) => handleSeverityChange(e.target.value)}
              className="h-10 rounded-xl border border-zinc-800 bg-zinc-950/90 pl-3 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-xs"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Severities</option>
              {availableSeverities.map((s) => (
                <option key={s} value={s} className="bg-zinc-900 text-zinc-200">
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Event Type Filter */}
          <div className="relative">
            <select
              value={selectedEventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="h-10 rounded-xl border border-zinc-800 bg-zinc-950/90 pl-3 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-xs max-w-[200px]"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Event Types</option>
              {availableEventTypes.map((et) => (
                <option key={et} value={et} className="bg-zinc-900 text-zinc-200">
                  {et}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className={cn("bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xs transition-opacity duration-150 relative", isPending && "opacity-60 pointer-events-none")}>
        {isPending && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse z-10" />
        )}
        {initialActivities.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
              <Activity className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-200">
                {searchQuery || selectedEventType !== "ALL" || selectedCategory !== "ALL" || selectedSeverity !== "ALL"
                  ? "No activity found"
                  : "No audit records recorded"}
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {searchQuery || selectedEventType !== "ALL" || selectedCategory !== "ALL" || selectedSeverity !== "ALL"
                  ? "No audit events match your search or filter parameters."
                  : "Audit events will appear here once administrative actions take place."}
              </p>
            </div>
            {(searchQuery || selectedEventType !== "ALL" || selectedCategory !== "ALL" || selectedSeverity !== "ALL") && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearSearch}
                  className="h-8.5 px-4 text-xs font-medium border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  <X className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300 font-sans">
              <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Event / Action</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">Status / Severity</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {initialActivities.map((act) => {
                  const eventLabel = act.eventType || act.type || "STATUS_CHANGED";
                  const actorDisplay = act.actorName || act.memberName || act.actorUsername || "System";
                  const handleDisplay = act.actorUsername ? `@${act.actorUsername}` : undefined;

                  return (
                    <tr key={act.id} className="hover:bg-zinc-800/40 transition-colors duration-150 group">
                      {/* Time */}
                      <td className="py-3.5 px-4 text-zinc-400 text-xs">
                        {formatTimestamp(act.createdAt || act.timestamp)}
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="space-y-0.5">
                          <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                            <span>{actorDisplay}</span>
                            {act.actorRole && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                {act.actorRole}
                              </span>
                            )}
                          </div>
                          {handleDisplay && (
                            <div className="text-[11px] text-zinc-500 font-mono">
                              {handleDisplay}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Event / Action */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-block font-bold text-indigo-300 text-xs bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/80">
                            {eventLabel}
                          </span>
                          {act.title && (
                            <div className="text-[11px] text-zinc-400 font-sans line-clamp-1">
                              {act.title}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Target Resource */}
                      <td className="py-3.5 px-4 font-sans text-xs">
                        {act.targetType || act.targetName ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-zinc-200">
                              {act.targetName || act.targetType}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {act.targetType}: {act.targetId || "—"}
                            </div>
                          </div>
                        ) : act.subtitle ? (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {act.subtitle}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      {/* Status / Severity */}
                      <td className="py-3.5 px-4">
                        {getSeverityBadge(act.severity, act.isSecurityEvent)}
                      </td>

                      {/* Details Action */}
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link href={`/ad/audit/${act.id}`} prefetch={true}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400 font-sans">
          <div>
            Showing <strong className="text-zinc-200">{initialActivities.length}</strong> of{" "}
            <strong className="text-zinc-200">{total.toLocaleString("en-IN")}</strong> activity logs
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
                className="h-7 w-7 p-0 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
                className="h-7 w-7 p-0 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

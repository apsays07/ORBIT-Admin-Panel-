"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ApplicationRecord } from "@/types/application";
import { NexoIPORecord } from "@/types/ipo";
import {
  AllotmentIpoOption,
  AllotmentMetrics,
  updateRegistrarUrl,
  processAllotmentUpdate,
  resetAllotmentForIpo,
} from "@/lib/allotment/actions";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Edit,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  Sparkles,
  X,
  RotateCcw,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { cn, formatCombinedApplicants } from "@/lib/utils";
import { OfferingSelectDropdown } from "@/components/ui/offering-select-dropdown";
import { useToast } from "@/components/ui/toast";

interface AllotmentManagementViewProps {
  selectedIpo: NexoIPORecord | null;
  availableIpos: AllotmentIpoOption[];
  applications: ApplicationRecord[];
  metrics: AllotmentMetrics;
  total: number;
  currentPage: number;
  totalPages: number;
}

export function AllotmentManagementView({
  selectedIpo,
  availableIpos,
  applications,
  metrics,
  currentPage,
  totalPages,
}: AllotmentManagementViewProps) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeFilter, setActiveFilter] = useState(searchParams.get("status") || "ALL");
  const [activeSort, setActiveSort] = useState(searchParams.get("sort") || "default");
  const [copiedPan, setCopiedPan] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Selection state for individual PAN cards (key format: `${appId}:${panIndex}`)
  const [selectedPanKeys, setSelectedPanKeys] = useState<string[]>(() => {
    const keys: string[] = [];
    applications.forEach((app) => {
      if (app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED") {
        if (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) {
          app.allottedIndices.forEach((idx) => {
            keys.push(`${app.id}:${idx}`);
          });
        } else {
          const count = app.panNumbers?.length || app.numberOfPanCards || 1;
          for (let i = 0; i < count; i++) {
            keys.push(`${app.id}:${i}`);
          }
        }
      }
    });
    return keys;
  });

  // Modals
  const [isEditUrlOpen, setIsEditUrlOpen] = useState(false);
  const [newUrl, setNewUrl] = useState(selectedIpo?.registrarUrl || "");
  const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessingAllotment, setIsProcessingAllotment] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const isInitialIpoRestoredRef = useRef(false);

  // Restore persistent IPO on client mount strictly once if no explicit URL param
  useEffect(() => {
    if (isInitialIpoRestoredRef.current) return;
    isInitialIpoRestoredRef.current = true;

    if (!searchParams.get("ipoId")) {
      try {
        const storedIpo = localStorage.getItem("orbit_selected_ipo_id");
        if (
          storedIpo &&
          storedIpo !== "DEFAULT" &&
          availableIpos.some((i) => i.id === storedIpo) &&
          storedIpo !== selectedIpo?.id
        ) {
          applyFilters(searchQuery, storedIpo, activeFilter, activeSort, 1);
        }
      } catch {}
    }
  }, []);

  function applyFilters(newQuery: string, newIpo: string, newStatus: string, newSort: string, newPage: number = 1) {
    if (newIpo && newIpo !== "DEFAULT") {
      try {
        localStorage.setItem("orbit_selected_ipo_id", newIpo);
      } catch {}
    }

    const params = new URLSearchParams();
    if (newQuery.trim()) params.set("q", newQuery.trim());
    if (newIpo && newIpo !== "DEFAULT") params.set("ipoId", newIpo);
    if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
    if (newSort && newSort !== "default") params.set("sort", newSort);
    if (newPage > 1) params.set("page", String(newPage));

    startTransition(() => {
      router.push(`/ad/allotment?${params.toString()}`);
    });
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      applyFilters(val, selectedIpo?.id || "DEFAULT", activeFilter, activeSort, 1);
    }, 250);
  }

  function handleClearSearch() {
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters("", selectedIpo?.id || "DEFAULT", activeFilter, activeSort, 1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters(searchQuery, selectedIpo?.id || "DEFAULT", activeFilter, activeSort, 1);
  }

  function handleIpoChange(newIpoId: string) {
    applyFilters(searchQuery, newIpoId, activeFilter, activeSort, 1);
  }

  function handleFilterClick(statusVal: string) {
    setActiveFilter(statusVal);
    applyFilters(searchQuery, selectedIpo?.id || "DEFAULT", statusVal, activeSort, 1);
  }

  function handleSortChange(sortVal: string) {
    setActiveSort(sortVal);
    applyFilters(searchQuery, selectedIpo?.id || "DEFAULT", activeFilter, sortVal, 1);
  }

  function handlePageChange(newPage: number) {
    applyFilters(searchQuery, selectedIpo?.id || "DEFAULT", activeFilter, activeSort, newPage);
  }

  const flattenedPanRows = useMemo(() => {
    const rows = applications.flatMap((app) => {
      const isAppAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";
      const isAppPending =
        app.status === "AWAITING" ||
        app.status === "PENDING" ||
        (!app.status && !app.allotmentStatus);
      const allottedIndices = Array.isArray(app.allottedIndices) ? app.allottedIndices : [];

      if (app.panNumbers && app.panNumbers.length > 0) {
        return app.panNumbers.map((pan, idx) => {
          let cardStatus = "NOT_ALLOTTED";
          if (isAppPending) {
            cardStatus = "PENDING";
          } else if (
            isAppAllotted &&
            (allottedIndices.length === 0 || allottedIndices.includes(idx))
          ) {
            cardStatus = "ALLOTTED";
          }

          return {
            rowKey: `${app.id}:${idx}`,
            appId: app.id,
            app,
            panNumber: pan,
            panIndex: idx,
            cardStatus,
          };
        });
      }

      let cardStatus = "NOT_ALLOTTED";
      if (isAppPending) {
        cardStatus = "PENDING";
      } else if (
        isAppAllotted &&
        (allottedIndices.length === 0 || allottedIndices.includes(0))
      ) {
        cardStatus = "ALLOTTED";
      }

      return [
        {
          rowKey: `${app.id}:0`,
          appId: app.id,
          app,
          panNumber: "—",
          panIndex: 0,
          cardStatus,
        },
      ];
    });

    if (activeFilter === "ALLOTTED") {
      return rows.filter((r) => r.cardStatus === "ALLOTTED");
    }
    if (activeFilter === "NOT_ALLOTTED") {
      return rows.filter((r) => r.cardStatus === "NOT_ALLOTTED");
    }
    if (activeFilter === "PENDING") {
      return rows.filter((r) => r.cardStatus === "PENDING");
    }
    return rows;
  }, [applications, activeFilter]);

  const allRowKeys = useMemo(() => flattenedPanRows.map((r) => r.rowKey), [flattenedPanRows]);
  const isAllSelected = allRowKeys.length > 0 && allRowKeys.every((k) => selectedPanKeys.includes(k));
  const isSomeSelected = allRowKeys.some((k) => selectedPanKeys.includes(k)) && !isAllSelected;

  function toggleSelectPan(key: string) {
    setSelectedPanKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedPanKeys((prev) => prev.filter((k) => !allRowKeys.includes(k)));
    } else {
      setSelectedPanKeys((prev) => Array.from(new Set([...prev, ...allRowKeys])));
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedPan(text);
    toast.success("PAN Copied", `PAN "${text}" copied to clipboard.`, 2200);
    setTimeout(() => setCopiedPan(null), 2000);
  }

  async function handleSaveRegistrarUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIpo) return;
    setIsUpdatingUrl(true);
    const res = await updateRegistrarUrl(selectedIpo.id, newUrl);
    setIsUpdatingUrl(false);
    if (res.success) {
      setIsEditUrlOpen(false);
      toast.success("Registrar URL Saved", "Registrar link updated successfully.");
      router.refresh();
    } else {
      toast.error("Failed to Update URL", res.error || "Could not update registrar URL.");
    }
  }

  async function handleConfirmAllotment() {
    if (!selectedIpo) return;
    setIsProcessingAllotment(true);
    setProcessError(null);

    // Group selected pan indices by appId
    const selectedMap: Record<string, number[]> = {};
    selectedPanKeys.forEach((key) => {
      const [appId, idxStr] = key.split(":");
      const idx = parseInt(idxStr, 10);
      if (!selectedMap[appId]) selectedMap[appId] = [];
      if (!isNaN(idx)) selectedMap[appId].push(idx);
    });

    const allotmentDecisions = applications.map((app) => ({
      appId: app.id,
      allottedIndices: selectedMap[app.id] || [],
    }));

    const res = await processAllotmentUpdate(selectedIpo.id, allotmentDecisions);
    setIsProcessingAllotment(false);
    if (res.success) {
      setIsConfirmOpen(false);
      toast.success(
        "Allotment Statuses Updated",
        `Successfully saved allotment outcomes for ${selectedIpo.name}.`
      );
      router.refresh();
    } else {
      const errMsg = res.error || "Failed to update allotment.";
      setProcessError(errMsg);
      toast.error("Failed to Update Allotment", errMsg);
    }
  }

  const [isResetting, setIsResetting] = useState(false);

  async function handleResetAllotment() {
    if (!selectedIpo) return;
    if (!confirm(`Are you sure you want to reset all allotment outcomes for ${selectedIpo.name} back to 0 (Awaiting)?`)) {
      return;
    }
    setIsResetting(true);
    const res = await resetAllotmentForIpo(selectedIpo.id);
    setIsResetting(false);
    if (res.success) {
      setSelectedPanKeys([]);
      toast.info("Allotment Reset", `Allotment status for ${selectedIpo.name} reset to awaiting.`);
      router.refresh();
    } else {
      toast.error("Failed to Reset Allotment", res.error || "Could not reset allotment.");
    }
  }

  function getStatusBadge(status?: string) {
    const st = status || "AWAITING";
    if (st === "ALLOTTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 font-sans">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Allotted
        </span>
      );
    }
    if (st === "NOT_ALLOTTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 font-sans">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          Not Allotted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800 font-sans">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Pending
      </span>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-100">
              Allotment
            </h1>
            <span className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider font-mono uppercase">
              RESULTS
            </span>
          </div>
        </div>

        {/* Top Header Actions Cluster (Pinned at Far Right) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Unified Offering Selector - Styled & Pinned at Far Right */}
          <OfferingSelectDropdown
            items={availableIpos}
            value={selectedIpo?.id || "DEFAULT"}
            onChange={(id) => handleIpoChange(id)}
            className="w-[270px]"
          />
        </div>
      </div>

      {/* Selected IPO Banner Card */}
      {selectedIpo ? (
        <Card className="bg-zinc-900/50 border-zinc-800/80 p-5 sm:p-6 rounded-2xl shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight">
                {selectedIpo.name}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase tracking-wider">
                {selectedIpo.category || "Mainboard"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {selectedIpo.registrarUrl ? (
                <a
                  href={selectedIpo.registrarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors"
                >
                  <span>Check Allotment</span>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                </a>
              ) : (
                <span className="text-xs text-zinc-500 font-normal">No Registrar URL Set</span>
              )}

              <Button
                onClick={() => {
                  setNewUrl(selectedIpo.registrarUrl || "");
                  setIsEditUrlOpen(true);
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Link
              </Button>
            </div>
          </div>

          {/* 4 Banner Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-left font-sans">
            <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                APPLICATIONS
              </span>
              <div className="text-2xl font-semibold text-zinc-100 t-num">
                {metrics.totalPanCards}
              </div>
            </div>

            <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1">
              <span className="text-[11px] font-medium text-amber-500/90 uppercase tracking-wider block">
                PENDING
              </span>
              <div className="text-2xl font-semibold text-amber-400 t-num">
                {metrics.pendingCount}
              </div>
            </div>

            <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1">
              <span className="text-[11px] font-medium text-emerald-500/90 uppercase tracking-wider block">
                ALLOTTED
              </span>
              <div className="text-2xl font-semibold text-emerald-400 t-num">
                {metrics.allottedCount}
              </div>
            </div>

            <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                NOT ALLOTTED
              </span>
              <div className="text-2xl font-semibold text-zinc-400 t-num">
                {metrics.notAllottedCount}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Controls Bar: Search, Filters, Sort, Update Allotment */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, PAN or application number..."
            className="pl-10 pr-9 h-10 bg-zinc-900 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl"
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
          {/* Status Filter Pills */}
          <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => handleFilterClick("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === "ALL"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleFilterClick("PENDING")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === "PENDING"
                  ? "bg-amber-950 text-amber-300 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => handleFilterClick("ALLOTTED")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === "ALLOTTED"
                  ? "bg-emerald-950 text-emerald-300 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Allotted
            </button>
            <button
              type="button"
              onClick={() => handleFilterClick("NOT_ALLOTTED")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === "NOT_ALLOTTED"
                  ? "bg-zinc-800 text-zinc-200 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Not Allotted
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative flex items-center">
            <select
              value={activeSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-10 rounded-xl border border-zinc-800 bg-zinc-900/90 pl-3 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-xs"
            >
              <option value="default" className="bg-zinc-900 text-zinc-200">Sort: Default</option>
              <option value="applicant" className="bg-zinc-900 text-zinc-200">Sort: Applicant Name</option>
              <option value="status" className="bg-zinc-900 text-zinc-200">Sort: Status</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Reset Allotments Button (if any allotted) */}
          <Button
            type="button"
            variant="outline"
            onClick={handleResetAllotment}
            disabled={isResetting || !selectedIpo}
            className="h-10 px-3.5 gap-1.5 border-zinc-800 bg-zinc-900/90 hover:bg-rose-950/30 hover:border-rose-800/60 text-zinc-300 hover:text-rose-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
            title="Reset all allotments for this IPO back to 0 (Awaiting)"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>Reset</span>
          </Button>

          {/* Update Allotment Button */}
          <Button
            onClick={() => setIsConfirmOpen(true)}
            className="h-10 px-4 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Update Allotment</span>
          </Button>
        </div>
      </div>

      {/* Main Allotment Table */}
      <div className={cn("bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xs transition-opacity duration-150 relative", isPending && "opacity-60 pointer-events-none")}>
        {isPending && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-emerald-400 to-cyan-500 animate-pulse z-10" />
        )}
        {flattenedPanRows.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-200">
                {searchQuery || activeFilter !== "ALL" ? "No applications found" : "No filings for this offering"}
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {searchQuery || activeFilter !== "ALL"
                  ? "Try adjusting your search query or status filter to locate application records."
                  : "There are currently no member filings submitted for this offering."}
              </p>
            </div>
            {(searchQuery || activeFilter !== "ALL") && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("ALL");
                    applyFilters("", selectedIpo?.id || "DEFAULT", "ALL", activeSort, 1);
                  }}
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
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 font-sans">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-400" />
                      ) : isSomeSelected ? (
                        <MinusSquare className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-2 w-12">#</th>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">PAN</th>
                  <th className="py-3 px-4 text-center">Selection</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {flattenedPanRows.map((item, index) => {
                  const isSelected = selectedPanKeys.includes(item.rowKey);
                  const rowNumber = String(index + 1).padStart(2, "0");
                  const displayUser = formatCombinedApplicants(item.app);

                  return (
                    <tr
                      key={item.rowKey}
                      className={cn(
                        "hover:bg-zinc-800/40 transition-colors duration-150 group",
                        isSelected && "bg-indigo-950/20"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectPan(item.rowKey)}
                          className="cursor-pointer text-zinc-400 hover:text-zinc-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-indigo-400" />
                          ) : (
                            <Square className="h-4 w-4 text-zinc-600 hover:text-zinc-400" />
                          )}
                        </button>
                      </td>

                      {/* Index */}
                      <td className="py-3.5 px-2 text-zinc-400 font-mono text-xs">
                        {rowNumber}
                      </td>

                      {/* Applicant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <MemberAvatar
                            src={item.app.memberAvatar}
                            name={item.app.applicantName}
                            className="h-8 w-8 rounded-xl border border-zinc-800 text-xs shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-zinc-100 text-[13.5px]">
                              {displayUser}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-sans">
                              {item.app.applicantName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PAN */}
                      <td className="py-3.5 px-4 font-mono">
                        {item.panNumber !== "—" ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.panNumber)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all duration-150 cursor-pointer group/pan active:scale-95",
                              copiedPan === item.panNumber
                                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white"
                            )}
                            title={copiedPan === item.panNumber ? "Copied!" : "Click to copy PAN"}
                          >
                            {copiedPan === item.panNumber ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400 animate-in zoom-in-75 duration-150" />
                                <span className="tracking-wider text-emerald-300 font-semibold">{item.panNumber}</span>
                                <span className="text-[9.5px] font-sans text-emerald-400 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-zinc-500 group-hover/pan:text-zinc-300 transition-colors" />
                                <span className="tracking-wider">{item.panNumber}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-zinc-600 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Selection */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            <Sparkles className="h-3 w-3" />
                            Selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 text-zinc-500 border border-zinc-800">
                            Not Selected
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(item.cardStatus)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link href={`/ad/applications/${item.app.id}`} prefetch={true}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                            title="View Application Details"
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

        {/* Footer Summary */}
        <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400 font-sans">
          <div>
            Showing all <strong className="text-zinc-200">{flattenedPanRows.length}</strong> applications for this offering
          </div>

          {totalPages > 1 && (
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
          )}
        </div>
      </div>

      {/* Edit Registrar URL Modal */}
      {isEditUrlOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl text-zinc-100">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-zinc-100">Edit Registrar Allotment URL</h4>
              <p className="text-xs text-zinc-400">
                Update the official registrar URL for <strong className="text-zinc-200">{selectedIpo?.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleSaveRegistrarUrl} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Registrar Link</label>
                <Input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://in.mpms.mufg.com/Initial_Offer/..."
                  className="bg-zinc-950 border-zinc-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditUrlOpen(false)}
                  disabled={isUpdatingUrl}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdatingUrl}
                  className="text-xs bg-zinc-100 text-zinc-950 hover:bg-white font-semibold"
                >
                  {isUpdatingUrl && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Save URL
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Allotment Update Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl text-zinc-100">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-100">Finalize & Update Allotment</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You are about to finalize allotment decisions for <strong className="text-zinc-200">{selectedIpo?.name}</strong>.
                </p>
              </div>
            </div>

            {processError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {processError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-sans">Allotted PAN Cards:</span>
                <span className="font-bold text-emerald-400">{selectedPanKeys.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-sans">Not Allotted Cards:</span>
                <span className="font-bold text-zinc-300">
                  {Math.max(0, (metrics.totalPanCards || metrics.totalApplications || 0) - selectedPanKeys.length)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400 font-sans">IPO Target Status:</span>
                <span className="font-bold text-indigo-400">ALLOTMENT_OUT</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              ⚠️ This will update all member applications in the shared Nexo database and enable subsequent profit distribution.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isProcessingAllotment}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmAllotment}
                disabled={isProcessingAllotment}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                {isProcessingAllotment && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Confirm & Publish Allotment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

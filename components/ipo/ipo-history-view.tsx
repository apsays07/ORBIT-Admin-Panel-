"use client";

import React, { useState, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { NexoIPORecord } from "@/types/ipo";
import { deleteIpo } from "@/lib/ipo/actions";
import { IpoHistoryAnalyticsData } from "@/lib/calculations";
import {
  Search,
  History,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building,
  Eye,
  CheckCircle2,
  Clock,
  Coins,
  X,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { IpoModal } from "./ipo-modal";
import { IpoHistoryAnalytics } from "./ipo-history-analytics";
import { PreviousApplicantsGapView } from "./previous-applicants-gap-view";
import { cn } from "@/lib/utils";

interface IpoHistoryViewProps {
  initialIpos: NexoIPORecord[];
  total: number;
  currentPage: number;
  totalPages: number;
  availableStatuses: string[];
  metricsSummary?: {
    activeCount: number;
    upcomingCount: number;
    closedCount: number;
    totalApplications: number;
    totalAppliedCount?: number;
    totalAllottedCount?: number;
    totalIposApplied?: number;
    allotmentRatePercentage?: number;
  };
  initialAnalyticsData?: IpoHistoryAnalyticsData;
  rawHistoricalIpos?: any[];
  rawHistoricalApps?: any[];
}

export function IpoHistoryView({
  initialIpos,
  total,
  currentPage,
  totalPages,
  availableStatuses,
  metricsSummary,
  initialAnalyticsData,
  rawHistoricalIpos = [],
  rawHistoricalApps = [],
}: IpoHistoryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "ALL");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "ALL");
  const [selectedSort, setSelectedSort] = useState(searchParams.get("sort") || "closeDate");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal & Mutation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIpo, setEditingIpo] = useState<NexoIPORecord | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function applyFilters(
    newQuery: string,
    newStatus: string,
    newCategory: string,
    newSort: string,
    newPage: number = 1
  ) {
    const params = new URLSearchParams();
    if (newQuery.trim()) params.set("q", newQuery.trim());
    if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
    if (newCategory && newCategory !== "ALL") params.set("category", newCategory);
    if (newSort && newSort !== "closeDate") params.set("sort", newSort);
    if (newPage > 1) params.set("page", String(newPage));

    startTransition(() => {
      router.push(`/ad/ipo/history?${params.toString()}`);
    });
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      applyFilters(val, selectedStatus, selectedCategory, selectedSort, 1);
    }, 250);
  }

  function handleClearSearch() {
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters("", selectedStatus, selectedCategory, selectedSort, 1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters(searchQuery, selectedStatus, selectedCategory, selectedSort, 1);
  }

  function handleStatusChange(status: string) {
    setSelectedStatus(status);
    applyFilters(searchQuery, status, selectedCategory, selectedSort, 1);
  }

  function handleCategoryChange(category: string) {
    setSelectedCategory(category);
    applyFilters(searchQuery, selectedStatus, category, selectedSort, 1);
  }

  function handleSortChange(sort: string) {
    setSelectedSort(sort);
    applyFilters(searchQuery, selectedStatus, selectedCategory, sort, 1);
  }

  function handlePageChange(newPage: number) {
    applyFilters(searchQuery, selectedStatus, selectedCategory, selectedSort, newPage);
  }

  function handleOpenAdd() {
    setEditingIpo(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(ipo: NexoIPORecord) {
    setEditingIpo(ipo);
    setIsModalOpen(true);
  }

  async function handleDeleteIpo(id: string) {
    setActionInProgressId(id);
    try {
      const res = await deleteIpo(id);
      if (res.success) {
        setDeleteConfirmId(null);
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setActionInProgressId(null);
    }
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-zinc-100">
              IPO History & Analytics
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 tracking-wide font-mono">
              HISTORICAL ARCHIVE
            </span>
          </div>
          <p className="text-[13.5px] text-zinc-400 font-normal mt-1 leading-relaxed">
            Syndicate performance telemetry, application trends, and finalized profit distributions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenAdd}
            className="h-9 px-3.5 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-xl shadow-xs cursor-pointer tracking-tight"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add IPO</span>
          </Button>

          <Link href="/ad/ipo">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs text-zinc-300 hover:text-white border-zinc-800 hover:bg-zinc-800 rounded-xl gap-1.5 shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Active Offerings</span>
            </Button>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 font-mono shadow-xs">
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            <span>Total: <strong className="text-zinc-200 font-semibold">{total}</strong></span>
          </div>
        </div>
      </div>

      {/* Premium Real-Data Analytics Visualization Engine */}
      <IpoHistoryAnalytics
        initialAnalytics={initialAnalyticsData}
        rawHistoricalIpos={rawHistoricalIpos}
        rawHistoricalApps={rawHistoricalApps}
        onOpenAddIpo={handleOpenAdd}
      />

      {/* Previous Applicants Not Applied in Current IPO */}
      <PreviousApplicantsGapView
        allIpos={rawHistoricalIpos}
        allApplications={rawHistoricalApps}
      />

      {/* Section Divider & Catalog Title */}
      <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
            Historical Offering Archive
          </h3>
          <p className="text-xs text-zinc-400">
            Searchable log of all syndicate offerings and archived records
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/70 p-3 rounded-2xl border border-zinc-800 shadow-xs backdrop-blur-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search historical IPOs by name or company..."
            className="pl-10 pr-8 bg-zinc-950/90 border-zinc-800 text-xs h-10 text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-10 rounded-xl border border-zinc-800 bg-zinc-950/90 pl-3.5 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-2xs"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Statuses ({total})</option>
              {availableStatuses.map((st) => (
                <option key={st} value={st} className="bg-zinc-900 text-zinc-200">
                  {st}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-10 rounded-xl border border-zinc-800 bg-zinc-950/90 pl-3.5 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-2xs"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Categories</option>
              <option value="Mainboard" className="bg-zinc-900 text-zinc-200">Mainboard</option>
              <option value="SME" className="bg-zinc-900 text-zinc-200">SME</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-10 rounded-xl border border-zinc-800 bg-zinc-950/90 pl-3.5 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-2xs"
            >
              <option value="closeDate" className="bg-zinc-900 text-zinc-200">Sort: Closing Date</option>
              <option value="createdAt" className="bg-zinc-900 text-zinc-200">Sort: Created Date</option>
              <option value="name" className="bg-zinc-900 text-zinc-200">Sort: Name (A-Z)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* IPO List / Table */}
      {initialIpos.length === 0 ? (
        <Card className="p-12 text-center bg-zinc-900/30 border-zinc-800/80 rounded-2xl">
          <History className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">No historical IPOs found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedStatus !== "ALL" || selectedCategory !== "ALL"
              ? "Try adjusting your filters or search query to find offerings."
              : "Completed and archived IPOs will appear here after syndicate execution."}
          </p>
        </Card>
      ) : (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-medium">
                  <th className="py-3 px-4">IPO Name</th>
                  <th className="py-3 px-3">Closing Date</th>
                  <th className="py-3 px-3 text-right">Min Invest</th>
                  <th className="py-3 px-3 text-right">Profit Dist.</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-normal">
                {initialIpos.map((ipo) => {
                  const profitDist = ipo.profitDistribution;
                  const totalProfit = profitDist?.totalProfit || 0;
                  const hasProfit = totalProfit > 0;
                  const isDeleting = actionInProgressId === ipo.id;
                  const isConfirmingDelete = deleteConfirmId === ipo.id;

                  return (
                    <tr
                      key={ipo.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="py-3 px-4 font-medium text-zinc-100">
                        {ipo.name}
                      </td>

                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11.5px]">
                        {ipo.metrics?.closeDate
                          ? new Date(ipo.metrics.closeDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {ipo.metrics?.minInvestment
                          ? `₹${ipo.metrics.minInvestment.toLocaleString("en-IN")}`
                          : "—"}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {hasProfit ? (
                          <div className="font-mono text-emerald-400 font-medium">
                            ₹{totalProfit.toLocaleString("en-IN")}
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/ad/ipo/history/${ipo.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg gap-1 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Details</span>
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(ipo)}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer"
                            title="Edit IPO"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isDeleting}
                                onClick={() => handleDeleteIpo(ipo.id)}
                                className="h-7 px-2 text-[11px] rounded-lg bg-red-600 hover:bg-red-500 gap-1"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <span>Confirm</span>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirmId(null)}
                                className="h-7 px-1.5 text-[11px] rounded-lg text-zinc-400 hover:text-zinc-200"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(ipo.id)}
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-zinc-800 bg-zinc-950/60">
              <div className="text-xs text-zinc-400">
                Page <strong className="text-zinc-200 font-semibold">{currentPage}</strong> of{" "}
                <strong className="text-zinc-200 font-semibold">{totalPages}</strong> ({total} total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="h-8 px-2.5 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl gap-1 cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="h-8 px-2.5 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl gap-1 cursor-pointer disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit IPO Modal */}
      <IpoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIpo(null);
        }}
        initialData={editingIpo}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingIpo(null);
          startTransition(() => {
            router.refresh();
          });
        }}
      />
    </div>
  );
}

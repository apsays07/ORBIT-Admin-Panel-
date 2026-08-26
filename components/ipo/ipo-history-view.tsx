"use client";

import React, { useState, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { NexoIPORecord } from "@/types/ipo";
import { deleteIpo } from "@/lib/ipo/actions";
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
}

export function IpoHistoryView({
  initialIpos,
  total,
  currentPage,
  totalPages,
  availableStatuses,
  metricsSummary,
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

  const totalProfitDisbursed = metricsSummary?.totalApplications || 0;
  const totalAppliedCount = metricsSummary?.totalAppliedCount || total;
  const totalAllottedCount = metricsSummary?.totalAllottedCount || 0;
  const totalIposApplied = metricsSummary?.totalIposApplied ?? total;
  const allotmentRatePercentage = typeof metricsSummary?.allotmentRatePercentage === "number"
    ? metricsSummary.allotmentRatePercentage
    : (totalAppliedCount > 0 ? Number(((totalAllottedCount / totalAppliedCount) * 100).toFixed(1)) : 0);

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
              IPO Catalog & Archive
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 tracking-wide font-mono">
              DIRECTORY
            </span>
          </div>
          <p className="text-[13.5px] text-zinc-400 font-normal mt-1 leading-relaxed">
            All syndicate offerings, finalized allotments, and profit distributions.
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

      {/* 3 Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
        {/* Card 1: Total IPOs Applied */}
        <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/90 p-5 shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-zinc-400 font-sans">
              Total IPOs Applied
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold text-zinc-50 tracking-tight leading-none font-sans">
              {totalIposApplied}
            </span>
            <span className="text-xs text-zinc-400 font-normal font-sans">
              {totalIposApplied === 1 ? "IPO" : "IPOs"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2 font-sans font-normal leading-relaxed">
            Total syndicate IPO offerings participated
          </p>
        </div>

        {/* Card 2: Total Profit Gained */}
        <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-emerald-900/30 hover:border-emerald-700/50 p-5 shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-emerald-400 font-sans">
              Total Profit Gained
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold text-emerald-400 tracking-tight leading-none font-sans">
              ₹{totalProfitDisbursed.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2 font-sans font-normal leading-relaxed">
            Total realized returns gained
          </p>
        </div>

        {/* Card 3: Allotment Rate */}
        <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-purple-900/30 hover:border-purple-700/50 p-5 shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-purple-400 font-sans">
              Allotment Rate
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[28px] font-bold text-zinc-50 tracking-tight leading-none font-sans">
              {allotmentRatePercentage}%
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
              {totalAllottedCount} Allotted
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2 font-sans font-normal leading-relaxed">
            {totalAllottedCount} allotted of {totalAppliedCount} applied ({allotmentRatePercentage}%)
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

      {/* Main Historical Table */}
      <div className={cn("bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs transition-opacity duration-150 relative backdrop-blur-xs", isPending && "opacity-60 pointer-events-none")}>
        {isPending && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse z-10" />
        )}
        {initialIpos.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
              <History className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-200">No IPO history available</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery || selectedStatus !== "ALL" || selectedCategory !== "ALL"
                  ? "No historical records match your search or filter parameters."
                  : "There are currently no concluded or historical IPO records in the database."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/90 text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 font-sans">
                <tr>
                  <th className="py-3.5 px-4">IPO Name</th>
                  <th className="py-3.5 px-3">Issue Size / Lot</th>
                  <th className="py-3.5 px-3">Min Investment</th>
                  <th className="py-3.5 px-3">Closing Date</th>
                  <th className="py-3.5 px-3">Profit (₹)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {initialIpos.map((ipo) => {
                  const totalProfit = ipo.profitDistribution?.totalProfit || 0;

                  return (
                    <tr
                      key={ipo.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* IPO Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-100 text-[13.5px] group-hover:text-emerald-300 transition-colors">
                          {ipo.name}
                        </div>
                      </td>

                      {/* Issue Size / Lot */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="text-zinc-200 font-semibold text-[13px] font-sans t-num">
                            {ipo.metrics?.issueSize || "—"}
                          </div>
                          <div className="text-[10.5px] text-zinc-500 font-sans">
                            Lot: <strong className="text-zinc-400 font-sans t-num">{ipo.metrics?.lotSize || 1}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Min Investment */}
                      <td className="py-3.5 px-3">
                        <div className="text-zinc-200 font-semibold text-[13px] font-sans t-num">
                          ₹{(ipo.metrics?.minInvestment || 0).toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Closing Date */}
                      <td className="py-3.5 px-3 font-sans text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-300 text-[12.5px]">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <span className="font-medium text-zinc-200 font-sans t-num">{ipo.metrics?.closeDate || "—"}</span>
                        </div>
                      </td>

                      {/* Profit Amount */}
                      <td className="py-3.5 px-3 font-mono">
                        {totalProfit > 0 ? (
                          <div className="font-bold text-[14px] text-emerald-400 t-num">
                            ₹{totalProfit.toLocaleString("en-IN")}
                          </div>
                        ) : (
                          <div className="text-zinc-500 text-xs font-mono">—</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/ad/ipo/history/${ipo.id}`} prefetch={true}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 rounded-xl border border-zinc-800/80 hover:border-zinc-700/80 transition-all gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200" />
                              <span>Details</span>
                            </Button>
                          </Link>

                          <Button
                            onClick={() => handleOpenEdit(ipo)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 rounded-xl gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Edit</span>
                          </Button>

                          {deleteConfirmId === ipo.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => handleDeleteIpo(ipo.id)}
                                disabled={actionInProgressId === ipo.id}
                                size="sm"
                                className="h-8 px-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl cursor-pointer"
                              >
                                {actionInProgressId === ipo.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Confirm"
                                )}
                              </Button>
                              <Button
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={actionInProgressId === ipo.id}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-200"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setDeleteConfirmId(ipo.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                              title="Delete IPO"
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
        )}

        {/* Pagination Controls */}
        <div className="px-4 py-3.5 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-sans">
          <div>
            Showing <strong className="text-zinc-200">{initialIpos.length}</strong> of{" "}
            <strong className="text-zinc-200">{total}</strong> records
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
                className="h-8 w-8 p-0 border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
                className="h-8 w-8 p-0 border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

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

"use client";

import React, { useState, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { NexoIPORecord } from "@/types/ipo";
import { completeIpo, deleteIpo } from "@/lib/ipo/actions";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  ExternalLink,
  Shield,
  FileSpreadsheet,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IpoModal } from "./ipo-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface IpoManagementViewProps {
  initialIpos: NexoIPORecord[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit?: number;
  availableStatuses: string[];
}

export function IpoManagementView({
  initialIpos,
  total,
  currentPage,
  totalPages,
  availableStatuses,
}: IpoManagementViewProps) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "ALL");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "ALL");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIpo, setEditingIpo] = useState<NexoIPORecord | null>(null);

  // Mutation States
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Open / Active IPOs (status is APPLICATION_OPEN or OPEN or active)
  const openIpos = initialIpos.filter(
    (ipo) =>
      ipo.status === "APPLICATION_OPEN" ||
      ipo.status === "OPEN" ||
      (!ipo.isCompleted && !ipo.allotmentFinalized)
  );

  function applyFilters(newQuery: string, newStatus: string, newCategory: string, newPage: number = 1) {
    const params = new URLSearchParams();
    if (newQuery.trim()) params.set("q", newQuery.trim());
    if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
    if (newCategory && newCategory !== "ALL") params.set("category", newCategory);
    if (newPage > 1) params.set("page", String(newPage));

    startTransition(() => {
      router.push(`/ad/ipo?${params.toString()}`);
    });
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      applyFilters(val, selectedStatus, selectedCategory, 1);
    }, 250);
  }

  function handleClearSearch() {
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters("", selectedStatus, selectedCategory, 1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters(searchQuery, selectedStatus, selectedCategory, 1);
  }

  function handleStatusChange(status: string) {
    setSelectedStatus(status);
    applyFilters(searchQuery, status, selectedCategory, 1);
  }

  function handleCategoryChange(category: string) {
    setSelectedCategory(category);
    applyFilters(searchQuery, selectedStatus, category, 1);
  }

  function handlePageChange(newPage: number) {
    applyFilters(searchQuery, selectedStatus, selectedCategory, newPage);
  }

  function handleOpenAdd() {
    setEditingIpo(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(ipo: NexoIPORecord) {
    setEditingIpo(ipo);
    setIsModalOpen(true);
  }

  async function handleCompleteIpo(id: string) {
    setActionInProgressId(id);
    try {
      const res = await completeIpo(id);
      if (res.success) {
        toast.success("IPO Completed", "IPO status has been updated to completed.");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error("Failed to Update IPO", res.error || "Could not complete IPO.");
      }
    } catch (err: unknown) {
      toast.error("Server Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setActionInProgressId(null);
    }
  }

  async function handleDeleteIpo(id: string) {
    setActionInProgressId(id);
    try {
      const res = await deleteIpo(id);
      if (res.success) {
        setDeleteConfirmId(null);
        toast.success("IPO Deleted", "The IPO opportunity was successfully removed.");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error("Failed to Delete IPO", res.error || "Could not delete IPO.");
      }
    } catch (err: unknown) {
      toast.error("Server Error", err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setActionInProgressId(null);
    }
  }

  function formatAddedDate(dateStr?: string) {
    if (!dateStr) return "24 Aug 2026, 09:47 am";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  }

  function getIpoGradient(name: string) {
    const hash = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      "from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/30",
      "from-indigo-500/20 to-violet-500/10 text-indigo-300 border-indigo-500/30",
      "from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/30",
      "from-sky-500/20 to-blue-500/10 text-sky-300 border-sky-500/30",
      "from-rose-500/20 to-pink-500/10 text-rose-300 border-rose-500/30",
      "from-cyan-500/20 to-teal-500/10 text-cyan-300 border-cyan-500/30",
    ];
    return gradients[hash % gradients.length];
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPLICATION_OPEN":
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Open
          </span>
        );
      case "ALLOTMENT_OUT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-sans tracking-wide">
            <Clock className="h-3 w-3 text-indigo-400" />
            Allotment Out
          </span>
        );
      case "UPCOMING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 font-sans tracking-wide">
            Upcoming
          </span>
        );
      case "CLOSED":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 font-sans tracking-wide">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-sans tracking-wide">
            {status}
          </span>
        );
    }
  }

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Current formatted date
  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Greeting Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white">
            {greetingText}, <span className="text-blue-500">Ankit</span>.
          </h1>
          <p className="text-[13.5px] text-zinc-400 font-normal leading-relaxed">
            Your private IPO investment workspace & administrative controller.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 shadow-xs font-sans">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            <span>{todayFormatted}</span>
          </div>

          {/* Add IPO Button */}
          <Button
            onClick={handleOpenAdd}
            className="h-9 px-4 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer tracking-tight transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add IPO</span>
          </Button>
        </div>
      </div>

      {/* Current Open IPOs Section Header */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">
            Current Open IPOs
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 font-sans tracking-wide">
            {openIpos.length} Active
          </span>
        </div>

        {/* Open IPO Cards Grid */}
        {openIpos.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
            <Layers className="h-8 w-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No active open IPOs at this moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {openIpos.map((ipo) => {
              const initials = ipo.logo || (ipo.name
                ? ipo.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "IP");

              const minInvestmentVal = typeof ipo.metrics?.minInvestment === "number" && ipo.metrics.minInvestment > 0
                ? `₹${ipo.metrics.minInvestment.toLocaleString("en-IN")}`
                : "—";

              const issueSizeVal = ipo.metrics?.issueSize ? ipo.metrics.issueSize : "—";
              const gmpVal = typeof ipo.metrics?.gmpPercent === "number"
                ? `${ipo.metrics.gmpPercent > 0 ? "+" : ""}${ipo.metrics.gmpPercent}%`
                : null;
              const closeDateVal = ipo.metrics?.closeDate || "—";
              const groupDecisionText = ipo.groupDecision || ipo.biddingDecision || ipo.thesis || "No decision recorded";
              const groupDecisionAuthor = ipo.groupDecisionAuthor || ipo.createdBy || "Super Admin";

              return (
                <div
                  key={ipo.id}
                  className="rounded-2xl border border-emerald-500/25 bg-[#090e0b]/90 p-5 sm:p-6 shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)] space-y-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-[0_4px_25px_-5px_rgba(16,185,129,0.18)]"
                >
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Avatar, Category, Name, Added Date */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 font-semibold text-xs flex items-center justify-center font-mono shrink-0 shadow-inner">
                        {initials}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase tracking-wider inline-block font-sans">
                          {ipo.category || "Mainboard"}
                        </span>
                        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                          <span>{ipo.name}</span>
                          {ipo.registrarUrl && (
                            <a
                              href={ipo.registrarUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Registrar URL"
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </h3>
                        <div className="text-[12px] text-zinc-400 flex items-center gap-1.5 font-sans">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" />
                          <span>Added: <strong className="font-semibold text-zinc-200">{formatAddedDate(ipo.createdAt || ipo.addedAt)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & GMP Pill */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5 font-sans uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Application Open</span>
                      </div>

                      {gmpVal ? (
                        <div className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center gap-1.5 font-sans tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span>GMP {gmpVal} ↗</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-zinc-900 text-zinc-500 border border-zinc-800 font-sans">
                          GMP —
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="bg-[#0b120e]/60 border border-emerald-950/60 rounded-xl p-4 space-y-1.5">
                      <div className="text-[11px] font-medium text-zinc-500 tracking-wider uppercase font-sans">
                        MIN INVESTMENT
                      </div>
                      <div className="text-2xl font-bold text-white font-sans t-num tracking-tight">
                        {minInvestmentVal}
                      </div>
                    </div>

                    <div className="bg-[#0b120e]/60 border border-emerald-950/60 rounded-xl p-4 space-y-1.5">
                      <div className="text-[11px] font-medium text-zinc-500 tracking-wider uppercase font-sans">
                        ISSUE SIZE
                      </div>
                      <div className="text-2xl font-bold text-white font-sans t-num tracking-tight">
                        {issueSizeVal}
                      </div>
                    </div>
                  </div>

                  {/* Group Decision Box */}
                  <div className="bg-[#0b120e]/80 border border-emerald-900/40 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Group Decision</span>
                    </div>
                    <div className="text-[13.5px] font-medium text-zinc-200 font-sans leading-normal">
                      {groupDecisionText}
                    </div>
                    <div className="text-[11.5px] text-zinc-500 font-normal">
                      Authored by: <span className="font-semibold text-zinc-300">{groupDecisionAuthor}</span>
                    </div>
                  </div>

                  {/* Footer Actions Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-900/80">
                    {/* Closes Pill */}
                    <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-400 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto font-sans">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Closes {closeDateVal}</span>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/ad/applications?ipoId=${ipo.id}`} prefetch={false}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3.5 text-xs font-medium bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800 gap-1.5 cursor-pointer rounded-xl shadow-xs"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Applications ({ipo.applicationCount ?? 0})</span>
                        </Button>
                      </Link>

                      <Button
                        onClick={() => handleOpenEdit(ipo)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3.5 text-xs font-medium bg-blue-950/50 hover:bg-blue-900/50 text-blue-400 border border-blue-900/70 gap-1.5 cursor-pointer rounded-xl shadow-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-blue-400" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        onClick={() => handleCompleteIpo(ipo.id)}
                        disabled={actionInProgressId === ipo.id}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3.5 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/80 gap-1.5 cursor-pointer rounded-xl shadow-xs"
                      >
                        {actionInProgressId === ipo.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        <span>Complete</span>
                      </Button>

                      {deleteConfirmId === ipo.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => handleDeleteIpo(ipo.id)}
                            disabled={actionInProgressId === ipo.id}
                            size="sm"
                            className="h-8 px-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer rounded-xl shadow-xs"
                          >
                            Confirm Delete
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmId(null)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-zinc-400 hover:text-white cursor-pointer rounded-xl"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setDeleteConfirmId(ipo.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer rounded-xl transition-colors"
                          title="Delete IPO"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Complete IPO Catalog Table Section */}
      <div className="space-y-4 pt-6 border-t border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[15px] font-semibold text-zinc-100 tracking-tight font-sans">
              All Registered IPOs
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
              {total}
            </span>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-150", searchQuery ? "text-emerald-400" : "text-zinc-500")} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleClearSearch();
                  }
                }}
                placeholder="Search IPOs..."
                className="pl-8 pr-7 bg-zinc-950/90 border-zinc-800 text-xs h-9 w-48 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/50 rounded-xl transition-colors duration-150"
              />
              {isPending && searchQuery && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                </span>
              )}
              {!isPending && searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded cursor-pointer transition-all duration-150 active:scale-95"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </form>

          </div>
        </div>

        {/* Table Container */}
        <div className={cn("bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs backdrop-blur-xs transition-opacity duration-150 relative", isPending && "opacity-60 pointer-events-none")}>
          {isPending && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse z-10" />
          )}
          {initialIpos.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-200">
                  {searchQuery || selectedStatus !== "ALL" || selectedCategory !== "ALL" ? "No IPO records found" : "No registered IPOs"}
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {searchQuery || selectedStatus !== "ALL" || selectedCategory !== "ALL"
                    ? "Try adjusting your search query or filter criteria to find what you are looking for."
                    : "There are currently no IPO records in the catalog."}
                </p>
              </div>
              {(searchQuery || selectedStatus !== "ALL" || selectedCategory !== "ALL") && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedStatus("ALL");
                      setSelectedCategory("ALL");
                      applyFilters("", "ALL", "ALL", 1);
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
              <table className="w-full text-left text-[13px] text-zinc-300 font-sans">
                <thead className="bg-zinc-950/90 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">IPO Name</th>
                    <th className="py-3 px-3">Min Inv / Lot</th>
                    <th className="py-3 px-3">Issue Size / GMP</th>
                    <th className="py-3 px-3">Closing Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {initialIpos.map((ipo) => {
                    return (
                      <tr key={ipo.id} className="hover:bg-zinc-800/40 transition-colors duration-150 group">
                        {/* 1. IPO Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-100 text-[13.5px] flex items-center gap-1.5 group-hover:text-white transition-colors">
                            <span>{ipo.name}</span>
                            {ipo.registrarUrl && (
                              <a
                                href={ipo.registrarUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open Registrar"
                                className="text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* 4. Min Inv / Lot */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <div className="text-zinc-100 font-semibold font-sans text-[13px] t-num">
                              ₹{(ipo.metrics?.minInvestment || 0).toLocaleString("en-IN")}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              Lot Size: <span className="font-sans text-zinc-300 t-num">{ipo.metrics?.lotSize || 1}</span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Issue Size / GMP */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <div className="text-zinc-200 font-semibold font-sans text-[13px] t-num">
                              {ipo.metrics?.issueSize || "—"}
                            </div>
                            <div className="text-[11px] font-medium">
                              {ipo.metrics?.gmpPercent ? (
                                <span className="text-emerald-400 font-sans">GMP: +{ipo.metrics.gmpPercent}%</span>
                              ) : (
                                <span className="text-zinc-500 font-sans">GMP: —</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 6. Closing Date */}
                        <td className="py-3.5 px-3 text-xs font-sans">
                          <div className="flex items-center gap-1.5 text-zinc-300 text-[12.5px]">
                            <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="font-medium text-zinc-200 font-sans t-num">{ipo.metrics?.closeDate || "—"}</span>
                          </div>
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Tooltip content="View applications" side="top">
                              <Link href={`/ad/applications?ipoId=${ipo.id}`} prefetch={true}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer transition-all duration-150 active:scale-95"
                                  aria-label="View Applications"
                                >
                                  <FileSpreadsheet className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </Tooltip>

                            <Tooltip content="Edit IPO" side="top">
                              <Button
                                onClick={() => handleOpenEdit(ipo)}
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/70 text-[11.5px] font-medium transition-all duration-150 shadow-xs gap-1 cursor-pointer active:scale-95"
                              >
                                <Edit2 className="h-3 w-3 text-indigo-400" />
                                <span>Edit</span>
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400 font-sans">
            <div>
              Showing all <strong className="text-zinc-200">{initialIpos.length}</strong> registered offerings
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 px-2.5 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-zinc-400 font-mono text-[11px]">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit IPO Modal */}
      {isModalOpen && (
        <IpoModal
          initialData={editingIpo}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIpo(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingIpo(null);
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      )}
    </div>
  );
}

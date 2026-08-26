"use client";

import React, { useState, useRef, useTransition, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ApplicationRecord,
  ApplicationMetricsSummary,
  IpoOption,
} from "@/types/application";
import {
  MemberOption,
  quickUpdateApplicationStatus,
  bulkUpdateApplicationStatus,
  getAllIpoApplicationsForCopy,
  exportIpoApplicationsText,
} from "@/lib/application/actions";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  CheckCircle2,
  Clock,
  Coins,
  Building,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  X,
  Copy,
  Check,
  Edit2,
  Trash2,
  Plus,
  Eye,
  XCircle,
  Filter as FilterIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { cn, formatCombinedApplicants } from "@/lib/utils";
import { CreateSoloApplicationsModal } from "@/components/application/create-solo-applications-modal";
import { EditApplicationModal } from "@/components/application/edit-application-modal";
import { DeleteApplicationModal } from "@/components/application/delete-application-modal";
import { ApplicationDetailsDrawer } from "@/components/application/application-details-drawer";
import { BulkDeleteModal } from "@/components/application/bulk-delete-modal";
import { OfferingSelectDropdown } from "@/components/ui/offering-select-dropdown";

interface ApplicationManagementViewProps {
  initialApplications: ApplicationRecord[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  metrics: ApplicationMetricsSummary;
  availableIpos: IpoOption[];
  availableStatuses: string[];
  selectedIpoId: string;
  selectedIpoName: string | null;
  members?: MemberOption[];
}

export function ApplicationManagementView({
  initialApplications,
  total,
  currentPage,
  totalPages,
  limit,
  metrics: initialMetrics,
  availableIpos,
  availableStatuses,
  selectedIpoId,
  selectedIpoName,
  members = [],
}: ApplicationManagementViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Local synchronized state
  const [applications, setApplications] = useState<ApplicationRecord[]>(initialApplications);
  const [metrics, setMetrics] = useState<ApplicationMetricsSummary>(initialMetrics);

  useEffect(() => {
    setApplications(initialApplications);
    setMetrics(initialMetrics);
  }, [initialApplications, initialMetrics]);

  // Modals and Drawer state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<ApplicationRecord | null>(null);
  const [deletingApplication, setDeletingApplication] = useState<ApplicationRecord | null>(null);
  const [drawerApplication, setDrawerApplication] = useState<ApplicationRecord | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Filter Bar state
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || searchParams.get("search") || ""
  );
  const [selectedMemberId, setSelectedMemberId] = useState(searchParams.get("memberId") || "ALL");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "ALL");
  const [selectedFunding, setSelectedFunding] = useState(
    searchParams.get("fundingStructure") || "ALL"
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [minAmount, setMinAmount] = useState(searchParams.get("minAmount") || "");
  const [maxAmount, setMaxAmount] = useState(searchParams.get("maxAmount") || "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting state
  const sortField = searchParams.get("sort") || "createdAt";
  const sortOrder = (searchParams.get("order") as "asc" | "desc") || "desc";

  // Bulk Selection state (stores unique application document IDs)
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false);

  const [copiedPan, setCopiedPan] = useState<string | null>(null);
  const [isIpoDataCopied, setIsIpoDataCopied] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialIpoRestoredRef = useRef(false);

  // Count active non-default filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedIpoId && selectedIpoId !== "ALL") count++;
    if (selectedMemberId && selectedMemberId !== "ALL") count++;
    if (selectedStatus && selectedStatus !== "ALL") count++;
    if (selectedFunding && selectedFunding !== "ALL") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (minAmount) count++;
    if (maxAmount) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [
    selectedIpoId,
    selectedMemberId,
    selectedStatus,
    selectedFunding,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    searchQuery,
  ]);

  function handleCopyPan(pan: string) {
    if (!pan || pan === "—") return;
    navigator.clipboard.writeText(pan);
    setCopiedPan(pan);
    setTimeout(() => {
      setCopiedPan(null);
    }, 1800);
  }

  // Restore persistent IPO on client mount strictly once if no explicit URL param
  useEffect(() => {
    if (isInitialIpoRestoredRef.current) return;
    isInitialIpoRestoredRef.current = true;

    if (!searchParams.get("ipoId")) {
      try {
        const storedIpo = localStorage.getItem("orbit_selected_ipo_id");
        if (
          storedIpo &&
          storedIpo !== "ALL" &&
          availableIpos.some((i) => i.id === storedIpo) &&
          storedIpo !== selectedIpoId
        ) {
          applyFilters({ ipoId: storedIpo, page: 1 });
        }
      } catch {}
    }
  }, []);

  // Master URL filter application
  function applyFilters(overrides: {
    q?: string;
    ipoId?: string;
    memberId?: string;
    status?: string;
    fundingStructure?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: string;
    maxAmount?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
  } = {}) {
    const nextQ = overrides.q !== undefined ? overrides.q : searchQuery;
    const nextIpo = overrides.ipoId !== undefined ? overrides.ipoId : selectedIpoId;
    const nextMember = overrides.memberId !== undefined ? overrides.memberId : selectedMemberId;
    const nextStatus = overrides.status !== undefined ? overrides.status : selectedStatus;
    const nextFunding = overrides.fundingStructure !== undefined ? overrides.fundingStructure : selectedFunding;
    const nextDateFrom = overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
    const nextDateTo = overrides.dateTo !== undefined ? overrides.dateTo : dateTo;
    const nextMinAmt = overrides.minAmount !== undefined ? overrides.minAmount : minAmount;
    const nextMaxAmt = overrides.maxAmount !== undefined ? overrides.maxAmount : maxAmount;
    const nextPage = overrides.page !== undefined ? overrides.page : 1;
    const nextLimit = overrides.limit !== undefined ? overrides.limit : limit;
    const nextSort = overrides.sort !== undefined ? overrides.sort : sortField;
    const nextOrder = overrides.order !== undefined ? overrides.order : sortOrder;

    if (nextIpo && nextIpo !== "ALL") {
      try {
        localStorage.setItem("orbit_selected_ipo_id", nextIpo);
      } catch {}
    } else {
      try {
        localStorage.removeItem("orbit_selected_ipo_id");
      } catch {}
    }

    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextIpo && nextIpo !== "ALL") params.set("ipoId", nextIpo);
    if (nextMember && nextMember !== "ALL") params.set("memberId", nextMember);
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextFunding && nextFunding !== "ALL") params.set("fundingStructure", nextFunding);
    if (nextDateFrom) params.set("dateFrom", nextDateFrom);
    if (nextDateTo) params.set("dateTo", nextDateTo);
    if (nextMinAmt) params.set("minAmount", nextMinAmt);
    if (nextMaxAmt) params.set("maxAmount", nextMaxAmt);
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextLimit !== 500) params.set("limit", String(nextLimit));
    if (nextSort !== "createdAt") params.set("sort", nextSort);
    if (nextOrder !== "desc") params.set("order", nextOrder);

    startTransition(() => {
      router.push(`/ad/applications?${params.toString()}`);
    });
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      applyFilters({ q: val, page: 1 });
    }, 250);
  }

  function handleClearAllFilters() {
    setSearchQuery("");
    setSelectedMemberId("ALL");
    setSelectedStatus("ALL");
    setSelectedFunding("ALL");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    try {
      localStorage.removeItem("orbit_selected_ipo_id");
    } catch {}
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters({
      q: "",
      ipoId: "ALL",
      memberId: "ALL",
      status: "ALL",
      fundingStructure: "ALL",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
      page: 1,
    });
  }

  function handleSortToggle(field: string) {
    let nextOrder: "asc" | "desc" = "asc";
    if (sortField === field) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    applyFilters({ sort: field, order: nextOrder, page: 1 });
  }

  // Flatten every single PAN card into its own individual application row
  const flattenedPanRows = useMemo(() => {
    return applications.flatMap((app) => {
      const pans = app.panNumbers && app.panNumbers.length > 0 ? app.panNumbers : ["—"];
      const perPanCapital = Math.round(
        (app.totalContribution || 0) / (pans.length || 1)
      );

      return pans.map((pan, idx) => ({
        rowKey: `${app.id}_pan_${idx}_${pan}`,
        app,
        panNumber: pan,
        panIndex: idx,
        capital: perPanCapital || app.totalContribution || 0,
      }));
    });
  }, [applications]);

  // Selection handlers
  const allCurrentPageSelected =
    applications.length > 0 && applications.every((a) => selectedAppIds.has(a.id));
  const someCurrentPageSelected =
    applications.some((a) => selectedAppIds.has(a.id)) && !allCurrentPageSelected;

  function handleToggleSelectAll() {
    if (allCurrentPageSelected) {
      setSelectedAppIds((prev) => {
        const next = new Set(prev);
        applications.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedAppIds((prev) => {
        const next = new Set(prev);
        applications.forEach((a) => next.add(a.id));
        return next;
      });
    }
  }

  function handleToggleRowSelect(appId: string) {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  }

  const selectedApplicationsList = useMemo(() => {
    return applications.filter((a) => selectedAppIds.has(a.id));
  }, [applications, selectedAppIds]);

  // Bulk status update action
  async function handleBulkStatusChange(newStatus: string) {
    if (selectedAppIds.size === 0 || isBulkUpdatingStatus) return;
    setIsBulkUpdatingStatus(true);

    const ids = Array.from(selectedAppIds);
    try {
      const res = await bulkUpdateApplicationStatus(ids, newStatus);
      if (res.success) {
        setApplications((prev) =>
          prev.map((app) =>
            selectedAppIds.has(app.id)
              ? { ...app, status: newStatus, allotmentStatus: newStatus }
              : app
          )
        );
        toast.success(
          "Status Updated",
          `Updated ${res.count || ids.length} application(s) to ${newStatus}.`
        );
        setSelectedAppIds(new Set());
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error("Bulk Status Failed", res.error || "Could not update status.");
      }
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to bulk update status.");
    } finally {
      setIsBulkUpdatingStatus(false);
    }
  }

  // Quick inline status change for single row
  async function handleSingleQuickStatus(appId: string, newStatus: string) {
    try {
      const res = await quickUpdateApplicationStatus(appId, newStatus);
      if (res.success) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId ? { ...a, status: newStatus, allotmentStatus: newStatus } : a
          )
        );
        toast.success("Status Updated", `Application status set to ${newStatus}.`);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error("Failed", res.error || "Could not update status.");
      }
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  // Mutation Callbacks
  function handleCreatedApplications(createdApps: ApplicationRecord[]) {
    setApplications((prev) => [...createdApps, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      totalApplications: prev.totalApplications + createdApps.length,
      totalFormsCount: (prev.totalFormsCount || 0) + createdApps.length,
      awaitingAllotment: prev.awaitingAllotment + createdApps.length,
      totalCapitalPooled:
        prev.totalCapitalPooled +
        createdApps.reduce((acc, a) => acc + (a.totalContribution || 0), 0),
    }));
    startTransition(() => {
      router.refresh();
    });
  }

  function handleUpdatedApplication(updatedApp: ApplicationRecord) {
    setApplications((prev) =>
      prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
    );
    if (drawerApplication?.id === updatedApp.id) {
      setDrawerApplication(updatedApp);
    }
    startTransition(() => {
      router.refresh();
    });
  }

  function handleDeletedApplication(deletedAppId: string) {
    const deletedApp = applications.find((a) => a.id === deletedAppId);
    const panCount = deletedApp?.numberOfPanCards || 1;
    const capital = Number(deletedApp?.totalContribution) || 0;

    setApplications((prev) => prev.filter((app) => app.id !== deletedAppId));
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      next.delete(deletedAppId);
      return next;
    });
    if (drawerApplication?.id === deletedAppId) {
      setDrawerApplication(null);
    }
    setMetrics((prev) => ({
      ...prev,
      totalApplications: Math.max(0, prev.totalApplications - panCount),
      totalFormsCount: Math.max(0, (prev.totalFormsCount || panCount) - panCount),
      totalCapitalPooled: Math.max(0, prev.totalCapitalPooled - capital),
    }));
    startTransition(() => {
      router.refresh();
    });
  }

  function handleBulkDeleted(deletedIds: string[]) {
    const idSet = new Set(deletedIds);
    const deletedApps = applications.filter((a) => idSet.has(a.id));
    const totalPans = deletedApps.reduce((acc, a) => acc + (a.numberOfPanCards || 1), 0);
    const totalCapital = deletedApps.reduce((acc, a) => acc + (Number(a.totalContribution) || 0), 0);

    setApplications((prev) => prev.filter((app) => !idSet.has(app.id)));
    setSelectedAppIds(new Set());
    setMetrics((prev) => ({
      ...prev,
      totalApplications: Math.max(0, prev.totalApplications - totalPans),
      totalFormsCount: Math.max(0, (prev.totalFormsCount || totalPans) - totalPans),
      totalCapitalPooled: Math.max(0, prev.totalCapitalPooled - totalCapital),
    }));
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCopyIpoApplications() {
    try {
      const res = await exportIpoApplicationsText(selectedIpoId);
      if (!res.success || !res.text || res.count === 0) {
        toast.info("No Applications", "There are no applications available to copy.");
        return;
      }

      await navigator.clipboard.writeText(res.text);
      setIsIpoDataCopied(true);
      toast.success(
        "Copied to Clipboard",
        `Copied all ${res.count} application filings for ${res.ipoName}.`
      );
      setTimeout(() => setIsIpoDataCopied(false), 2500);
    } catch {
      toast.error("Copy Failed", "Unable to write to clipboard.");
    }
  }

  function formatTimestamp(timestamp?: string | Date) {
    if (!timestamp) return { date: "—", time: "" };
    try {
      const d = new Date(timestamp);
      const dateStr = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return { date: dateStr, time: timeStr };
    } catch {
      return { date: String(timestamp), time: "" };
    }
  }

  function getStatusBadge(status?: string) {
    switch (status) {
      case "ALLOTTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <CheckCircle2 className="h-3 w-3" />
            ALLOTTED
          </span>
        );
      case "NOT_ALLOTTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
            <XCircle className="h-3 w-3" />
            NOT ALLOTTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            <Clock className="h-3 w-3" />
            AWAITING
          </span>
        );
    }
  }

  const totalAllAppsCount = availableIpos.reduce((acc, i) => acc + i.count, 0);
  const totalApplicationsCount = metrics.totalFormsCount || metrics.totalApplications || flattenedPanRows.length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-100">
              Applications
            </h1>
            <span className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider font-mono uppercase">
              NEXO POOL
            </span>
          </div>
        </div>

        {/* Top Header Actions Cluster (Clean single row) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Primary Action Button */}
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl shadow-sm border border-zinc-200/80 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shrink-0"
          >
            <Plus className="h-4 w-4 text-zinc-950" />
            <span>Create Applications</span>
          </Button>

          {/* Check IPOs Link */}
          <Link href="/ad/ipo" className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 text-xs font-medium border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>Check IPOs</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
            </Button>
          </Link>

          {/* Copy IPO Applications Button */}
          <Button
            type="button"
            onClick={handleCopyIpoApplications}
            variant="outline"
            size="sm"
            className={cn(
              "h-10 px-3.5 text-xs font-medium border-zinc-800 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs shrink-0",
              isIpoDataCopied
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/40"
                : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:border-zinc-700"
            )}
            title="Copy all application records for the current IPO in standard format"
          >
            {isIpoDataCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-zinc-400" />
                <span>Copy IPO Data</span>
              </>
            )}
          </Button>

          {/* Unified Offering Selector - Styled & Pinned at Far Right */}
          <OfferingSelectDropdown
            items={availableIpos}
            value={selectedIpoId}
            onChange={(id) => applyFilters({ ipoId: id, page: 1 })}
            includeAllOption={true}
            allOptionLabel="All IPOs"
            totalAllCount={totalAllAppsCount}
            className="w-[270px]"
          />
        </div>
      </div>

      {/* Summary Metrics Grid (3 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Total Applications */}
        <div className="relative overflow-hidden group bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4.5 space-y-2 transition-all duration-200 shadow-xs">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-sans">
              Total Applications
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-zinc-100 tracking-tight t-num font-sans">
            {metrics.totalFormsCount || metrics.totalApplications}
          </div>
          <div className="text-[11.5px] text-zinc-500 flex items-center gap-1.5 font-sans">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400/80" />
            <span>{selectedIpoId === "ALL" ? "Across all offerings" : (selectedIpoName || "Filtered")}</span>
          </div>
        </div>

        {/* Allotted Outcome */}
        <div className="relative overflow-hidden group bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4.5 space-y-2 transition-all duration-200 shadow-xs">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400 font-sans">
              Allotted Outcome
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-emerald-300 tracking-tight t-num font-sans">
            {metrics.allottedApplications}
          </div>
          <div className="text-[11.5px] text-zinc-500 flex items-center gap-1.5 font-sans">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span>
              {metrics.notAllottedApplications} Not Allotted
              {metrics.awaitingAllotment > 0 ? ` • ${metrics.awaitingAllotment} Pending` : ""}
            </span>
          </div>
        </div>

        {/* Total Capital Pooled */}
        <div className="relative overflow-hidden group bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4.5 space-y-2 transition-all duration-200 shadow-xs">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-cyan-400 font-sans">
              Total Capital Pooled
            </span>
            <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Coins className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-cyan-200 tracking-tight t-num font-sans">
            ₹{metrics.totalCapitalPooled.toLocaleString("en-IN")}
          </div>
          <div className="text-[11.5px] text-zinc-500 flex items-center gap-1.5 font-sans">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
            <span>{((metrics.totalCapitalPooled / 100000).toFixed(2))} Lakhs Total</span>
          </div>
        </div>
      </div>

      {/* Advanced Search and Composite Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by username (@user), name, PAN card, app ID, or status..."
              className="pl-10 pr-9 h-10.5 bg-zinc-900/70 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-2xl focus-visible:ring-blue-500/40 focus-visible:border-blue-500/60 shadow-xs"
            />
            {isPending && searchQuery && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <svg className="h-4 w-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </span>
            )}
            {!isPending && searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  applyFilters({ q: "", page: 1 });
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selectors & Filter Toggle */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {/* User Selector */}
            <div className="relative">
              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  applyFilters({ memberId: e.target.value, page: 1 });
                }}
                className="h-10.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 pl-3.5 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-xs max-w-[160px] truncate"
              >
                <option value="ALL" className="bg-zinc-900 text-zinc-200">User: All</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-200">
                    @{m.username} ({m.name})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  applyFilters({ status: e.target.value, page: 1 });
                }}
                className="h-10.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 pl-3.5 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-xs"
              >
                <option value="ALL" className="bg-zinc-900 text-zinc-200">Status: All</option>
                {availableStatuses.map((st) => (
                  <option key={st} value={st} className="bg-zinc-900 text-zinc-200">
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>

            {/* Funding Structure Filter */}
            <div className="relative">
              <select
                value={selectedFunding}
                onChange={(e) => {
                  setSelectedFunding(e.target.value);
                  applyFilters({ fundingStructure: e.target.value, page: 1 });
                }}
                className="h-10.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 pl-3.5 pr-8 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all appearance-none cursor-pointer shadow-xs"
              >
                <option value="ALL" className="bg-zinc-900 text-zinc-200">Type: All</option>
                <option value="SOLO" className="bg-zinc-900 text-zinc-200">Solo</option>
                <option value="MULTI_FRIEND" className="bg-zinc-900 text-zinc-200">Multi-Friend Split</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>

            {/* Advanced Filters Button with Active Count */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "h-10.5 px-3.5 text-xs font-medium border-zinc-800 rounded-2xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs",
                showAdvancedFilters || activeFiltersCount > 0
                  ? "bg-blue-950/40 text-blue-300 border-blue-500/40"
                  : "bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-[10px] font-mono font-bold text-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* Reset Filters CTA if active */}
            {activeFiltersCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-10.5 px-3 text-xs text-zinc-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-2xl cursor-pointer transition-colors"
                title="Reset all search queries and filters"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer Panel */}
        {showAdvancedFilters && (
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 font-mono">
              <span className="flex items-center gap-1.5">
                <FilterIcon className="h-3.5 w-3.5 text-blue-400" />
                COMPOSITE FILTER CRITERIA
              </span>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] text-zinc-500 hover:text-rose-400 font-sans cursor-pointer transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {/* Date From */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-zinc-500" />
                  Date From:
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    applyFilters({ dateFrom: e.target.value, page: 1 });
                  }}
                  className="h-8.5 bg-zinc-950 border-zinc-800 text-xs font-sans text-zinc-200 rounded-xl"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-zinc-500" />
                  Date To:
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    applyFilters({ dateTo: e.target.value, page: 1 });
                  }}
                  className="h-8.5 bg-zinc-950 border-zinc-800 text-xs font-sans text-zinc-200 rounded-xl"
                />
              </div>

              {/* Min Capital */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <Coins className="h-3 w-3 text-zinc-500" />
                  Min Capital (₹):
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value);
                    applyFilters({ minAmount: e.target.value, page: 1 });
                  }}
                  className="h-8.5 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-200 rounded-xl"
                />
              </div>

              {/* Max Capital */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <Coins className="h-3 w-3 text-zinc-500" />
                  Max Capital (₹):
                </label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value);
                    applyFilters({ maxAmount: e.target.value, page: 1 });
                  }}
                  className="h-8.5 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating / Sticky Bulk Action Toolbar (appears when items are selected) */}
      {selectedAppIds.size > 0 && (
        <div className="p-3 bg-blue-950/70 border border-blue-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md shadow-lg shadow-blue-950/40">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-100 font-mono">
              {selectedAppIds.size} {selectedAppIds.size === 1 ? "application" : "applications"} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedAppIds(new Set())}
              className="text-[11.5px] text-zinc-400 hover:text-zinc-200 underline font-sans ml-1 cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Status Updater */}
            <div className="relative">
              <select
                disabled={isBulkUpdatingStatus}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="h-8.5 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-xl pl-2.5 pr-7 focus:outline-hidden cursor-pointer appearance-none shadow-xs"
              >
                <option value="" disabled>
                  {isBulkUpdatingStatus ? "Updating..." : "Change Status to..."}
                </option>
                <option value="AWAITING">AWAITING</option>
                <option value="ALLOTTED">ALLOTTED</option>
                <option value="NOT_ALLOTTED">NOT_ALLOTTED</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 pointer-events-none" />
            </div>

            {/* Bulk Delete Trigger */}
            <Button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              size="sm"
              className="h-8.5 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedAppIds.size})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Applications Table (Each row represents a single PAN Application) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 tracking-wider font-mono">
            <FileSpreadsheet className="h-4 w-4 text-blue-400" />
            <span>
              APPLICATIONS ({totalApplicationsCount})
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11.5px] text-zinc-400 font-sans">
            <span>Showing all {flattenedPanRows.length} filing rows</span>
          </div>
        </div>

        <div className={cn("bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xs transition-opacity duration-150 relative", isPending && "opacity-60 pointer-events-none")}>
          {isPending && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 animate-pulse z-10" />
          )}

          {flattenedPanRows.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <Layers className="h-10 w-10 text-zinc-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-200">
                  {activeFiltersCount > 0 ? "No applications match your current filters." : "No applications yet"}
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {activeFiltersCount > 0
                    ? "Try adjusting your search query, status, user, or date ranges to find what you are looking for."
                    : "Get started by creating solo application filings for syndicate members."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                {activeFiltersCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearAllFilters}
                    size="sm"
                    className="h-8.5 px-4 text-xs font-medium border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    size="sm"
                    className="h-8.5 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create Solo Applications
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] text-zinc-300">
                <thead className="bg-zinc-950/90 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800 font-sans">
                  <tr>
                    {/* Checkbox Column */}
                    <th className="py-3 px-3.5 w-10">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center justify-center"
                        title={allCurrentPageSelected ? "Deselect page" : "Select all on page"}
                      >
                        {allCurrentPageSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-400" />
                        ) : someCurrentPageSelected ? (
                          <MinusSquare className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Square className="h-4 w-4 text-zinc-600 hover:text-zinc-400" />
                        )}
                      </button>
                    </th>

                    {/* Row # */}
                    <th className="py-3 px-2 w-12 text-zinc-500">#</th>

                    {/* Applicant / User (Sortable) */}
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleSortToggle("applicantName")}
                        className="flex items-center gap-1 hover:text-zinc-200 transition-colors uppercase cursor-pointer"
                      >
                        <span>APPLICANT / USER</span>
                        {sortField === "applicantName" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                        )}
                      </button>
                    </th>

                    {/* Single PAN Card Column */}
                    <th className="py-3 px-3">PAN CARD</th>

                    {/* Filing Date (Sortable) */}
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleSortToggle("createdAt")}
                        className="flex items-center gap-1 hover:text-zinc-200 transition-colors uppercase cursor-pointer"
                      >
                        <span>DATE</span>
                        {sortField === "createdAt" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                        )}
                      </button>
                    </th>

                    {/* Actions */}
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {flattenedPanRows.map((item, index) => {
                    const rowNumber = String(index + 1).padStart(2, "0");
                    const isSelected = selectedAppIds.has(item.app.id);
                    const displayUser = formatCombinedApplicants(item.app);

                    return (
                      <tr
                        key={item.rowKey}
                        onClick={(e) => {
                          // Ignore row clicks if clicking button/input/select/link
                          const target = e.target as HTMLElement;
                          if (target.closest("button, select, input, a")) return;
                          setDrawerApplication(item.app);
                        }}
                        className={cn(
                          "hover:bg-zinc-800/30 transition-colors group cursor-pointer",
                          isSelected && "bg-blue-950/20 hover:bg-blue-950/30"
                        )}
                      >
                        {/* 1. Selection Checkbox */}
                        <td className="py-3.5 px-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRowSelect(item.app.id);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center justify-center"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Square className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500" />
                            )}
                          </button>
                        </td>

                        {/* Row # */}
                        <td className="py-3.5 px-2 text-zinc-500 text-xs font-mono font-medium">
                          {rowNumber}
                        </td>

                        {/* 2. Applicant / User */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <MemberAvatar
                              src={item.app.memberAvatar}
                              name={item.app.applicantName}
                              className="h-7 w-7 rounded-lg text-[10px] shrink-0"
                            />
                            <div className="font-semibold text-zinc-100 text-[13.5px]">
                              <span>{displayUser}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Single PAN Card */}
                        <td className="py-3.5 px-3">
                          {item.panNumber !== "—" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPan(item.panNumber);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-200 font-mono text-[12px] hover:border-zinc-700 hover:bg-zinc-800 transition-all cursor-pointer group/pan"
                              title="Click to copy PAN"
                            >
                              {copiedPan === item.panNumber ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-zinc-500 group-hover/pan:text-zinc-300 shrink-0 transition-colors" />
                              )}
                              <span className="tracking-wider text-zinc-100 font-semibold">{item.panNumber}</span>
                            </button>
                          ) : (
                            <span className="text-zinc-600 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* 4. Date & Time */}
                        <td className="py-3.5 px-3 text-xs font-sans">
                          {(() => {
                            const dt = formatTimestamp(item.app.createdAt);
                            return (
                              <div className="flex items-center gap-1.5 text-zinc-300">
                                <span>{dt.date}</span>
                                {dt.time && (
                                  <span className="text-zinc-500 font-mono text-[11px]">
                                    {dt.time}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Inspect Drawer */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerApplication(item.app);
                              }}
                              className="h-7.5 w-7.5 p-0 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                              title="Open Application Details Drawer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Full Edit Modal */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingApplication(item.app);
                              }}
                              className="h-7.5 w-7.5 p-0 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                              title="Edit Application Details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            {/* Delete Confirmation Modal */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingApplication(item.app);
                              }}
                              className="h-7.5 w-7.5 p-0 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                              title="Delete Application"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Summary & Pagination */}
          <div className="px-4 py-3.5 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-sans">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>
                Showing <strong className="text-zinc-200">{flattenedPanRows.length}</strong> of{" "}
                <strong className="text-zinc-200">{metrics.totalApplications || metrics.totalFormsCount || flattenedPanRows.length}</strong> application filings
              </span>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-mono text-[11px]">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyFilters({ page: Math.max(1, currentPage - 1) })}
                    disabled={currentPage <= 1 || isPending}
                    className="h-7.5 w-7.5 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white rounded-lg disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyFilters({ page: Math.min(totalPages, currentPage + 1) })}
                    disabled={currentPage >= totalPages || isPending}
                    className="h-7.5 w-7.5 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white rounded-lg disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-[11.5px] text-zinc-500 font-mono">
                ALL APPLICATIONS LOADED
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals & Slide-over Drawer */}
      {isCreateModalOpen && (
        <CreateSoloApplicationsModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          defaultIpoId={selectedIpoId !== "ALL" ? selectedIpoId : undefined}
          onCreated={handleCreatedApplications}
        />
      )}

      {editingApplication && (
        <EditApplicationModal
          isOpen={!!editingApplication}
          onClose={() => setEditingApplication(null)}
          application={editingApplication}
          onUpdated={handleUpdatedApplication}
        />
      )}

      {deletingApplication && (
        <DeleteApplicationModal
          isOpen={!!deletingApplication}
          onClose={() => setDeletingApplication(null)}
          application={deletingApplication}
          onDeleted={handleDeletedApplication}
        />
      )}

      {drawerApplication && (
        <ApplicationDetailsDrawer
          isOpen={!!drawerApplication}
          onClose={() => setDrawerApplication(null)}
          application={drawerApplication}
          onEdit={(app) => setEditingApplication(app)}
          onDelete={(app) => setDeletingApplication(app)}
          onStatusChanged={handleUpdatedApplication}
        />
      )}

      {isBulkDeleteOpen && (
        <BulkDeleteModal
          isOpen={isBulkDeleteOpen}
          onClose={() => setIsBulkDeleteOpen(false)}
          selectedApplications={selectedApplicationsList}
          onBulkDeleted={handleBulkDeleted}
        />
      )}
    </div>
  );
}

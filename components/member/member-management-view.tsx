"use client";

import React, { useState, useRef, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MemberData, MemberRosterMetrics } from "@/types/member";
import {
  Users,
  Search,
  CheckCircle2,
  Phone,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  X,
  Plus,
  Edit2,
  Trash2,
  Clock,
  XCircle,
  CreditCard,
  Building,
  KeyRound,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { EditMemberModal } from "@/components/member/edit-member-modal";
import { CreateMemberModal } from "@/components/member/create-member-modal";
import { DeleteMemberModal } from "@/components/member/delete-member-modal";
import { ResetPasswordModal } from "@/components/member/reset-password-modal";
import { bulkUpdateMemberStatus, bulkDeleteMembers } from "@/lib/member/actions";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface MemberManagementViewProps {
  initialMembers: MemberData[];
  total: number;
  currentPage: number;
  totalPages: number;
  metrics: MemberRosterMetrics;
  currentUserUsername: string;
}

export function MemberManagementView({
  initialMembers,
  total,
  currentPage,
  totalPages,
  metrics,
  currentUserUsername,
}: MemberManagementViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [membersList, setMembersList] = useState<MemberData[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeRoleFilter, setActiveRoleFilter] = useState(searchParams.get("role") || "ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState(searchParams.get("status") || "ALL");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);

  // Modals state
  const [editingMember, setEditingMember] = useState<MemberData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<MemberData | null>(null);
  const [passwordResetMember, setPasswordResetMember] = useState<MemberData | null>(null);

  // Sync state if server initialMembers updates
  React.useEffect(() => {
    setMembersList(initialMembers);
  }, [initialMembers]);

  // Global Ctrl+K / Cmd+K shortcut to focus member search
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  function applyFilters(newQuery: string, newRole: string, newStatus: string, newPage: number = 1) {
    const params = new URLSearchParams();
    if (newQuery.trim()) params.set("q", newQuery.trim());
    if (newRole && newRole !== "ALL") params.set("role", newRole);
    if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
    if (newPage > 1) params.set("page", String(newPage));

    startTransition(() => {
      router.push(`/ad/members?${params.toString()}`);
    });
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      applyFilters(val, activeRoleFilter, activeStatusFilter, 1);
    }, 350);
  }

  function handleClearSearch() {
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters("", activeRoleFilter, activeStatusFilter, 1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    applyFilters(searchQuery, activeRoleFilter, activeStatusFilter, 1);
  }

  function handleRoleFilter(roleVal: string) {
    setActiveRoleFilter(roleVal);
    applyFilters(searchQuery, roleVal, activeStatusFilter, 1);
  }

  function handleStatusFilter(statusVal: string) {
    setActiveStatusFilter(statusVal);
    applyFilters(searchQuery, activeRoleFilter, statusVal, 1);
  }

  function handleMemberUpdated(updated: MemberData) {
    setMembersList((prev) =>
      prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
    );
    router.refresh();
  }

  const toast = useToast();
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  function handleToggleSelect(memberId: string, checked: boolean) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(memberId);
      } else {
        next.delete(memberId);
      }
      return next;
    });
  }

  function handleToggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedMemberIds(new Set(membersList.map((m) => m.id)));
    } else {
      setSelectedMemberIds(new Set());
    }
  }

  async function handleBulkStatusChange(newStatus: string) {
    const ids = Array.from(selectedMemberIds);
    if (ids.length === 0) return;

    setIsBulkUpdating(true);
    try {
      const res = await bulkUpdateMemberStatus(ids, newStatus);
      if (res.success) {
        toast.success(
          "Status Updated",
          `Updated status for ${res.modifiedCount || ids.length} members to ${newStatus}.`
        );
        setMembersList((prev) =>
          prev.map((m) => (selectedMemberIds.has(m.id) ? { ...m, status: newStatus } : m))
        );
        setSelectedMemberIds(new Set());
        router.refresh();
      } else {
        toast.error("Bulk Update Failed", res.error || "Unable to update status.");
      }
    } catch {
      toast.error("Network Error", "Failed to communicate with server.");
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedMemberIds);
    if (ids.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${ids.length} selected members?`)) {
      return;
    }

    setIsBulkUpdating(true);
    try {
      const res = await bulkDeleteMembers(ids);
      if (res.success) {
        toast.success("Members Deleted", `Successfully removed ${res.deletedCount || ids.length} members.`);
        setMembersList((prev) => prev.filter((m) => !selectedMemberIds.has(m.id)));
        setSelectedMemberIds(new Set());
        router.refresh();
      } else {
        toast.error("Bulk Delete Failed", res.error || "Unable to delete members.");
      }
    } catch {
      toast.error("Network Error", "Failed to communicate with server.");
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function handleMemberCreated(created: MemberData) {
    setMembersList((prev) => [created, ...prev]);
    router.refresh();
  }

  function handleMemberDeleted(deletedId: string) {
    setMembersList((prev) => prev.filter((m) => m.id !== deletedId));
    router.refresh();
  }

  function getCardGlowStyles(role: string, _index: number) {
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      return {
        cardBorder: "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 shadow-xs",
        avatarRing: "border border-zinc-700",
        badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        accent: "text-sky-400",
        subBox: "bg-zinc-950 border-zinc-800/80",
        indicator: "bg-sky-400",
      };
    }
    return {
      cardBorder: "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 shadow-xs",
      avatarRing: "border border-zinc-700",
      badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
      accent: "text-zinc-300",
      subBox: "bg-zinc-950 border-zinc-800/80",
      indicator: "bg-emerald-400",
    };
  }

  function getStatusBadge(status?: string) {
    if (status === "ACTIVE" || status === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      );
    }
    if (status === "SUSPENDED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans">
          <Clock className="h-3 w-3" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans">
        <XCircle className="h-3 w-3" />
        Blocked
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
              Members
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono tracking-wide">
              {metrics.totalMembers} ROSTER
            </span>
          </div>
          <p className="text-[13.5px] text-zinc-400 font-normal mt-1 leading-relaxed">
            Manage your syndicate members, handles, personal details, permissions, and security.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm border border-zinc-200/80 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 text-zinc-950" />
            <span>Create Member</span>
          </Button>
        </div>
      </div>

      {/* 3 Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-sans">
        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">
                Group Roster
              </span>
              <div className="text-2xl font-semibold text-zinc-100 t-num">
                {metrics.totalMembers} <span className="text-xs text-zinc-500 font-normal">Members</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 font-normal">
            {metrics.adminCount} Admin
          </span>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">
                Total Applications
              </span>
              <div className="text-2xl font-semibold text-zinc-100 t-num">
                {metrics.totalApplicationsSubmitted} <span className="text-xs text-zinc-500 font-normal">Submitted</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            Active
          </span>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">
                Verification Status
              </span>
              <div className="text-2xl font-semibold text-emerald-400 t-num">
                {metrics.verifiedPercentage}% <span className="text-xs text-emerald-500/80 font-normal">Verified</span>
              </div>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </Card>
      </div>

      {/* Directory Section Header & Filter Cluster */}
      <div className="pt-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[16px] font-semibold tracking-tight text-zinc-100 font-sans">
              All Members Directory
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
              {membersList.length}
            </span>
          </div>

          {/* Status Filter Pills */}
          <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs self-start sm:self-auto shadow-xs">
            <button
              type="button"
              onClick={() => handleStatusFilter("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97]",
                activeStatusFilter === "ALL" ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter("ACTIVE")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97]",
                activeStatusFilter === "ACTIVE" ? "bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter("SUSPENDED")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97]",
                activeStatusFilter === "SUSPENDED" ? "bg-amber-950 text-amber-300 border border-amber-800 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Suspended
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter("BLOCKED")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97]",
                activeStatusFilter === "BLOCKED" ? "bg-rose-950 text-rose-300 border border-rose-800 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Blocked
            </button>
          </div>
        </div>

        {/* Search and Role Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-150", searchQuery ? "text-indigo-400" : "text-zinc-500")} />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleClearSearch();
                }
              }}
              placeholder="Search member by name, @username, email, phone, or PAN..."
              className="pl-10 pr-16 h-10 bg-zinc-900/90 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/50 shadow-xs transition-colors duration-150"
            />
            {/* ⌘K hint shown when empty */}
            {!searchQuery && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none z-10 select-none">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400">
                  ⌘K
                </span>
              </div>
            )}
            {/* Loading spinner while filtering */}
            {isPending && searchQuery && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              </span>
            )}
            {/* Clear button */}
            {!isPending && searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md cursor-pointer transition-all duration-150 z-10 active:scale-95"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs self-start sm:self-auto shadow-xs">
            <button
              type="button"
              onClick={() => handleRoleFilter("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeRoleFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              All Roles
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilter("SUPER_ADMIN")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeRoleFilter === "SUPER_ADMIN"
                  ? "bg-sky-950 text-sky-300 shadow-xs border border-sky-800"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilter("CORE_MEMBER")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeRoleFilter === "CORE_MEMBER"
                  ? "bg-purple-950 text-purple-300 shadow-xs border border-purple-800"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Core Member
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilter("MEMBERS")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeRoleFilter === "MEMBERS"
                  ? "bg-zinc-800 text-zinc-200 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Member
            </button>
          </div>

          {membersList.length > 0 && (
            <button
              type="button"
              onClick={() => handleToggleSelectAll(selectedMemberIds.size !== membersList.length)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <input
                type="checkbox"
                checked={membersList.length > 0 && selectedMemberIds.size === membersList.length}
                onChange={() => {}}
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-950 text-indigo-600 pointer-events-none"
              />
              <span>{selectedMemberIds.size === membersList.length ? "Deselect All" : "Select All"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedMemberIds.size > 0 && (
        <div className="p-3 bg-indigo-950/70 border border-indigo-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md shadow-lg shadow-indigo-950/40">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-100 font-mono">
              {selectedMemberIds.size} {selectedMemberIds.size === 1 ? "member" : "members"} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedMemberIds(new Set())}
              className="text-[11.5px] text-zinc-400 hover:text-zinc-200 underline font-sans ml-1 cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              disabled={isBulkUpdating}
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value);
                  e.target.value = "";
                }
              }}
              className="h-8.5 px-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-xs font-medium text-zinc-200 rounded-xl cursor-pointer"
            >
              <option value="">Set Status...</option>
              <option value="ACTIVE">Mark Active</option>
              <option value="SUSPENDED">Mark Suspended</option>
              <option value="INACTIVE">Mark Inactive</option>
            </select>

            <Button
              type="button"
              size="sm"
              disabled={isBulkUpdating}
              onClick={handleBulkDelete}
              className="h-8.5 px-3 text-xs font-semibold bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Member Cards Grid */}
      <div className={cn("relative transition-opacity duration-150", isPending && "opacity-60 pointer-events-none")}>
        {isPending && (
          <div className="absolute -top-3 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 via-emerald-400 to-purple-500 animate-pulse z-10 rounded-full" />
        )}
        {membersList.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-200">
                {searchQuery.trim() ? "No members found" : "No matching members"}
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {searchQuery.trim()
                  ? "Try searching with a different name, @username, or phone number."
                  : "No member records match the selected role or status filters."}
              </p>
            </div>
            {(searchQuery.trim() || activeRoleFilter !== "ALL" || activeStatusFilter !== "ALL") && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveRoleFilter("ALL");
                    setActiveStatusFilter("ALL");
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {membersList.map((member, index) => {
              const glow = getCardGlowStyles(member.role, index);
              const isCurrentUser =
                member.username.toLowerCase() === currentUserUsername.toLowerCase() ||
                member.id === "mem_admin";
              const isSelected = selectedMemberIds.has(member.id);

              return (
                <div
                  key={member.id}
                  className={cn(
                    "p-5 rounded-2xl border transition-all duration-200 relative flex flex-col justify-between space-y-4.5 hover:shadow-md hover:-translate-y-[1px]",
                    glow.cardBorder,
                    isSelected && "ring-2 ring-indigo-500 bg-indigo-950/20"
                  )}
                >
                  {/* Header: Avatar, Name, Handle, Phone, Role Badge */}
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(member.id, e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                        />
                        <div className="relative shrink-0">
                          <MemberAvatar
                            src={member.avatar}
                            name={member.name}
                            className={`h-12 w-12 rounded-xl text-[15px] ${glow.avatarRing}`}
                          />
                          <span
                            className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${glow.indicator}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-zinc-100 tracking-tight">
                              {member.name}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide uppercase border font-sans ${glow.badge}`}
                            >
                              {member.role.replace("_", " ")}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Tooltip content={copiedUsername === member.username ? "Copied!" : "Copy username"} side="top">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`@${member.username}`).then(() => {
                                    setCopiedUsername(member.username);
                                    setTimeout(() => setCopiedUsername(null), 1800);
                                  });
                                }}
                                className={cn(
                                  "group/un inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono cursor-pointer transition-all duration-150 active:scale-95",
                                  copiedUsername === member.username
                                    ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-300"
                                    : "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                                )}
                                aria-label={`Copy @${member.username}`}
                              >
                                {copiedUsername === member.username ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-400 shrink-0 animate-in zoom-in-75 duration-150" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 text-zinc-600 group-hover/un:text-zinc-400 shrink-0 transition-colors" />
                                )}
                                @{member.username}
                              </button>
                            </Tooltip>
                            {member.phone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400 text-[11px] font-sans">
                                <Phone className="h-2.5 w-2.5" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {getStatusBadge(member.status)}
                      </div>
                    </div>

                    {/* Sub Boxes */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-sans">
                      <div className={`p-3 rounded-xl border ${glow.subBox} space-y-1`}>
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">
                          {member.role === "SUPER_ADMIN" || member.role === "ADMIN" ? "PLATFORM ROLE" : "IPOS APPLIED"}
                        </span>
                        <div className="text-zinc-100 font-medium">
                          {member.role === "SUPER_ADMIN" || member.role === "ADMIN" ? (
                            "Super Admin"
                          ) : (
                            <span>
                              <span className={`font-semibold ${glow.accent}`}>{member.iposAppliedCount || 0}</span> IPOs
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${glow.subBox} space-y-1`}>
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">
                          MEMBER SINCE
                        </span>
                        <div className="text-zinc-300 font-medium truncate">
                          {member.joinedAt || "Jan 2025"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Cluster */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Tooltip content="Edit member profile" side="top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMember(member)}
                          className="h-8 px-2.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 rounded-lg flex items-center gap-1 cursor-pointer transition-all duration-150 active:scale-95"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </Button>
                      </Tooltip>

                      <Tooltip content="Reset member password" side="top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPasswordResetMember(member)}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95"
                          aria-label="Reset Member Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      </Tooltip>

                      {!isCurrentUser && (
                        <Tooltip content="Delete or deactivate member" side="top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingMember(member)}
                            className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95"
                            aria-label="Delete Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </Tooltip>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrentUser && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium font-sans">
                          You
                        </span>
                      )}
                      <Link href={`/ad/members/${member.id}`} prefetch={true}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1 rounded-lg"
                        >
                          <span>Profile</span>
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-900 text-xs text-zinc-400">
            <div>
              Showing <span className="font-semibold text-zinc-200">{membersList.length}</span> of{" "}
              <span className="font-semibold text-zinc-200">{total}</span> members (Page {currentPage} of {totalPages})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isPending}
                onClick={() => applyFilters(searchQuery, activeRoleFilter, activeStatusFilter, currentPage - 1)}
                className="h-8 px-3 text-xs border-zinc-800 text-zinc-300 hover:text-white"
              >
                Previous
              </Button>
              <div className="px-2 font-mono text-[11.5px] text-zinc-300">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isPending}
                onClick={() => applyFilters(searchQuery, activeRoleFilter, activeStatusFilter, currentPage + 1)}
                className="h-8 px-3 text-xs border-zinc-800 text-zinc-300 hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          isOpen={Boolean(editingMember)}
          onClose={() => setEditingMember(null)}
          member={editingMember}
          onUpdated={handleMemberUpdated}
        />
      )}

      {/* Reset Password Modal */}
      {passwordResetMember && (
        <ResetPasswordModal
          isOpen={Boolean(passwordResetMember)}
          onClose={() => setPasswordResetMember(null)}
          member={passwordResetMember}
        />
      )}

      {/* Create Member Modal */}
      {isCreateModalOpen && (
        <CreateMemberModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleMemberCreated}
        />
      )}

      {/* Delete / Deactivate Member Modal */}
      {deletingMember && (
        <DeleteMemberModal
          isOpen={Boolean(deletingMember)}
          onClose={() => setDeletingMember(null)}
          member={deletingMember}
          onDeleted={handleMemberDeleted}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProfitDistributionViewData,
  publishProfitDistribution,
  saveProfitDistributionDetails,
  CalculatedMemberRow,
} from "@/lib/profit/actions";
import { formatProfitCopyData, generateProfitReportText } from "@/lib/profit/copy-formatter";
import {
  Coins,
  Search,
  CheckCircle2,
  Loader2,
  Building,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  X,
  RotateCcw,
  Pencil,
  Save,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { cn } from "@/lib/utils";
import { OfferingSelectDropdown } from "@/components/ui/offering-select-dropdown";
import { useToast } from "@/components/ui/toast";
import {
  calculatePerLotProfit,
  calculateMemberPayoutProfit,
  calculateLotsFromContribution,
  normalizeNumeric,
  safeAdd,
} from "@/lib/calculations";

interface ProfitDistributionViewProps {
  data: ProfitDistributionViewData;
  initialIpoId: string;
  isAdmin?: boolean;
  currentUser?: string;
}

export function ProfitDistributionView({
  data,
  initialIpoId,
  isAdmin = true,
  currentUser,
}: ProfitDistributionViewProps) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const {
    selectedIpo,
    availableIpos,
    totalApplicantsCount,
    totalMoneyApplied,
    totalAppliedLots,
    allottedLots,
    realizedProfit: initialRealizedProfit,
    perLotProfit: initialPerLotProfit,
    isPublished,
    publishedBy,
    members,
  } = data;

  const defaultProfitValue = initialRealizedProfit > 0
    ? initialRealizedProfit
    : (initialPerLotProfit > 0 ? initialPerLotProfit * (allottedLots || totalAppliedLots || 1) : 0);

  // Local calculation state
  const [realizedProfitInput, setRealizedProfitInput] = useState<string>(
    defaultProfitValue > 0 ? String(defaultProfitValue) : ""
  );
  const [allottedLotsInput, setAllottedLotsInput] = useState<string>(
    String(allottedLots || totalAppliedLots || 1)
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Mode State (Admins only)
  const [isEditing, setIsEditing] = useState(false);
  const [editedIpoName, setEditedIpoName] = useState<string>(selectedIpo?.name || "");
  const [editableMembers, setEditableMembers] = useState<CalculatedMemberRow[]>(members);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Copy Feedback State
  const [isCopied, setIsCopied] = useState(false);

  // Publish Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Sync state when selected IPO or initial server props change
  useEffect(() => {
    const profitVal = initialRealizedProfit > 0
      ? initialRealizedProfit
      : (initialPerLotProfit > 0 ? initialPerLotProfit * (allottedLots || totalAppliedLots || 1) : 0);
    setRealizedProfitInput(profitVal > 0 ? String(profitVal) : "");
    setAllottedLotsInput(String(allottedLots || totalAppliedLots || 1));
    setEditedIpoName(selectedIpo?.name || "");
    setEditableMembers(members);
    setIsEditing(false);
  }, [selectedIpo?.id, selectedIpo?.name, initialRealizedProfit, initialPerLotProfit, allottedLots, totalAppliedLots, members]);

  // Dynamically calculate live profit
  const effectiveNumericProfit = realizedProfitInput !== ""
    ? normalizeNumeric(realizedProfitInput, 0)
    : (defaultProfitValue > 0 ? defaultProfitValue : 0);

  const numericProfit = effectiveNumericProfit;
  const numericLots = normalizeNumeric(allottedLotsInput, allottedLots || totalAppliedLots || 1);

  // Calculate live per-lot profit
  const isInputDirty = realizedProfitInput !== "" && normalizeNumeric(realizedProfitInput, 0) !== defaultProfitValue;
  const livePerLotProfit = (!isInputDirty && isPublished && initialPerLotProfit > 0 && !isEditing)
    ? initialPerLotProfit
    : calculatePerLotProfit(numericProfit, totalAppliedLots);

  const isModified = Boolean(
    isPublished && (
      (realizedProfitInput !== "" && normalizeNumeric(realizedProfitInput, 0) !== defaultProfitValue) ||
      (normalizeNumeric(allottedLotsInput, 0) !== (allottedLots || totalAppliedLots)) ||
      (editedIpoName.trim() !== (selectedIpo?.name || ""))
    )
  );

  const minInvest = normalizeNumeric(selectedIpo?.metrics?.minInvestment, 15000);

  // Compute live member rows
  const activeMemberList = isEditing ? editableMembers : members;
  const liveMembers = activeMemberList.map((m) => {
    if (isEditing) return m;
    if (!isInputDirty && isPublished && m.profit > 0) return m;
    const effLots = m.lots > 0 ? m.lots : calculateLotsFromContribution(m.contribution, minInvest);
    const calcProfit = calculateMemberPayoutProfit(effLots, livePerLotProfit);
    return {
      ...m,
      profit: calcProfit,
    };
  });

  const filteredMembers = liveMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.username && m.username.toLowerCase().includes(q));
  });

  // Calculate dynamic totals from active member list
  const currentTotalLots = isEditing
    ? editableMembers.reduce((sum, m) => safeAdd(sum, m.lots), 0)
    : totalAppliedLots;

  const currentTotalMoney = isEditing
    ? editableMembers.reduce((sum, m) => safeAdd(sum, m.contribution), 0)
    : totalMoneyApplied;

  const isInitialIpoRestoredRef = React.useRef(false);

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
          handleIpoChange(storedIpo);
        }
      } catch {}
    }
  }, []);

  function handleIpoChange(newIpoId: string) {
    try {
      localStorage.setItem("orbit_selected_ipo_id", newIpoId);
    } catch {}
    startTransition(() => {
      router.push(`/ad/profit?ipoId=${newIpoId}`);
    });
  }

  // --- Copy Profit Report Feature ---
  function handleCopyAllData() {
    if (filteredMembers.length === 0) {
      toast.warning("No Data to Copy", "There are no member records currently displayed to copy.");
      return;
    }

    const textToCopy = generateProfitReportText({
      ipoName: (editedIpoName.trim() || selectedIpo?.name || "IPO"),
      profitDate: data.publishedAt || new Date().toISOString(),
      totalAppliedLots: currentTotalLots,
      totalAllottedLots: parseInt(allottedLotsInput, 10) || allottedLots || currentTotalLots,
      totalProfit: numericProfit,
      perLotProfit: livePerLotProfit,
      records: filteredMembers.map((m) => ({
        username: m.username,
        name: m.name,
        lots: m.lots,
        profit: m.profit,
      })),
    });

    const onCopySuccess = () => {
      setIsCopied(true);
      toast.success(
        "✓ Complete Profit Report Copied Successfully!",
        `${filteredMembers.length} member records copied with IPO summary to clipboard.`
      );
      setTimeout(() => setIsCopied(false), 2500);
    };

    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(onCopySuccess)
        .catch(() => fallbackCopy(textToCopy, onCopySuccess));
    } else {
      fallbackCopy(textToCopy, onCopySuccess);
    }
  }

  function fallbackCopy(text: string, onSuccess: () => void) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (successful) {
        onSuccess();
      } else {
        toast.error("Copy Failed", "Unable to copy records to clipboard.");
      }
    } catch {
      toast.error("Copy Error", "Clipboard interaction not supported by this browser.");
    }
  }

  // --- Edit Mode Handlers ---
  function handleStartEdit() {
    setIsEditing(true);
    setEditedIpoName(selectedIpo?.name || "");
    // Clone current members with live calculated profits as starting edit baseline
    setEditableMembers(
      liveMembers.map((m) => ({
        ...m,
        username: m.username || (m.name.startsWith("@") ? m.name : `@${m.name}`),
      }))
    );
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditedIpoName(selectedIpo?.name || "");
    setEditableMembers(members);
    const profitVal = initialRealizedProfit > 0
      ? initialRealizedProfit
      : (initialPerLotProfit > 0 ? initialPerLotProfit * (allottedLots || totalAppliedLots || 1) : 0);
    setRealizedProfitInput(profitVal > 0 ? String(profitVal) : "");
    setAllottedLotsInput(String(allottedLots || totalAppliedLots || 1));
    toast.info("Editing Cancelled", "All unsaved distribution changes have been reverted.");
  }

  function handleMemberUsernameChange(index: number, newUsername: string) {
    setEditableMembers((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          username: newUsername,
        };
      }
      return updated;
    });
  }

  function handleMemberLotsChange(index: number, newLotsStr: string) {
    const lotsNum = parseFloat(newLotsStr) || 0;
    setEditableMembers((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        const autoProfit = calculateMemberPayoutProfit(lotsNum, livePerLotProfit);
        updated[index] = {
          ...updated[index],
          lots: lotsNum,
          profit: autoProfit,
        };
      }
      return updated;
    });
  }

  function handleMemberProfitChange(index: number, newProfitStr: string) {
    const profitNum = parseFloat(newProfitStr) || 0;
    setEditableMembers((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          profit: profitNum,
        };
      }
      return updated;
    });
  }

  // Auto-recalculate all member profits from current per-lot profit
  function handleRecalculateAllMemberProfits() {
    setEditableMembers((prev) =>
      prev.map((m) => ({
        ...m,
        profit: calculateMemberPayoutProfit(m.lots, livePerLotProfit),
      }))
    );
    toast.success("Recalculated", `Updated member payouts based on ₹${livePerLotProfit.toLocaleString("en-IN")} per lot.`);
  }

  // --- Save Handler ---
  async function handleConfirmSave() {
    if (!selectedIpo) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await saveProfitDistributionDetails({
        ipoId: selectedIpo.id,
        ipoName: editedIpoName.trim(),
        totalProfit: numericProfit,
        allottedLots: parseInt(allottedLotsInput, 10) || numericLots,
        perLotProfit: livePerLotProfit,
        members: editableMembers.map((m) => ({
          memberId: m.memberId,
          name: m.name,
          username: m.username,
          pan: m.pan,
          contribution: m.contribution,
          lots: m.lots,
          profit: m.profit,
        })),
      });

      if (res.success) {
        setIsSaveConfirmOpen(false);
        setIsEditing(false);
        toast.success(
          "Distribution Saved Successfully",
          `Updated profit records for ${editedIpoName || selectedIpo.name} saved to database.`
        );
        router.refresh();
      } else {
        const errMsg = res.error || "Failed to save profit distribution changes.";
        setSaveError(errMsg);
        toast.error("Save Failed", errMsg);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setSaveError(errMsg);
      toast.error("Server Error", errMsg);
    } finally {
      setIsSaving(false);
    }
  }

  // --- Publish Handler ---
  async function handleConfirmPublish() {
    if (!selectedIpo) return;
    setIsPublishing(true);
    setPublishError(null);

    try {
      const res = await publishProfitDistribution(
        selectedIpo.id,
        numericProfit,
        parseInt(allottedLotsInput, 10) || totalAppliedLots
      );

      if (res.success) {
        setIsConfirmOpen(false);
        toast.success(
          isPublished ? "Profit Distribution Republished" : "Profit Distribution Published",
          `₹${numericProfit.toLocaleString("en-IN")} distributed across ${members.length} members for ${selectedIpo.name}.`
        );
        router.refresh();
      } else {
        const errMsg = res.error || "Failed to publish profit.";
        setPublishError(errMsg);
        toast.error("Failed to Publish Profit", errMsg);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setPublishError(errMsg);
      toast.error("Server Error", errMsg);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-100">
              Distribute Profit
            </h1>
            <span className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider font-mono uppercase">
              SETTLEMENT
            </span>

            {/* Clear Status Indicators: 🟢 Profit Published, 🟡 Pending, ✏️ Editable by Admin */}
            {isEditing ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-xs animate-pulse">
                <Pencil className="h-3.5 w-3.5 text-blue-400" />
                <span>✏️ Editable by Admin</span>
              </span>
            ) : isPublished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>🟢 Profit Published</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold shadow-xs">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>🟡 Pending</span>
              </span>
            )}
          </div>
          {isPublished && !isEditing && (
            <p className="text-[12px] text-zinc-400 mt-1">
              Published by <span className="text-zinc-200 font-medium">{publishedBy || "Admin"}</span> • Records permanently stored in database.
            </p>
          )}
        </div>

        {/* Action Header Cluster (Pinned at Far Right) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Professional Premium Copy Profit Report Button */}
          <button
            type="button"
            onClick={handleCopyAllData}
            title="Copy formatted profit report with summary and user details"
            className={cn(
              "group inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-[0.98] shadow-sm border",
              isCopied
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-zinc-700 shadow-zinc-950/40"
            )}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[2.5]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            )}
            <span>{isCopied ? "Report Copied!" : "Copy Profit Report"}</span>
          </button>

          {/* Admin Controls */}
          {isAdmin && (
            <>
              {isEditing ? (
                /* Edit Mode Actions: Save & Cancel */
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="h-10 px-3.5 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-medium cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsSaveConfirmOpen(true)}
                    disabled={isSaving}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                /* View Mode Actions: Edit & Publish/Republish */
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    disabled={!selectedIpo}
                    title="Edit IPO name, usernames, lots, and profit distributions"
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  {isPublished ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={numericProfit <= 0 || !selectedIpo}
                      className={cn(
                        "group relative inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm",
                        isModified
                          ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 hover:brightness-105 shadow-amber-500/20 shadow-lg border border-amber-300/60 font-bold"
                          : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 border border-zinc-700/80 hover:border-zinc-600 shadow-zinc-950/40"
                      )}
                    >
                      <RotateCcw
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-90",
                          isModified ? "text-zinc-950 stroke-[2.5]" : "text-amber-400"
                        )}
                      />
                      <span>{isModified ? "Republish Modified Payouts" : "Republish Payouts"}</span>
                      {isModified && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-mono tracking-wide text-zinc-950 uppercase border border-black/10">
                          Unsaved
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={numericProfit <= 0 || !selectedIpo}
                      className="group inline-flex items-center gap-2 h-10 px-4.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-semibold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-950/40 border border-emerald-400/30"
                    >
                      <span>Publish Profit</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Unified Offering Selector */}
          <OfferingSelectDropdown
            items={availableIpos}
            value={selectedIpo?.id || initialIpoId}
            onChange={(id) => handleIpoChange(id)}
            className="w-[260px]"
          />
        </div>
      </div>

      {/* Edit Mode Notification Banner */}
      {isEditing && (
        <div className="p-4 rounded-2xl bg-blue-950/25 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5 w-full md:max-w-md">
            <label className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5 text-blue-400" />
              <span>IPO Offering Name (Editable by Admin)</span>
            </label>
            <Input
              value={editedIpoName}
              onChange={(e) => setEditedIpoName(e.target.value)}
              placeholder="Enter IPO Name"
              className="h-9.5 bg-zinc-950 border-zinc-700 text-xs text-zinc-100 font-medium rounded-xl focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              type="button"
              onClick={handleRecalculateAllMemberProfits}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Reset all individual profits to (Lots * Per Lot Profit)"
            >
              <RefreshCw className="h-3 w-3 text-emerald-400" />
              <span>Auto-Recalculate Member Profits</span>
            </button>
            <span className="text-[11.5px] text-zinc-400 hidden sm:inline">
              ✏️ Modifying records directly in database
            </span>
          </div>
        </div>
      )}

      {/* Top Inputs Card */}
      <Card className={cn(
        "bg-zinc-900/50 border-zinc-800/80 p-5 rounded-2xl shadow-xs space-y-5 transition-all",
        isEditing && "border-blue-500/30 ring-1 ring-blue-500/20"
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Number of Allotted Lots */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-zinc-300 flex items-center justify-between">
              <span>Allotted Lots</span>
              {isAdmin && <span className="text-[10px] text-blue-400 font-sans">Editable by Admin</span>}
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="number"
                value={allottedLotsInput}
                disabled={!isAdmin}
                onChange={(e) => setAllottedLotsInput(e.target.value)}
                className={cn(
                  "pl-9 h-10 bg-zinc-950 border-zinc-800 text-[13px] font-sans t-num text-zinc-100 rounded-xl focus-visible:ring-emerald-500",
                  isEditing && "border-blue-500/50 focus-visible:ring-blue-500"
                )}
              />
            </div>
            {allottedLots === 0 && !isPublished && (
              <p className="text-[11.5px] text-zinc-500 font-sans flex items-center gap-1 mt-1">
                <Info className="h-3 w-3 text-zinc-500" />
                No lots marked Allotted yet in Allotment Section (showing total applied)
              </p>
            )}
          </div>

          {/* Total Realized Profit Input */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-zinc-300 flex items-center justify-between">
              <span>Total Realized Profit (₹)</span>
              {isAdmin && <span className="text-[10px] text-blue-400 font-sans">Editable by Admin</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-sans text-xs">
                ₹
              </span>
              <Input
                type="number"
                placeholder="e.g. 150000"
                value={realizedProfitInput}
                disabled={!isAdmin}
                onChange={(e) => setRealizedProfitInput(e.target.value)}
                className={cn(
                  "pl-7 h-10 bg-zinc-950 border-zinc-800 text-[13px] font-sans t-num text-zinc-100 placeholder:text-zinc-600 rounded-xl focus-visible:ring-emerald-500",
                  isEditing && "border-blue-500/50 focus-visible:ring-blue-500"
                )}
              />
            </div>
          </div>
        </div>

        {/* 3 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-zinc-800/80 font-sans">
          <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-zinc-500" />
              TOTAL MONEY APPLIED
            </span>
            <div className="text-2xl font-semibold text-zinc-100 t-num">
              ₹{currentTotalMoney.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
              TOTAL APPLIED LOTS
            </span>
            <div className="text-2xl font-semibold text-zinc-100 t-num">
              {Number.isInteger(currentTotalLots) ? currentTotalLots : currentTotalLots.toFixed(2)}{" "}
              <span className="text-xs text-zinc-500 font-normal">Lots</span>
            </div>
          </div>

          {/* PER LOT PROFIT (Green Card) */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              PER LOT PROFIT
            </span>
            <div className="text-2xl font-semibold text-emerald-300 t-num">
              ₹{livePerLotProfit.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </Card>

      {/* Individual Payout Breakdown Section */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Coins className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-base sm:text-[17px] font-bold text-zinc-100 tracking-tight">
                Individual Payout Breakdown
              </h3>
            </div>
            <p className="text-xs text-zinc-400 font-normal">
              {isEditing
                ? "Directly modify usernames, lots, or individual profit payouts below. Changes are saved permanently to the database."
                : `Calculated distribution for ${editedIpoName || selectedIpo?.name}.`}
            </p>
          </div>

          {/* Quick Metrics Badge Pill */}
          <div className="inline-flex items-center gap-2.5 p-1 pl-3 bg-zinc-900/80 hover:bg-zinc-900/95 border border-zinc-800/90 rounded-xl shadow-xs shrink-0 backdrop-blur-md transition-colors">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="text-zinc-400 font-normal">Total Profit:</span>
              <span className="font-semibold text-emerald-400 font-sans t-num tracking-tight">
                ₹{numericProfit.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="h-3.5 w-px bg-zinc-800" />
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 pr-1.5">
              <span className="text-zinc-400 font-normal">Per Lot:</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold font-sans t-num tracking-tight">
                ₹{livePerLotProfit.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar & Quick Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member username or name..."
              className="pl-10 pr-9 h-10 bg-zinc-900/70 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyAllData}
            title="Copy formatted profit report to clipboard"
            className={cn(
              "group inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-xs font-medium tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-[0.98] shrink-0 border shadow-sm",
              isCopied
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800 hover:border-zinc-700 shadow-zinc-950/40"
            )}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[2.5]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            )}
            <span>{isCopied ? "Report Copied!" : "Copy Profit Report"}</span>
          </button>
        </div>

        {/* Breakdown Table */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
          {filteredMembers.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700">
                <Coins className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-200">No member records found</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  No applicants match your search query for this offering.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] text-zinc-300 font-sans">
                <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-3.5 w-12 text-zinc-500">#</th>
                    <th className="py-3 px-4">
                      {isEditing ? "Member & Username (Edit)" : "Member Name"}
                    </th>
                    <th className="py-3 px-4">Money Applied (₹)</th>
                    <th className="py-3 px-4 text-center">
                      {isEditing ? "Applied Lots (Edit)" : "Applied Lots"}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {isEditing ? "Individual Profit (₹) (Edit)" : "Individual Profit (₹)"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {filteredMembers.map((m, idx) => {
                    const rowNumber = String(idx + 1).padStart(2, "0");
                    const username = m.username || (m.name.startsWith("@") ? m.name : `@${m.name}`);
                    const displayName = m.name.startsWith("@") ? m.name.slice(1) : m.name;

                    // Match index in editableMembers if currently editing
                    const originalIndex = editableMembers.findIndex((orig) => orig.memberId === m.memberId);
                    const targetIndex = originalIndex !== -1 ? originalIndex : idx;

                    return (
                      <tr key={m.memberId || idx} className="hover:bg-zinc-800/30 transition-colors group">
                        {/* Index */}
                        <td className="py-3.5 px-3.5 text-zinc-500 text-xs font-mono font-medium">
                          {rowNumber}
                        </td>

                        {/* Member */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <MemberAvatar
                              src={m.avatar}
                              name={displayName}
                              className="h-8 w-8 rounded-xl border border-zinc-800 text-xs shrink-0 shadow-xs"
                            />
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <Input
                                    type="text"
                                    value={m.username || ""}
                                    onChange={(e) => handleMemberUsernameChange(targetIndex, e.target.value)}
                                    placeholder="@username"
                                    className="h-7.5 w-full max-w-[180px] bg-zinc-950 border-blue-500/40 text-xs font-semibold text-zinc-100 rounded-lg focus-visible:ring-blue-500"
                                  />
                                  <div className="text-[10.5px] text-zinc-500 truncate">
                                    Name: {displayName}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-semibold text-zinc-100 text-[13.5px] group-hover:text-white transition-colors truncate">
                                    {username}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 font-sans truncate">
                                    {displayName}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Money Applied */}
                        <td className="py-3.5 px-4 text-zinc-200 font-medium t-num font-sans">
                          ₹{m.contribution.toLocaleString("en-IN")}
                        </td>

                        {/* Lots Applied */}
                        <td className="py-3.5 px-4 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="any"
                              value={m.lots}
                              onChange={(e) => handleMemberLotsChange(targetIndex, e.target.value)}
                              className="h-7.5 w-24 mx-auto text-center bg-zinc-950 border-blue-500/40 text-xs font-medium text-zinc-100 rounded-lg focus-visible:ring-blue-500"
                            />
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-sans font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                              {Number.isInteger(m.lots) ? m.lots : m.lots.toFixed(2)} Lots
                            </span>
                          )}
                        </td>

                        {/* Individual Profit */}
                        <td className="py-3.5 px-4 text-right font-semibold text-[13.5px] text-emerald-400 t-num font-sans">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-zinc-500 text-xs">₹</span>
                              <Input
                                type="number"
                                step="any"
                                value={m.profit}
                                onChange={(e) => handleMemberProfitChange(targetIndex, e.target.value)}
                                className="h-7.5 w-28 text-right bg-zinc-950 border-blue-500/40 text-xs font-semibold text-emerald-400 rounded-lg focus-visible:ring-blue-500"
                              />
                            </div>
                          ) : (
                            `₹${Math.round(m.profit).toLocaleString("en-IN")}`
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Breakdown Footer Summary */}
          {filteredMembers.length > 0 && (
            <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
              <div className="text-zinc-400">
                Showing <span className="font-semibold text-zinc-200">{filteredMembers.length}</span> of{" "}
                <span className="font-semibold text-zinc-200">{members.length}</span> participants
              </div>
              <div className="flex items-center gap-4 text-zinc-300">
                <span>
                  Total Pooled Profit: <span className="font-semibold text-emerald-400 t-num font-sans">₹{numericProfit.toLocaleString("en-IN")}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Confirmation Modal (For Admin Edits) */}
      {isSaveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-400">
                <Save className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[16px] font-semibold text-zinc-100 tracking-tight">
                  Save Profit Distribution Changes
                </h4>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  You are about to save edited profit distribution details for{" "}
                  <span className="font-medium text-zinc-200">{editedIpoName || selectedIpo?.name}</span>.
                </p>
              </div>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {saveError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-zinc-400">IPO Name:</span>
                <span className="font-semibold text-zinc-200">{editedIpoName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Realized Profit:</span>
                <span className="font-semibold text-emerald-400 t-num">₹{numericProfit.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Applied Lots:</span>
                <span className="font-semibold text-zinc-200 t-num">{currentTotalLots} Lots</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Per Lot Profit:</span>
                <span className="font-semibold text-emerald-400 t-num">₹{livePerLotProfit.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Participating Members:</span>
                <span className="font-semibold text-zinc-200">{editableMembers.length} Members</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              ⚠️ These changes will update the authoritative records in the database and immediately reflect everywhere in the dashboard.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSaveConfirmOpen(false)}
                disabled={isSaving}
                className="text-[13px] font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Confirm & Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation & Publish Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                isPublished
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              )}>
                {isPublished ? <RotateCcw className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-[16px] font-semibold text-zinc-100 tracking-tight">
                  {isPublished ? "Republish Profit Distribution" : "Publish Profit Distribution"}
                </h4>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  {isPublished
                    ? `You are about to republish and update profit payouts for ${selectedIpo?.name}. This will recalculate all member portfolio returns.`
                    : `You are about to publish realized profit distributions for ${selectedIpo?.name}.`}
                </p>
              </div>
            </div>

            {publishError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {publishError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Realized Profit:</span>
                <span className="font-semibold text-emerald-400 t-num">₹{numericProfit.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Participating Lots:</span>
                <span className="font-semibold text-zinc-200 t-num">{totalAppliedLots} Lots</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Per Lot Profit:</span>
                <span className="font-semibold text-emerald-400 t-num">₹{livePerLotProfit.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Eligible Members:</span>
                <span className="font-semibold text-zinc-200">{members.length} Members</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              ⚠️ This will commit the distribution to the database and recalculate each member&apos;s realized earnings.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPublishing}
                className="text-[13px] font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className={cn(
                  "text-[13px] font-medium text-white cursor-pointer",
                  isPublished
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                )}
              >
                {isPublishing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {isPublished ? "Confirm & Republish Profit" : "Confirm & Publish Profit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProfitDistributionViewData,
  publishProfitDistribution,
} from "@/lib/profit/actions";
import {
  Coins,
  Search,
  CheckCircle2,
  Loader2,
  Users,
  Building,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  ChevronDown,
  X,
  RotateCcw,
  AlertTriangle,
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
  formatCurrency,
  formatLots,
  normalizeNumeric,
} from "@/lib/calculations";

interface ProfitDistributionViewProps {
  data: ProfitDistributionViewData;
  initialIpoId: string;
}

export function ProfitDistributionView({
  data,
  initialIpoId,
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

  // Local calculation state (Editable at all times)
  const [realizedProfitInput, setRealizedProfitInput] = useState<string>(
    defaultProfitValue > 0 ? String(defaultProfitValue) : ""
  );
  const [allottedLotsInput, setAllottedLotsInput] = useState<string>(
    String(allottedLots || totalAppliedLots || 1)
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when selected IPO or initial server props change
  useEffect(() => {
    const profitVal = initialRealizedProfit > 0
      ? initialRealizedProfit
      : (initialPerLotProfit > 0 ? initialPerLotProfit * (allottedLots || totalAppliedLots || 1) : 0);
    setRealizedProfitInput(profitVal > 0 ? String(profitVal) : "");
    setAllottedLotsInput(String(allottedLots || totalAppliedLots || 1));
  }, [selectedIpo?.id, initialRealizedProfit, initialPerLotProfit, allottedLots, totalAppliedLots]);

  // Publish Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Dynamically calculate live profit as admin types or fallback to published/default
  const effectiveNumericProfit = realizedProfitInput !== ""
    ? normalizeNumeric(realizedProfitInput, 0)
    : (defaultProfitValue > 0 ? defaultProfitValue : 0);

  const numericProfit = effectiveNumericProfit;
  const numericLots = normalizeNumeric(allottedLotsInput, allottedLots || totalAppliedLots || 1);

  // Live per lot profit recalculation
  const isInputDirty = realizedProfitInput !== "" && normalizeNumeric(realizedProfitInput, 0) !== defaultProfitValue;
  const livePerLotProfit = (!isInputDirty && isPublished && initialPerLotProfit > 0)
    ? initialPerLotProfit
    : calculatePerLotProfit(numericProfit, totalAppliedLots);

  const isModified = Boolean(
    isPublished && (
      (realizedProfitInput !== "" && normalizeNumeric(realizedProfitInput, 0) !== defaultProfitValue) ||
      (normalizeNumeric(allottedLotsInput, 0) !== (allottedLots || totalAppliedLots))
    )
  );

  const minInvest = normalizeNumeric(selectedIpo?.metrics?.minInvestment, 15000);

  // Live recalculated member rows
  const liveMembers = members.map((m) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-100">
              Distribute Profit
            </h1>
            <span className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider font-mono uppercase">
              SETTLEMENT
            </span>
          </div>
        </div>

        {/* Action Header Cluster (Pinned at Far Right) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {isPublished && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Published by {publishedBy || "Admin"}</span>
            </div>
          )}

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

          {/* Unified Offering Selector - Styled & Pinned at Far Right */}
          <OfferingSelectDropdown
            items={availableIpos}
            value={selectedIpo?.id || initialIpoId}
            onChange={(id) => handleIpoChange(id)}
            className="w-[270px]"
          />
        </div>
      </div>

      {/* Top Inputs Card */}
      <Card className="bg-zinc-900/50 border-zinc-800/80 p-5 rounded-2xl shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Number of Allotted Lots */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-zinc-300 flex items-center justify-between">
              <span>Allotted Lots</span>
              {isPublished && <span className="text-[10px] text-zinc-500 font-sans">Editable</span>}
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="number"
                value={allottedLotsInput}
                onChange={(e) => setAllottedLotsInput(e.target.value)}
                className="pl-9 h-10 bg-zinc-950 border-zinc-800 text-[13px] font-sans t-num text-zinc-100 rounded-xl focus-visible:ring-emerald-500"
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
              {isPublished && <span className="text-[10px] text-zinc-500 font-sans">Editable</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-sans text-xs">
                ₹
              </span>
              <Input
                type="number"
                placeholder="e.g. 150000"
                value={realizedProfitInput}
                onChange={(e) => setRealizedProfitInput(e.target.value)}
                className="pl-7 h-10 bg-zinc-950 border-zinc-800 text-[13px] font-sans t-num text-zinc-100 placeholder:text-zinc-600 rounded-xl focus-visible:ring-emerald-500"
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
              ₹{totalMoneyApplied.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
              TOTAL APPLIED LOTS
            </span>
            <div className="text-2xl font-semibold text-zinc-100 t-num">
              {totalAppliedLots} <span className="text-xs text-zinc-500 font-normal">Lots</span>
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
              Auto-calculated per individual member contribution for <span className="text-zinc-200 font-medium">{selectedIpo?.name}</span>.
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

        {/* Search Bar */}
        <div className="relative">
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
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Money Applied (₹)</th>
                    <th className="py-3 px-4 text-center">Applied Lots</th>
                    <th className="py-3 px-4 text-right">Individual Profit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {filteredMembers.map((m, idx) => {
                    const rowNumber = String(idx + 1).padStart(2, "0");
                    const username = m.username || (m.name.startsWith("@") ? m.name : `@${m.name}`);
                    const displayName = m.name.startsWith("@") ? m.name.slice(1) : m.name;

                    return (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors group">
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
                            <div>
                              <div className="font-semibold text-zinc-100 text-[13.5px] group-hover:text-white transition-colors">
                                {username}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-sans">
                                {displayName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Money Applied */}
                        <td className="py-3.5 px-4 text-zinc-200 font-medium t-num font-sans">
                          ₹{m.contribution.toLocaleString("en-IN")}
                        </td>

                        {/* Lots Applied */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-sans font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {Number.isInteger(m.lots) ? m.lots : m.lots.toFixed(2)} Lots
                          </span>
                        </td>

                        {/* Individual Profit */}
                        <td className="py-3.5 px-4 text-right font-semibold text-[13.5px] text-emerald-400 t-num font-sans">
                          ₹{m.profit.toLocaleString("en-IN")}
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
              ⚠️ This will commit the updated distribution to the database and recalculate each member&apos;s realized earnings.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPublishing}
                className="text-[13px] font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className={cn(
                  "text-[13px] font-medium text-white",
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

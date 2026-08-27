"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { MemberPerformanceCategory } from "@/types/member";
import { MemberAvatar } from "@/components/ui/member-avatar";
import {
  Trophy,
  Coins,
  FileSpreadsheet,
  Flame,
  Award,
  Percent,
  Sparkles,
  ArrowUpRight,
  Layers,
  ChevronDown,
  Search,
  X,
  TrendingUp,
  ShieldCheck,
  Crown,
  Medal,
  Info,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePersistentSelect, PERSISTENT_STORAGE_KEYS } from "@/lib/hooks/use-persistent-select";
import { cn } from "@/lib/utils";

interface PerformanceViewProps {
  categories: MemberPerformanceCategory[];
}

export function PerformanceView({ categories = [] }: PerformanceViewProps) {
  const [activeMetricId, setActiveMetricId] = usePersistentSelect<string>({
    key: PERSISTENT_STORAGE_KEYS.PERFORMANCE_METRIC,
    initialValue: categories[0]?.metricId || "highest_profit",
    availableValues: categories.map((c) => c.metricId),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.metricId === activeMetricId) || categories[0];
  }, [categories, activeMetricId]);

  // Dynamic Metric Label for Podium & Table
  function getMetricPrimaryLabel(metricId: string): string {
    switch (metricId) {
      case "highest_profit":
        return "TOTAL PROFIT";
      case "highest_capital":
        return "CAPITAL INVESTED";
      case "most_applied_lots":
        return "APPLIED LOTS";
      case "highest_single_ipo":
        return "MAX SINGLE OFFERING";
      case "most_allotted_lots":
        return "ALLOTTED LOTS";
      case "highest_allotment_rate":
        return "ALLOTMENT RATE";
      case "most_offerings":
        return "IPOS JOINED";
      default:
        return "RECORD VALUE";
    }
  }

  function getCategoryIcon(metricId: string, className: string = "h-4 w-4") {
    switch (metricId) {
      case "highest_profit":
        return <Trophy className={cn(className, "text-emerald-400")} />;
      case "highest_capital":
        return <Coins className={cn(className, "text-sky-400")} />;
      case "most_applied_lots":
        return <FileSpreadsheet className={cn(className, "text-indigo-400")} />;
      case "highest_single_ipo":
        return <Flame className={cn(className, "text-purple-400")} />;
      case "most_allotted_lots":
        return <Award className={cn(className, "text-amber-400")} />;
      case "highest_allotment_rate":
        return <Percent className={cn(className, "text-teal-400")} />;
      case "most_offerings":
        return <Sparkles className={cn(className, "text-rose-400")} />;
      default:
        return <Trophy className={cn(className, "text-zinc-400")} />;
    }
  }

  function getCategoryExplanation(metricId: string): string {
    switch (metricId) {
      case "highest_profit":
        return "Members ranked by confirmed lifetime realized earnings distributed from finalized Nexo payouts.";
      case "highest_capital":
        return "Members ranked by total cumulative funds pooled across solo filings and multi-friend split applications.";
      case "most_applied_lots":
        return "Members ranked by cumulative lot volume submitted across all active and historical syndicate offerings.";
      case "highest_single_ipo":
        return "Members ranked by the maximum lot volume applied for within a single IPO offering.";
      case "most_allotted_lots":
        return "Members ranked by total lot allocations successfully secured through confirmed allotment filings.";
      case "highest_allotment_rate":
        return "Members ranked by allotment efficiency (Valid Allotted Lots ÷ Valid Applied Lots × 100).";
      case "most_offerings":
        return "Members ranked by the number of distinct IPO syndicates participated in.";
      default:
        return "Authoritative rankings computed deterministically from underlying syndicate transaction records.";
    }
  }

  const allRows = activeCategory?.rows || [];

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return allRows;
    const q = searchQuery.toLowerCase().trim();
    return allRows.filter(
      (r) =>
        r.member.name?.toLowerCase().includes(q) ||
        r.member.username?.toLowerCase().includes(q)
    );
  }, [allRows, searchQuery]);

  // Podium is always based on the authoritative top 3 of the active category
  const top1 = allRows.find((r) => r.rank === 1);
  const top2 = allRows.find((r) => r.rank === 2);
  const top3 = allRows.find((r) => r.rank === 3);

  if (!categories || categories.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center space-y-3 font-sans">
        <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto shadow-sm">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-zinc-200 tracking-tight">No performance data available</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Leaderboard records will automatically populate as syndicate applications and profit distributions are logged.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* 1. Header with Title, Live Indicator & Rank-By Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-zinc-100">
              Member Performance
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE DATA
            </span>
          </div>
          <p className="text-[13.5px] text-zinc-400 font-normal mt-1 leading-relaxed">
            Real-time leaderboards and historical performance rankings across all member activities.
          </p>
        </div>

        {/* Rank By Criterion Selector */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <span className="text-xs text-zinc-400 font-medium hidden sm:inline-block">Rank by:</span>
          <div className="relative">
            <select
              value={activeMetricId}
              onChange={(e) => {
                startTransition(() => {
                  setActiveMetricId(e.target.value);
                });
              }}
              className="appearance-none bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-100 text-xs font-semibold pl-3.5 pr-8 py-2 rounded-xl shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 select-none"
            >
              {categories.map((cat) => (
                <option key={cat.metricId} value={cat.metricId} className="bg-zinc-900 text-zinc-200">
                  {cat.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Ranking Category Navigation (Horizontally Scrollable Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = cat.metricId === activeMetricId;
          return (
            <button
              key={cat.metricId}
              type="button"
              onClick={() => {
                startTransition(() => {
                  setActiveMetricId(cat.metricId);
                });
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-2 border select-none",
                isActive
                  ? "bg-zinc-900 text-white border-zinc-700 shadow-xs shadow-black/40 font-semibold"
                  : "bg-zinc-950/60 text-zinc-400 border-zinc-900 hover:border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900/40"
              )}
            >
              {getCategoryIcon(cat.metricId, "h-3.5 w-3.5")}
              <span>{cat.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Top 3 Podium Cards */}
      {allRows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* #1 Card (Gold / Accent Treatment) */}
          {top1 ? (
            <Link
              href={`/ad/members/${top1.member.id}`}
              prefetch={true}
              className="bg-gradient-to-b from-amber-500/10 via-zinc-900/80 to-zinc-950/90 border border-amber-500/35 hover:border-amber-400/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10.5px] font-bold tracking-wider">
                  <Crown className="h-3 w-3 text-amber-400" />
                  <span>#1 LEADER</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-amber-300 transition-colors" />
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="relative">
                  <MemberAvatar
                    src={top1.member.avatar}
                    name={top1.member.name}
                    className="h-12 w-12 rounded-full border-2 border-amber-500/50 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-bold font-mono flex items-center justify-center border-2 border-zinc-950 shadow-2xs">
                    1
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold text-zinc-100 group-hover:text-white truncate">
                    {top1.member.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate">
                    {top1.member.username}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex items-baseline justify-between gap-2">
                <span className="text-[10.5px] text-zinc-400 font-semibold uppercase tracking-wider font-mono">
                  {getMetricPrimaryLabel(activeMetricId)}
                </span>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-amber-300 tabular-nums">
                    {top1.valueDisplay}
                  </div>
                  {top1.context && (
                    <div className="text-[11px] text-zinc-400 font-mono truncate max-w-[150px]">
                      {top1.context}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 text-center text-zinc-500 text-xs flex items-center justify-center">
              No leader recorded
            </div>
          )}

          {/* #2 Card (Silver Treatment) */}
          {top2 ? (
            <Link
              href={`/ad/members/${top2.member.id}`}
              prefetch={true}
              className="bg-zinc-900/60 hover:bg-zinc-900/85 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl p-4 shadow-2xs transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-mono text-[10.5px] font-semibold tracking-wider">
                  <Medal className="h-3 w-3 text-zinc-300" />
                  <span>#2 RUNNER UP</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="relative">
                  <MemberAvatar
                    src={top2.member.avatar}
                    name={top2.member.name}
                    className="h-11 w-11 rounded-full border border-zinc-600 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-zinc-600 text-zinc-100 text-[9.5px] font-bold font-mono flex items-center justify-center border-2 border-zinc-950">
                    2
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-zinc-200 group-hover:text-white truncate">
                    {top2.member.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate">
                    {top2.member.username}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex items-baseline justify-between gap-2">
                <span className="text-[10.5px] text-zinc-400 font-semibold uppercase tracking-wider font-mono">
                  {getMetricPrimaryLabel(activeMetricId)}
                </span>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-zinc-100 tabular-nums">
                    {top2.valueDisplay}
                  </div>
                  {top2.context && (
                    <div className="text-[11px] text-zinc-400 font-mono truncate max-w-[150px]">
                      {top2.context}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 text-center text-zinc-500 text-xs flex items-center justify-center">
              No runner-up recorded
            </div>
          )}

          {/* #3 Card (Bronze Treatment) */}
          {top3 ? (
            <Link
              href={`/ad/members/${top3.member.id}`}
              prefetch={true}
              className="bg-zinc-900/60 hover:bg-zinc-900/85 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl p-4 shadow-2xs transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-mono text-[10.5px] font-semibold tracking-wider">
                  <Medal className="h-3 w-3 text-amber-600" />
                  <span>#3 THIRD PLACE</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="relative">
                  <MemberAvatar
                    src={top3.member.avatar}
                    name={top3.member.name}
                    className="h-11 w-11 rounded-full border border-zinc-600 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-zinc-700 text-zinc-200 text-[9.5px] font-bold font-mono flex items-center justify-center border-2 border-zinc-950">
                    3
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-zinc-200 group-hover:text-white truncate">
                    {top3.member.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate">
                    {top3.member.username}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 flex items-baseline justify-between gap-2">
                <span className="text-[10.5px] text-zinc-400 font-semibold uppercase tracking-wider font-mono">
                  {getMetricPrimaryLabel(activeMetricId)}
                </span>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-zinc-100 tabular-nums">
                    {top3.valueDisplay}
                  </div>
                  {top3.context && (
                    <div className="text-[11px] text-zinc-400 font-mono truncate max-w-[150px]">
                      {top3.context}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 text-center text-zinc-500 text-xs flex items-center justify-center">
              No 3rd place recorded
            </div>
          )}
        </div>
      )}

      {/* 4. Leaderboard Card */}
      <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs backdrop-blur-xs">
        {/* Table Controls & Search Bar */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
              {getCategoryIcon(activeMetricId, "h-4 w-4")}
            </div>
            <div>
              <h2 className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
                <span>{activeCategory?.title}</span>
                <span className="text-zinc-500 font-normal text-xs">Leaderboard</span>
              </h2>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                {getCategoryExplanation(activeMetricId)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member..."
                className="pl-8 pr-7 bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 shrink-0 select-none shadow-2xs">
              {searchQuery ? `${filteredRows.length} MATCHED` : `${allRows.length} RANKED`}
            </span>
          </div>
        </div>

        {/* Table Column Headers */}
        <div className="grid grid-cols-12 px-6 py-2.5 border-b border-zinc-800/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono bg-zinc-950/80 select-none">
          <div className="col-span-2 sm:col-span-1">RANK</div>
          <div className="col-span-6 sm:col-span-7">MEMBER</div>
          <div className="col-span-4 text-right">
            {getMetricPrimaryLabel(activeMetricId)}
          </div>
        </div>

        {/* Data Rows */}
        {filteredRows.length > 0 ? (
          <div className="divide-y divide-zinc-900">
            {filteredRows.map((row, idx) => {
              const formattedRank = String(row.rank).padStart(2, "0");
              const isTop1 = row.rank === 1;
              const isTop2 = row.rank === 2;
              const isTop3 = row.rank === 3;

              return (
                <Link
                  key={`${row.member.id}-${idx}`}
                  href={`/ad/members/${row.member.id}`}
                  prefetch={true}
                  className="grid grid-cols-12 items-center px-6 py-3.5 hover:bg-zinc-900/60 transition-colors duration-150 group cursor-pointer"
                >
                  {/* Rank Column */}
                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    <span
                      className={cn(
                        "font-mono text-xs tabular-nums font-semibold px-2 py-0.5 rounded-md border",
                        isTop1
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/35 font-bold shadow-2xs"
                          : isTop2
                          ? "bg-zinc-800 text-zinc-200 border-zinc-700/80 font-bold"
                          : isTop3
                          ? "bg-zinc-800 text-zinc-300 border-zinc-700/60"
                          : "bg-zinc-950 text-zinc-400 border-zinc-850"
                      )}
                    >
                      {formattedRank}
                    </span>
                  </div>

                  {/* Member Column */}
                  <div className="col-span-6 sm:col-span-7 flex items-center gap-3.5 min-w-0 pr-2">
                    <MemberAvatar
                      src={row.member.avatar}
                      name={row.member.name}
                      className={cn(
                        "h-9 w-9 rounded-full shrink-0 border transition-all duration-150",
                        isTop1
                          ? "border-amber-500/40"
                          : "border-zinc-800 group-hover:border-zinc-700"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold text-zinc-200 group-hover:text-white truncate leading-snug transition-colors">
                          {row.member.name}
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
                      </div>
                      <div className="text-[11.5px] text-zinc-400 font-mono truncate">
                        {row.member.username}
                      </div>
                    </div>
                  </div>

                  {/* Value & Supporting Context Column */}
                  <div className="col-span-4 text-right min-w-0 pl-2">
                    <div
                      className={cn(
                        "text-[14.5px] font-bold font-mono tabular-nums leading-tight",
                        isTop1 ? "text-amber-300 font-bold" : "text-zinc-100 group-hover:text-white"
                      )}
                    >
                      {row.valueDisplay}
                    </div>
                    {row.context && (
                      <div
                        className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate"
                        title={row.context}
                      >
                        {row.context}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center space-y-1.5">
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Layers className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-zinc-300">
              {searchQuery ? "No members match your search" : "Not enough data to rank members"}
            </p>
            <p className="text-[11px] text-zinc-500">
              {searchQuery
                ? "Try searching by another name or username."
                : "Transactions for this metric will automatically appear here once recorded."}
            </p>
          </div>
        )}

        {/* Footer Summary Stats */}
        {allRows.length > 0 && (
          <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
            <div className="flex items-center gap-3">
              <span>
                Standard Competition Ranking: <strong className="text-zinc-300 font-mono">1224</strong>
              </span>
              <span className="text-zinc-700">·</span>
              <span>
                Total Qualifying Members: <strong className="text-zinc-300 font-mono">{allRows.length}</strong>
              </span>
            </div>

            <Link
              href="/ad/members"
              prefetch={true}
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
            >
              <span>Explore All Members Roster</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceViewProps {
  categories: MemberPerformanceCategory[];
}

import { usePersistentSelect, PERSISTENT_STORAGE_KEYS } from "@/lib/hooks/use-persistent-select";

export function PerformanceView({ categories }: PerformanceViewProps) {
  const [activeMetricId, setActiveMetricId] = usePersistentSelect<string>({
    key: PERSISTENT_STORAGE_KEYS.PERFORMANCE_METRIC,
    initialValue: categories[0]?.metricId || "highest_profit",
    availableValues: categories.map((c) => c.metricId),
  });

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.metricId === activeMetricId) || categories[0];
  }, [categories, activeMetricId]);

  function getCategoryIcon(metricId: string) {
    switch (metricId) {
      case "highest_profit":
        return <Trophy className="h-4 w-4 text-emerald-400" />;
      case "highest_capital":
        return <Coins className="h-4 w-4 text-sky-400" />;
      case "most_applied_lots":
        return <FileSpreadsheet className="h-4 w-4 text-indigo-400" />;
      case "highest_single_ipo":
        return <Flame className="h-4 w-4 text-purple-400" />;
      case "most_allotted_lots":
        return <Award className="h-4 w-4 text-amber-400" />;
      case "highest_allotment_rate":
        return <Percent className="h-4 w-4 text-teal-400" />;
      case "most_offerings":
        return <Sparkles className="h-4 w-4 text-rose-400" />;
      default:
        return <Trophy className="h-4 w-4 text-zinc-400" />;
    }
  }

  function getMetricColumnHeader(metricId: string) {
    switch (metricId) {
      case "highest_profit":
        return "TOTAL EARNED";
      case "highest_capital":
        return "CAPITAL POOLED";
      case "most_applied_lots":
        return "APPLIED LOTS";
      case "highest_single_ipo":
        return "MAX SINGLE OFFERING";
      case "most_allotted_lots":
        return "ALLOTTED LOTS";
      case "highest_allotment_rate":
        return "SUCCESS RATE";
      case "most_offerings":
        return "SYNDICATES JOINED";
      default:
        return "RECORD VALUE";
    }
  }

  function getCategoryDescription(metricId: string) {
    switch (metricId) {
      case "highest_profit":
        return "Lifetime distributed earnings calculated from confirmed Nexo payouts.";
      case "highest_capital":
        return "Total capital pooled across solo filings and multi-contributor syndicate applications.";
      case "most_applied_lots":
        return "Cumulative lot count submitted across all active and historical IPO applications.";
      case "highest_single_ipo":
        return "Highest lot volume applied for by a member in a single IPO offering.";
      case "most_allotted_lots":
        return "Total lot allocations successfully secured through confirmed allotment filings.";
      case "highest_allotment_rate":
        return "Conversion efficiency: Allotted lots ÷ Applied lots (minimum 1 lot submitted).";
      case "most_offerings":
        return "Distinct IPO syndicate offerings joined across historical records.";
      default:
        return "Live authoritative rankings derived from shared database transactions.";
    }
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-zinc-200">No performance records</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Rankings will automatically populate as syndicate applications and profit distributions are logged.
        </p>
      </div>
    );
  }

  const rows = activeCategory?.rows || [];
  const top1 = rows.find((r) => r.rank === 1);
  const top2 = rows.find((r) => r.rank === 2);
  const top3 = rows.find((r) => r.rank === 3);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-indigo-600/10 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xs">
              <Trophy className="h-4 w-4" />
            </div>
            <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-zinc-100 font-sans">
              Member Performance
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-zinc-900/90 text-zinc-400 border border-zinc-800 font-mono tracking-wider uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE NEXO DATA
            </span>
          </div>
          <p className="text-[13px] text-zinc-400 font-normal mt-1 leading-relaxed">
            Real-time leaderboards and historical performance rankings across syndicate activities.
          </p>
        </div>

        {/* Mobile Dropdown & Desktop Quick Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeMetricId}
              onChange={(e) => setActiveMetricId(e.target.value)}
              className="appearance-none bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-100 text-xs font-medium pl-3.5 pr-8 py-2 rounded-xl shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 select-none"
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

      {/* Segmented Category Pill Tabs for Fast Switching */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = cat.metricId === activeMetricId;
          return (
            <button
              key={cat.metricId}
              type="button"
              onClick={() => setActiveMetricId(cat.metricId)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-2 border",
                isActive
                  ? "bg-zinc-900 text-white border-zinc-700/80 shadow-xs shadow-black/40 font-semibold"
                  : "bg-zinc-950/60 text-zinc-400 border-zinc-900 hover:border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900/40"
              )}
            >
              {getCategoryIcon(cat.metricId)}
              <span>{cat.title}</span>
            </button>
          );
        })}
      </div>

      {/* Top 3 Podium Highlights Grid */}
      {rows.length >= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* #1 Card */}
          {top1 && (
            <Link
              href={`/ad/members/${top1.member.id}`}
              prefetch={true}
              className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950/80 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
              
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[10.5px] font-bold tracking-wider">
                  #1 LEADER
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="relative">
                  <MemberAvatar
                    src={top1.member.avatar}
                    name={top1.member.name}
                    className="h-11 w-11 rounded-full border-2 border-amber-500/40 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-zinc-950 text-[9.5px] font-bold font-mono flex items-center justify-center border border-zinc-950">
                    1
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white truncate">
                    {top1.member.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate">
                    @{top1.member.username}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider font-mono">
                  TOP SCORE
                </span>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-amber-300 t-num">
                    {top1.valueDisplay}
                  </div>
                  {top1.context && (
                    <div className="text-[10.5px] text-zinc-400 font-mono truncate max-w-[140px]">
                      {top1.context}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* #2 Card */}
          {top2 && (
            <Link
              href={`/ad/members/${top2.member.id}`}
              prefetch={true}
              className="bg-zinc-900/60 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 shadow-xs transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-mono text-[10.5px] font-semibold tracking-wider">
                  #2 RUNNER UP
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="relative">
                  <MemberAvatar
                    src={top2.member.avatar}
                    name={top2.member.name}
                    className="h-10 w-10 rounded-full border border-zinc-700 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-zinc-700 text-zinc-200 text-[9.5px] font-bold font-mono flex items-center justify-center border border-zinc-950">
                    2
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-zinc-200 group-hover:text-white truncate">
                    {top2.member.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate">
                    @{top2.member.username}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider font-mono">
                  SCORE
                </span>
                <div className="text-right">
                  <div className="text-[15px] font-semibold font-mono text-zinc-200 t-num">
                    {top2.valueDisplay}
                  </div>
                  {top2.context && (
                    <div className="text-[10.5px] text-zinc-400 font-mono truncate max-w-[140px]">
                      {top2.context}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* #3 Card */}
          {top3 && (
            <Link
              href={`/ad/members/${top3.member.id}`}
              prefetch={true}
              className="bg-zinc-900/60 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 shadow-xs transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-mono text-[10.5px] font-semibold tracking-wider">
                  #3 THIRD PLACE
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="relative">
                  <MemberAvatar
                    src={top3.member.avatar}
                    name={top3.member.name}
                    className="h-10 w-10 rounded-full border border-zinc-700 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-zinc-700 text-zinc-200 text-[9.5px] font-bold font-mono flex items-center justify-center border border-zinc-950">
                    3
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-zinc-200 group-hover:text-white truncate">
                    {top3.member.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate">
                    @{top3.member.username}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider font-mono">
                  SCORE
                </span>
                <div className="text-right">
                  <div className="text-[15px] font-semibold font-mono text-zinc-200 t-num">
                    {top3.valueDisplay}
                  </div>
                  {top3.context && (
                    <div className="text-[10.5px] text-zinc-400 font-mono truncate max-w-[140px]">
                      {top3.context}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Main Leaderboard Table Card */}
      <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Table Description Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              {getCategoryIcon(activeMetricId)}
            </div>
            <div>
              <h2 className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
                <span>{activeCategory?.title}</span>
                <span className="text-zinc-500 font-normal text-xs">Leaderboard</span>
              </h2>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                {getCategoryDescription(activeMetricId)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800 shadow-2xs">
              {rows.length} {rows.length === 1 ? "Member" : "Ranked Members"}
            </span>
          </div>
        </div>

        {/* Table Column Labels */}
        <div className="grid grid-cols-12 px-6 py-3 border-b border-zinc-800/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono bg-zinc-950/80 select-none">
          <div className="col-span-2 sm:col-span-1">RANK</div>
          <div className="col-span-6 sm:col-span-7">MEMBER PROFILE</div>
          <div className="col-span-4 text-right">
            {getMetricColumnHeader(activeMetricId)}
          </div>
        </div>

        {/* Data Rows */}
        {rows.length > 0 ? (
          <div className="divide-y divide-zinc-900">
            {rows.map((row, idx) => {
              const formattedRank = String(row.rank).padStart(2, "0");
              const isTop1 = row.rank === 1;
              const isTop3 = row.rank <= 3;

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
                        "font-mono text-xs tabular-nums t-num font-semibold px-2 py-0.5 rounded-md border",
                        isTop1
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold shadow-2xs"
                          : isTop3
                          ? "bg-zinc-900 text-zinc-200 border-zinc-700/60"
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
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-zinc-200 group-hover:text-white truncate leading-snug transition-colors">
                          {row.member.name}
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
                      </div>
                      <div className="text-[11.5px] text-zinc-400 font-mono truncate">
                        @{row.member.username}
                      </div>
                    </div>
                  </div>

                  {/* Value Column */}
                  <div className="col-span-4 text-right min-w-0 pl-2">
                    <div
                      className={cn(
                        "text-[14.5px] font-semibold font-mono tabular-nums t-num leading-tight",
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
            <p className="text-xs font-medium text-zinc-300">No qualifying member records found</p>
            <p className="text-[11px] text-zinc-400">
              Transactions for this metric will automatically appear here once recorded.
            </p>
          </div>
        )}

        {/* Footer Summary Stats */}
        {rows.length > 0 && (
          <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
            <div className="flex items-center gap-4">
              <span>
                Standard Competition Ranking: <strong className="text-zinc-300 font-mono">1224</strong>
              </span>
              <span className="text-zinc-700">·</span>
              <span>
                Rank Cutoff: <strong className="text-zinc-300 font-mono">Rank &le; 5</strong>
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

"use client";

import React from "react";
import {
  Sun,
  Flame,
  Layers,
  FileSpreadsheet,
  Coins,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { TodayIpoSummary } from "@/types/control-center";
import { formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface TodayIpoSummaryCardProps {
  summary: TodayIpoSummary;
  onOpenActionItems?: () => void;
}

export function TodayIpoSummaryCard({
  summary,
  onOpenActionItems,
}: TodayIpoSummaryCardProps) {
  const {
    activeIposCount,
    managedApplicationsCount,
    appliedLotsCount,
    blockedCapital,
    urgentAttentionItemsCount,
    summaryLines,
  } = summary;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-950/90 border border-zinc-800/80 p-5 shadow-sm backdrop-blur-md">
      {/* Decorative ambient subtle glow */}
      <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
        {/* Header Title */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs">
            <Sun className="h-5 w-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Today&apos;s IPO Summary
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-semibold">
                DAILY INTELLIGENCE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live operational briefing computed directly from current database records.
            </p>
          </div>
        </div>

        {/* Attention badge if urgent items exist */}
        {urgentAttentionItemsCount > 0 ? (
          <button
            type="button"
            onClick={onOpenActionItems}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-mono font-semibold transition-all cursor-pointer shadow-2xs self-start md:self-auto"
          >
            <Flame className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
            <span>{urgentAttentionItemsCount} Action{urgentAttentionItemsCount === 1 ? "" : "s"} Require Attention</span>
            <span className="text-[10px] text-rose-400">→</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono font-medium self-start md:self-auto">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Syndicate in Good Standing</span>
          </div>
        )}
      </div>

      {/* Quick Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        {/* Metric 1: Active IPOs */}
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-mono uppercase text-[11px] tracking-wider text-zinc-400">Active IPOs</span>
            <Layers className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-zinc-100">{activeIposCount}</span>
            <span className="text-[11px] text-zinc-500 font-mono">Offerings</span>
          </div>
        </div>

        {/* Metric 2: Applications */}
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-mono uppercase text-[11px] tracking-wider text-zinc-400">Applications</span>
            <FileSpreadsheet className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-zinc-100">{managedApplicationsCount}</span>
            <span className="text-[11px] text-zinc-500 font-mono">Filings</span>
          </div>
        </div>

        {/* Metric 3: Applied Lots */}
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-mono uppercase text-[11px] tracking-wider text-zinc-400">Applied Lots</span>
            <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-zinc-100">{appliedLotsCount}</span>
            <span className="text-[11px] text-zinc-500 font-mono">Lots</span>
          </div>
        </div>

        {/* Metric 4: Blocked Capital */}
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-mono uppercase text-[11px] tracking-wider text-zinc-400">Blocked Capital</span>
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-emerald-300">
              ₹{formatNumber(blockedCapital)}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Sentences matching user specs */}
      {summaryLines && summaryLines.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-300 font-sans leading-relaxed">
          {summaryLines.map((line, idx) => (
            <React.Fragment key={idx}>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-amber-400/80" />
                <span>{line}</span>
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

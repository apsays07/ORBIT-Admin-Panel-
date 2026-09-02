"use client";

import React from "react";
import {
  FileSpreadsheet,
  Clock,
  Coins,
  Layers,
  Copy,
  Scale,
  Info,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { ControlCenterKPIs } from "@/types/control-center";
import { formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface ControlCenterKpiGridProps {
  kpis: ControlCenterKPIs;
  onSelectTab: (tab: "overview" | "issues" | "capital" | "lots" | "pan" | "timeline") => void;
  onExplainNumber: (metricKey: string) => void;
  onOpenMissingPans?: () => void;
}

export function ControlCenterKpiGrid({
  kpis,
  onSelectTab,
  onExplainNumber,
  onOpenMissingPans,
}: ControlCenterKpiGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {/* 1. APPLICATIONS */}
      <div
        onClick={() => onSelectTab("issues")}
        className="group relative p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
            Applications
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExplainNumber("total_applications");
            }}
            className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
            title="Explain this number"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold font-mono text-zinc-100 tracking-tight">
            {kpis.totalApplications}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">total</span>
        </div>
        <span className="text-[10.5px] text-zinc-500 mt-1 block truncate">
          Active offering bids
        </span>
      </div>

      {/* 2. PENDING */}
      <div
        onClick={() => onSelectTab("issues")}
        className="group relative p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-amber-500/40 shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
            Pending
          </span>
          <Clock className="h-3 w-3 text-amber-400/80" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold font-mono text-amber-300 tracking-tight">
            {kpis.pendingActionsCount}
          </span>
          <span className="text-[10px] text-amber-400/70 font-mono">actions</span>
        </div>
        <span className="text-[10.5px] text-zinc-500 mt-1 block truncate">
          {kpis.mandatesPending > 0 ? `${kpis.mandatesPending} mandates pending` : "Drafts / incomplete"}
        </span>
      </div>

      {/* 3. CAPITAL AFFECTED */}
      <div
        onClick={() => onSelectTab("capital")}
        className="group relative p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-rose-500/40 shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider font-mono text-rose-300/90">
            Capital Affected
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExplainNumber("applied_capital");
            }}
            className="text-rose-400/70 hover:text-rose-300 p-0.5 rounded cursor-pointer"
            title="Explain capital calculations"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold font-mono text-rose-400 tracking-tight">
            ₹{formatNumber(kpis.capitalAtRisk)}
          </span>
        </div>
        <span className="text-[10.5px] text-zinc-500 mt-1 block truncate">
          {kpis.capitalMismatchesCount > 0 ? `↑ ${kpis.capitalMismatchesCount} mismatch issues` : "Zero discrepancy"}
        </span>
      </div>

      {/* 4. MISSING PANs */}
      <div
        onClick={() => {
          if (onOpenMissingPans) {
            onOpenMissingPans();
          } else {
            onSelectTab("pan");
          }
        }}
        className="group relative p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-purple-500/40 shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
            Missing PANs
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExplainNumber("missing_pans");
            }}
            className="text-purple-400/70 hover:text-purple-300 p-0.5 rounded cursor-pointer"
            title="Explain missing PAN calculations"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold font-mono text-purple-300 tracking-tight">
            {kpis.missingPansCount ?? kpis.historicalPansNotApplied ?? 0}
          </span>
          <span className="text-[10px] text-purple-400/70 font-mono">RECORDS</span>
        </div>
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-zinc-800/40">
          <span className="text-[10.5px] text-zinc-500 truncate">
            {(kpis.missingPansCount ?? 0) > 0 ? "Requires Attention" : "All PANs Verified"}
          </span>
          <span className="text-[10px] text-purple-400 group-hover:text-purple-300 font-mono font-medium flex items-center gap-0.5 transition-colors">
            MISSING PANs →
          </span>
        </div>
      </div>

      {/* 5. DUPLICATES */}
      <div
        onClick={() => onSelectTab("issues")}
        className="group relative p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
            Duplicates
          </span>
          <Copy className="h-3 w-3 text-zinc-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span
            className={cn(
              "text-xl font-bold font-mono tracking-tight",
              kpis.duplicateRecordsCount > 0 ? "text-rose-400" : "text-zinc-200"
            )}
          >
            {kpis.duplicateRecordsCount}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">records</span>
        </div>
        <span className="text-[10.5px] text-zinc-500 mt-1 block truncate">
          {kpis.duplicateRecordsCount > 0 ? "Conflicting applications" : "No duplicates"}
        </span>
      </div>

      {/* 6. LOT MISMATCHES */}
      <div
        onClick={() => onSelectTab("lots")}
        className="group relative p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-indigo-500/40 shadow-2xs transition-all duration-150 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
            Lot Mismatches
          </span>
          <Layers className="h-3 w-3 text-indigo-400/80" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span
            className={cn(
              "text-xl font-bold font-mono tracking-tight",
              kpis.lotMismatchesCount > 0 ? "text-amber-400" : "text-zinc-200"
            )}
          >
            {kpis.lotMismatchesCount}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">deltas</span>
        </div>
        <span className="text-[10.5px] text-zinc-500 mt-1 block truncate">
          {kpis.lotMismatchesCount > 0 ? "Allocation differences" : "Synchronized"}
        </span>
      </div>
    </div>
  );
}

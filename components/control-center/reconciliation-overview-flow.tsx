"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Scale,
  CreditCard,
  Building,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import {
  ControlCenterKPIs,
  CapitalReconciliationSummary,
  LotReconciliationSummary,
  PanIntelligenceSummary,
} from "@/types/control-center";
import { cn } from "@/lib/utils";

interface ReconciliationOverviewFlowProps {
  kpis: ControlCenterKPIs;
  capitalSummary: CapitalReconciliationSummary;
  lotSummary: LotReconciliationSummary;
  panSummary: PanIntelligenceSummary;
  onSelectTab: (tab: "overview" | "issues" | "capital" | "lots" | "pan" | "timeline") => void;
}

export function ReconciliationOverviewFlow({
  kpis,
  capitalSummary,
  lotSummary,
  panSummary,
  onSelectTab,
}: ReconciliationOverviewFlowProps) {
  const isCapitalOk = capitalSummary.discrepancies.length === 0;
  const isLotsOk = lotSummary.discrepancies.length === 0;
  const isPanOk = panSummary.missingGenuinePansCount === 0 && panSummary.duplicatePanApplicationsCount === 0;
  const isAllotmentPending = kpis.allotmentPending > 0;

  const stages = [
    {
      id: "applications",
      label: "APPLICATIONS",
      status: "OK",
      badge: `✓ ${kpis.totalApplications}`,
      subtext: `${kpis.pendingActionsCount} pending action${kpis.pendingActionsCount === 1 ? "" : "s"}`,
      onClick: () => onSelectTab("issues"),
    },
    {
      id: "capital",
      label: "CAPITAL",
      status: isCapitalOk ? "OK" : "WARN",
      badge: isCapitalOk ? "✓ Reconciled" : `⚠ ${capitalSummary.discrepancies.length} mismatch${capitalSummary.discrepancies.length === 1 ? "" : "es"}`,
      subtext: isCapitalOk ? "Expected matches ledger" : `₹${(Math.abs(capitalSummary.netDiscrepancy) / 1000).toFixed(0)}k delta`,
      onClick: () => onSelectTab("capital"),
    },
    {
      id: "lots",
      label: "LOTS",
      status: isLotsOk ? "OK" : "WARN",
      badge: isLotsOk ? "✓ Synchronized" : `⚠ ${lotSummary.discrepancies.length} mismatch${lotSummary.discrepancies.length === 1 ? "" : "es"}`,
      subtext: `${lotSummary.totalApplicationLots} total lots`,
      onClick: () => onSelectTab("lots"),
    },
    {
      id: "pan",
      label: "PAN INTEL",
      status: isPanOk ? "OK" : "WARN",
      badge: isPanOk ? "✓ Consistent" : `${panSummary.missingGenuinePansCount} unapplied`,
      subtext: `${panSummary.totalHistoricalGenuinePans} historical PANs`,
      onClick: () => onSelectTab("pan"),
    },
    {
      id: "allotment",
      label: "ALLOTMENT",
      status: isAllotmentPending ? "INFO" : "OK",
      badge: isAllotmentPending ? "○ In Progress" : "✓ Finalized",
      subtext: isAllotmentPending ? "Awaiting registrar" : "Shares credited",
      onClick: () => onSelectTab("issues"),
    },
  ];

  return (
    <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/80 p-3.5 backdrop-blur-md shadow-2xs">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-400" />
          <span className="text-xs font-semibold text-zinc-200 tracking-tight">
            Reconciliation Pipeline
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase">
          Continuous Stage Verification
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            onClick={stage.onClick}
            className={cn(
              "p-2.5 rounded-lg border transition-all cursor-pointer group flex flex-col justify-between hover:-translate-y-0.5",
              stage.status === "WARN"
                ? "bg-amber-950/20 border-amber-800/40 hover:border-amber-500/60"
                : stage.status === "INFO"
                ? "bg-zinc-900/60 border-zinc-800 hover:border-indigo-500/40"
                : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                {stage.label}
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded",
                  stage.status === "WARN"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                    : stage.status === "INFO"
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}
              >
                {stage.badge}
              </span>
            </div>

            <span className="text-[11px] text-zinc-400 mt-2 block truncate font-medium">
              {stage.subtext}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

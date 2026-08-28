"use client";

import React from "react";
import {
  ShieldAlert,
  ArrowRight,
  Coins,
  FileSpreadsheet,
  Users,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ControlCenterIssue,
  ImpactSummary,
  CapitalReconciliationSummary,
} from "@/types/control-center";
import { formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface NeedsAttentionPanelProps {
  issues: ControlCenterIssue[];
  impactSummary: ImpactSummary;
  capitalSummary: CapitalReconciliationSummary;
  onViewIssueDetails: (issue: ControlCenterIssue) => void;
  onViewAllIssues: () => void;
  onExplainNumber?: (metricKey: string) => void;
}

export function NeedsAttentionPanel({
  issues,
  impactSummary,
  capitalSummary,
  onViewIssueDetails,
  onViewAllIssues,
  onExplainNumber,
}: NeedsAttentionPanelProps) {
  const activeIssues = issues.filter(
    (i) => i.status === "OPEN" || i.status === "INVESTIGATING"
  );
  const topIssues = activeIssues.slice(0, 5);

  function renderPriorityPill(severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW") {
    if (severity === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
          CRITICAL
        </span>
      );
    }
    if (severity === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          HIGH
        </span>
      );
    }
    if (severity === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        LOW
      </span>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. HERO "NEEDS ATTENTION" PANEL (Spans 2 columns on desktop) */}
      <div className="lg:col-span-2 rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-4 shadow-xs flex flex-col justify-between space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">
                Needs Attention
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              • {activeIssues.length} issue{activeIssues.length === 1 ? "" : "s"} require review
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAllIssues}
            className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2.5 rounded-lg cursor-pointer"
          >
            <span>View All ({activeIssues.length})</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Operational Rows */}
        {topIssues.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-400 flex flex-col items-center justify-center gap-1.5">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold text-zinc-200">✓ ALL CLEAR</span>
            <span className="text-zinc-500 text-[11px]">No reconciliation issues detected.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {topIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => onViewIssueDetails(issue)}
                className="p-3 rounded-lg bg-zinc-950/70 hover:bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer space-y-1.5 group"
              >
                {/* Top: Priority Pill + Type + Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderPriorityPill(issue.severity)}
                    <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-semibold">
                      {issue.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {new Date(issue.detectedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Middle: Member & Offering & Value delta */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-100">
                      {issue.memberUsername ? `@${issue.memberUsername}` : issue.memberName || "Member"}
                    </span>
                    <span className="text-zinc-500 mx-1.5">•</span>
                    <span className="text-zinc-400">{issue.ipoName}</span>
                  </div>

                  {issue.expectedValue !== undefined && issue.actualValue !== undefined && (
                    <div className="text-[11px] font-mono text-zinc-400">
                      Expected ₹{formatNumber(Number(issue.expectedValue))} → Recorded ₹{formatNumber(Number(issue.actualValue))}
                    </div>
                  )}
                </div>

                {/* Bottom: Impact numbers & Action Trigger */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-850/40 text-xs">
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    {issue.affectedAmount ? (
                      <span className="font-bold text-rose-400">
                        ₹{formatNumber(issue.affectedAmount)} affected
                      </span>
                    ) : null}
                    {issue.affectedLots ? (
                      <span className="text-purple-300">
                        {issue.affectedLots} lot{issue.affectedLots === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  <span className="text-[11px] text-purple-400 group-hover:text-purple-300 font-medium inline-flex items-center gap-0.5">
                    <span>View Details</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. FINANCIAL IMPACT PANEL (Right Column) */}
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-4 shadow-xs flex flex-col justify-between space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70">
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5 text-rose-400" />
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">
              Financial Impact
            </h3>
          </div>
          {onExplainNumber && (
            <button
              type="button"
              onClick={() => onExplainNumber("applied_capital")}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
              title="Explain financial impact"
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* 4 Compact Metric Blocks */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">
              Capital Affected
            </span>
            <span className="text-base font-bold font-mono text-rose-400 mt-0.5 block">
              ₹{formatNumber(impactSummary.totalCapitalAtRisk)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">
              Apps Affected
            </span>
            <span className="text-base font-bold font-mono text-amber-300 mt-0.5 block">
              {impactSummary.totalApplicationsAffected}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">
              Lots Affected
            </span>
            <span className="text-base font-bold font-mono text-purple-300 mt-0.5 block">
              {impactSummary.totalLotsAffected}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">
              Members Affected
            </span>
            <span className="text-base font-bold font-mono text-indigo-300 mt-0.5 block">
              {impactSummary.totalMembersAffected}
            </span>
          </div>
        </div>

        {/* Clean Breakdown Below */}
        <div className="space-y-1.5 pt-1 text-xs font-mono">
          <div className="flex items-center justify-between p-2 rounded-md bg-zinc-950/50 border border-zinc-800/60">
            <span className="text-zinc-400 text-[11px]">Capital Discrepancy</span>
            <span className="font-bold text-rose-400">
              ₹{formatNumber(Math.abs(capitalSummary.netDiscrepancy))}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-zinc-950/50 border border-zinc-800/60">
            <span className="text-zinc-400 text-[11px]">Blocked Active Funds</span>
            <span className="font-bold text-indigo-300">
              ₹{formatNumber(capitalSummary.blockedCapital)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-zinc-950/50 border border-zinc-800/60">
            <span className="text-zinc-400 text-[11px]">Allotted Share Capital</span>
            <span className="font-bold text-emerald-400">
              ₹{formatNumber(capitalSummary.allottedCapital)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

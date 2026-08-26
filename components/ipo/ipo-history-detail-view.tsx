"use client";

import React from "react";
import Link from "next/link";
import { HistoricalIpoDetailResponse } from "@/lib/ipo/actions";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Users,
  Layers,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IpoHistoryDetailViewProps {
  data: HistoricalIpoDetailResponse;
}

export function IpoHistoryDetailView({ data }: IpoHistoryDetailViewProps) {
  const { ipo, applicationsCount, allottedApplicationsCount, totalFundsContributed, profitDistribution } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Link href="/ad/ipo/history">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to History
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold text-zinc-100 tracking-tight">{ipo.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {ipo.id}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{ipo.company || ipo.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="h-3.5 w-3.5" />
            {ipo.status}
          </span>
          {ipo.registrarUrl && (
            <a
              href={ipo.registrarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
            >
              <span>Registrar</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
            TOTAL APPLICATIONS
          </span>
          <div className="text-2xl font-semibold text-zinc-100 t-num">{applicationsCount}</div>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {allottedApplicationsCount} Allotted
          </p>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
            CAPITAL CONTRIBUTED
          </span>
          <div className="text-2xl font-semibold text-emerald-400 t-num">
            ₹{totalFundsContributed.toLocaleString("en-IN")}
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Across all members
          </p>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
            PROFIT DISTRIBUTED
          </span>
          <div className="text-2xl font-semibold text-zinc-100 t-num">
            ₹{(profitDistribution?.totalProfit || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {profitDistribution?.allottedLots || 0} Allotted Lots
          </p>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
            PER LOT PROFIT
          </span>
          <div className="text-2xl font-semibold text-indigo-300 t-num">
            ₹{(profitDistribution?.oneLotProfit || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            1 Lot Net Payout
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IPO Parameters Card */}
        <Card className="lg:col-span-1 bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-zinc-400" />
              IPO Specifications
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Database values for this offering
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60">
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500">Category</span>
              <span className="font-semibold text-zinc-200">{ipo.category || "Mainboard"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Issue Size</span>
              <span className="text-zinc-200">{ipo.metrics?.issueSize || "—"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Lot Size</span>
              <span className="text-zinc-200">{ipo.metrics?.lotSize || 1} shares</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Min Investment</span>
              <span className="text-zinc-200 t-num">₹{(ipo.metrics?.minInvestment || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">GMP on Close</span>
              <span className="text-emerald-400 font-semibold t-num">
                {ipo.metrics?.gmpPercent ? `+${ipo.metrics.gmpPercent}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Recommendation</span>
              <span className="text-zinc-200 font-medium">{ipo.recommendation || "APPLY"}</span>
            </div>
            {ipo.thesis && (
              <div className="pt-2 space-y-1">
                <span className="text-zinc-500 text-[11px] block">Admin Thesis / Note:</span>
                <p className="text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 leading-relaxed">
                  {ipo.thesis}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline & Lifecycle Card */}
        <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-400" />
              Lifecycle & Historical Timeline
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Recorded milestone dates from ingestion
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] block">Bidding Window</span>
              <div className="text-zinc-200 font-medium font-sans">
                {ipo.metrics?.openDate || "—"} → {ipo.metrics?.closeDate || "—"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] block">Allotment Date</span>
              <div className="text-zinc-200 font-medium font-sans">{ipo.metrics?.allotmentDate || "—"}</div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] block">Fund Unblock Date</span>
              <div className="text-zinc-200 font-medium font-sans">{ipo.metrics?.fundUnblockDate || "—"}</div>
            </div>

            {ipo.allotmentFinalized && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Allotment Finalized</span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {ipo.allotmentFinalizedAt ? new Date(ipo.allotmentFinalizedAt).toLocaleString("en-IN") : "Completed"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member Payouts Table */}
      {profitDistribution?.memberPayouts && profitDistribution.memberPayouts.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" />
                Member Profit Distribution Breakdown
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Individual member payouts calculated and recorded in the database
              </CardDescription>
            </div>

            <div className="text-xs text-zinc-400">
              {profitDistribution.memberPayouts.length} Participants
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-[13px] text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Member</th>
                  <th className="py-2.5 px-3">PAN</th>
                  <th className="py-2.5 px-3">Contribution</th>
                  <th className="py-2.5 px-3">Lots</th>
                  <th className="py-2.5 px-4 text-right">Profit Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {profitDistribution.memberPayouts.map((payout, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-zinc-200">
                      {payout.name}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-xs">
                      {payout.pan || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-200 t-num">
                      ₹{payout.contribution.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300 t-num">
                      {payout.lots}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-400 t-num">
                      ₹{payout.profit.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

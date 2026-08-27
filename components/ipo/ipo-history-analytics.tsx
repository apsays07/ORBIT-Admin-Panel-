"use client";

import React, { useState, useMemo } from "react";
import {
  IpoHistoryAnalyticsData,
  HistoricalIpoAnalyticsItem,
  IpoTimelinePoint,
  TimeRangeOption,
  AggregationInterval,
  aggregateHistoricalIpos,
  formatCurrency,
  formatPercentage,
  formatNumber,
} from "@/lib/calculations";
import {
  TrendingUp,
  History,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IpoHistoryAnalyticsProps {
  initialAnalytics?: IpoHistoryAnalyticsData;
  rawHistoricalIpos?: any[];
  rawHistoricalApps?: any[];
  onOpenAddIpo?: () => void;
}

const TIME_RANGES: { label: string; value: TimeRangeOption }[] = [
  { label: "7D", value: "7D" },
  { label: "30D", value: "30D" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "All", value: "ALL" },
];

export function IpoHistoryAnalytics({
  initialAnalytics,
  rawHistoricalIpos = [],
  rawHistoricalApps = [],
  onOpenAddIpo,
}: IpoHistoryAnalyticsProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRangeOption>("ALL");
  const [activityInterval, setActivityInterval] = useState<AggregationInterval>("DAILY");
  const [profitInterval, setProfitInterval] = useState<AggregationInterval>("DAILY");
  const [profitViewMode, setProfitViewMode] = useState<"CUMULATIVE" | "DISCRETE">("CUMULATIVE");

  const [hoveredActivityIndex, setHoveredActivityIndex] = useState<number | null>(null);
  const [hoveredProfitIndex, setHoveredProfitIndex] = useState<number | null>(null);
  const [showBreakdownTable, setShowBreakdownTable] = useState(false);

  // Recalculate activity dataset dynamically based on range & activityInterval
  const activityAnalytics: IpoHistoryAnalyticsData = useMemo(() => {
    if (rawHistoricalIpos.length > 0) {
      return aggregateHistoricalIpos(rawHistoricalIpos, rawHistoricalApps, selectedRange, activityInterval);
    }
    return (
      initialAnalytics || {
        timeRange: selectedRange,
        interval: activityInterval,
        kpis: {
          totalIposApplied: 0,
          totalApplications: 0,
          totalAllotted: 0,
          totalNotAllotted: 0,
          totalPending: 0,
          allotmentRate: 0,
          totalCapitalInvested: 0,
          totalProfit: 0,
          overallReturn: 0,
        },
        comparison: {
          hasComparison: false,
          profitGrowthPct: null,
          appliedGrowthPct: null,
          allotmentRateDeltaPp: null,
          prevTotalProfit: 0,
          prevTotalApplied: 0,
          prevAllotmentRate: 0,
        },
        insights: {
          peakApplied: null,
          peakAllotted: null,
          bestProfitIpo: null,
          overallAllotmentRate: 0,
          hasProfitData: false,
        },
        timeline: [],
        outcome: {
          applied: 0,
          allotted: 0,
          notAllotted: 0,
          pending: 0,
          allotmentRate: 0,
          notAllottedRate: 0,
          pendingRate: 0,
        },
        breakdown: [],
      }
    );
  }, [rawHistoricalIpos, rawHistoricalApps, selectedRange, activityInterval, initialAnalytics]);

  // Recalculate profit dataset dynamically based on range & profitInterval
  const profitAnalytics: IpoHistoryAnalyticsData = useMemo(() => {
    if (rawHistoricalIpos.length > 0) {
      return aggregateHistoricalIpos(rawHistoricalIpos, rawHistoricalApps, selectedRange, profitInterval);
    }
    return activityAnalytics;
  }, [rawHistoricalIpos, rawHistoricalApps, selectedRange, profitInterval, activityAnalytics]);

  const { kpis, outcome, breakdown, comparison, insights } = activityAnalytics;
  const activityTimeline = activityAnalytics.timeline;
  const profitTimeline = profitAnalytics.timeline;
  const hasData = breakdown.length > 0;

  // Sizing constants for responsive SVG charts
  const svgWidth = 650;
  const svgHeight = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // 1. Calculations for Activity Chart (Applied vs Allotted)
  const maxActivityValue = useMemo(() => {
    if (activityTimeline.length === 0) return 10;
    const maxVal = Math.max(...activityTimeline.map((p) => p.appliedCount), 1);
    return Math.ceil(maxVal * 1.2);
  }, [activityTimeline]);

  const activityCoords = useMemo(() => {
    if (activityTimeline.length === 0) return { appliedPoints: [], allottedPoints: [], appliedPath: "", allottedPath: "", appliedArea: "", allottedArea: "" };

    const n = activityTimeline.length;
    const getX = (idx: number) => {
      if (n === 1) return padding.left + chartWidth / 2;
      return padding.left + (idx / (n - 1)) * chartWidth;
    };
    const getY = (val: number) => {
      return padding.top + chartHeight - (val / maxActivityValue) * chartHeight;
    };

    const appliedPoints = activityTimeline.map((p, idx) => ({ x: getX(idx), y: getY(p.appliedCount), raw: p }));
    const allottedPoints = activityTimeline.map((p, idx) => ({ x: getX(idx), y: getY(p.allottedCount), raw: p }));

    // Generate accurate path
    const buildPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return "";
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      return pts.reduce((acc, p, i, a) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = a[i - 1];
        const cp1x = prev.x + (p.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (p.x - prev.x) / 2;
        const cp2y = p.y;
        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p.x},${p.y}`;
      }, "");
    };

    const appliedPath = buildPath(appliedPoints);
    const allottedPath = buildPath(allottedPoints);

    const baseLineY = padding.top + chartHeight;
    const appliedArea =
      appliedPoints.length > 0
        ? `${appliedPath} L ${appliedPoints[appliedPoints.length - 1].x},${baseLineY} L ${appliedPoints[0].x},${baseLineY} Z`
        : "";
    const allottedArea =
      allottedPoints.length > 0
        ? `${allottedPath} L ${allottedPoints[allottedPoints.length - 1].x},${baseLineY} L ${allottedPoints[0].x},${baseLineY} Z`
        : "";

    return { appliedPoints, allottedPoints, appliedPath, allottedPath, appliedArea, allottedArea };
  }, [activityTimeline, chartWidth, chartHeight, maxActivityValue]);

  // 2. Calculations for Profit Performance Chart (Cumulative or Discrete)
  const profitStats = useMemo(() => {
    if (profitTimeline.length === 0) return { min: 0, max: 10000, zeroY: padding.top + chartHeight, points: [], path: "", area: "", hasProfitData: false };

    const values = profitTimeline.map((p) =>
      profitViewMode === "CUMULATIVE" ? p.cumulativeProfit : p.profit
    );

    const hasProfitData = values.some((v) => v !== 0);
    if (!hasProfitData) {
      return { min: 0, max: 1000, zeroY: padding.top + chartHeight, points: [], path: "", area: "", hasProfitData: false };
    }

    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(1000, ...values);
    const span = (maxVal - minVal) * 1.15 || 1;

    const getY = (val: number) => {
      return padding.top + chartHeight - ((val - minVal) / span) * chartHeight;
    };

    const zeroY = getY(0);

    const points = profitTimeline.map((p, idx) => {
      const x = profitTimeline.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (idx / (profitTimeline.length - 1)) * chartWidth;
      const targetVal = profitViewMode === "CUMULATIVE" ? p.cumulativeProfit : p.profit;
      const y = getY(targetVal);
      return { x, y, value: targetVal, raw: p };
    });

    const buildPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return "";
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      return pts.reduce((acc, p, i, a) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = a[i - 1];
        const cp1x = prev.x + (p.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (p.x - prev.x) / 2;
        const cp2y = p.y;
        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p.x},${p.y}`;
      }, "");
    };

    const path = buildPath(points);
    const area = points.length > 0
      ? `${path} L ${points[points.length - 1].x},${zeroY} L ${points[0].x},${zeroY} Z`
      : "";

    return { min: minVal, max: maxVal, zeroY, points, path, area, hasProfitData: true };
  }, [profitTimeline, profitViewMode, chartWidth, chartHeight]);

  // Clean empty state if zero historical records
  if (!hasData) {
    return (
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-8 sm:p-12 text-center backdrop-blur-xs">
        <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <History className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
          Not Enough IPO History
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1.5 leading-relaxed">
          Complete more IPO records and finalize profit distributions to see performance trends and analytical insights.
        </p>
        {onOpenAddIpo && (
          <div className="mt-5">
            <Button
              onClick={onOpenAddIpo}
              className="h-9 px-4 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add IPO</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  const activeActivityPoint = hoveredActivityIndex !== null ? activityTimeline[hoveredActivityIndex] : null;
  const activeProfitPoint = hoveredProfitIndex !== null ? profitTimeline[hoveredProfitIndex] : null;

  return (
    <div className="space-y-5 font-sans">
      {/* Top Header & Range Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3.5 sm:p-4 rounded-2xl backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">
                Historical Syndicate Analytics
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                DATA-DRIVEN
              </span>
            </div>
            <p className="text-[12px] text-zinc-400">
              Deterministic outcome metrics & financial performance over time
            </p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/90 self-start sm:self-auto shadow-2xs">
          {TIME_RANGES.map((r) => {
            const isActive = selectedRange === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRange(r.value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 Top Key Analytics Cards (KPI Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Offerings Joined */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-3.5 hover:border-zinc-700/90 transition-all duration-200 shadow-2xs">
          <div className="flex items-center justify-between gap-1 text-zinc-400 text-[11.5px] font-medium">
            <span>Offerings Joined</span>
            <History className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-zinc-100 tracking-tight">
            {kpis.totalIposApplied}
          </div>
          <p className="text-[10.5px] text-zinc-500 mt-1">Distinct IPOs</p>
        </div>

        {/* KPI 2: Total Applications */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-3.5 hover:border-indigo-700/40 transition-all duration-200 shadow-2xs">
          <div className="flex items-center justify-between gap-1 text-indigo-400 text-[11.5px] font-medium">
            <span>Total Applied</span>
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-400 tracking-tight">
            {formatNumber(kpis.totalApplications)}
          </div>
          {comparison.hasComparison && comparison.appliedGrowthPct !== null ? (
            <p className="text-[10.5px] text-zinc-400 mt-1 flex items-center gap-0.5">
              <span className={comparison.appliedGrowthPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {comparison.appliedGrowthPct >= 0 ? "↑" : "↓"} {Math.abs(comparison.appliedGrowthPct)}%
              </span>
              <span>vs prev.</span>
            </p>
          ) : (
            <p className="text-[10.5px] text-zinc-500 mt-1">Lots / PAN filings</p>
          )}
        </div>

        {/* KPI 3: Total Allotted */}
        <div className="rounded-2xl bg-zinc-900/50 border border-emerald-900/30 p-3.5 hover:border-emerald-700/50 transition-all duration-200 shadow-2xs">
          <div className="flex items-center justify-between gap-1 text-emerald-400 text-[11.5px] font-medium">
            <span>Total Allotted</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-400 tracking-tight">
            {formatNumber(kpis.totalAllotted)}
          </div>
          <p className="text-[10.5px] text-zinc-500 mt-1">{formatNumber(kpis.totalNotAllotted)} not allotted</p>
        </div>

        {/* KPI 4: Allotment Rate */}
        <div className="rounded-2xl bg-zinc-900/50 border border-purple-900/30 p-3.5 hover:border-purple-700/50 transition-all duration-200 shadow-2xs">
          <div className="flex items-center justify-between gap-1 text-purple-400 text-[11.5px] font-medium">
            <span>Allotment Rate</span>
            <Percent className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-zinc-100 tracking-tight">
            {formatPercentage(kpis.allotmentRate)}
          </div>
          {comparison.hasComparison && comparison.allotmentRateDeltaPp !== null ? (
            <p className="text-[10.5px] text-zinc-400 mt-1 flex items-center gap-0.5">
              <span className={comparison.allotmentRateDeltaPp >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {comparison.allotmentRateDeltaPp >= 0 ? "↑" : "↓"} {Math.abs(comparison.allotmentRateDeltaPp)} pp
              </span>
              <span>vs prev.</span>
            </p>
          ) : (
            <div className="w-full bg-zinc-800/80 rounded-full h-1 mt-1.5 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, kpis.allotmentRate))}%` }}
              />
            </div>
          )}
        </div>

        {/* KPI 5: Capital Invested */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-3.5 hover:border-sky-700/40 transition-all duration-200 shadow-2xs">
          <div className="flex items-center justify-between gap-1 text-sky-400 text-[11.5px] font-medium">
            <span>Capital Invested</span>
            <Coins className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-zinc-100 tracking-tight truncate">
            {formatCurrency(kpis.totalCapitalInvested)}
          </div>
          <p className="text-[10.5px] text-zinc-500 mt-1">Total pooled funds</p>
        </div>

        {/* KPI 6: Realized Profit */}
        <div
          className={cn(
            "rounded-2xl bg-zinc-900/50 border p-3.5 transition-all duration-200 shadow-2xs",
            kpis.totalProfit >= 0
              ? "border-emerald-900/40 hover:border-emerald-700/50"
              : "border-rose-900/40 hover:border-rose-700/50"
          )}
        >
          <div className="flex items-center justify-between gap-1 text-[11.5px] font-medium">
            <span className={kpis.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
              Realized Profit
            </span>
            {kpis.totalProfit >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
            )}
          </div>
          <div
            className={cn(
              "mt-2 text-lg font-bold tracking-tight truncate",
              kpis.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {formatCurrency(kpis.totalProfit)}
          </div>
          <p className="text-[10.5px] text-zinc-400 mt-1">
            <strong className={kpis.overallReturn >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {formatPercentage(kpis.overallReturn, { showPlus: true })}
            </strong>{" "}
            overall ROI
          </p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. IPO Activity Chart */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md shadow-xs">
          {/* Card Header & Interval Control */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-1.5">
                  <LineChart className="h-3.5 w-3.5 text-indigo-400" />
                  <span>IPO Activity Over Time</span>
                </h3>
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                Exact applied lots vs confirmed lot allocations
              </p>
            </div>

            {/* Granularity & Legend */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                {(["DAILY", "WEEKLY", "MONTHLY"] as AggregationInterval[]).map((iv) => (
                  <button
                    key={iv}
                    type="button"
                    onClick={() => setActivityInterval(iv)}
                    className={cn(
                      "px-2 py-0.5 text-[10.5px] font-medium rounded-md transition-all cursor-pointer",
                      activityInterval === iv
                        ? "bg-zinc-800 text-zinc-100 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {iv === "DAILY" ? "Daily" : iv === "WEEKLY" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-medium pl-2 border-l border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  <span className="text-zinc-300">Applied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300">Allotted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div className="relative mt-3 w-full aspect-16/9 sm:aspect-21/9 max-h-[220px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible select-none"
            >
              <defs>
                <linearGradient id="appliedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="allottedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = padding.top + chartHeight * pct;
                const val = Math.round(maxActivityValue * (1 - pct));
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + chartWidth}
                      y2={y}
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray={pct === 1 ? "none" : "3,3"}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9.5"
                      fill="#71717a"
                      fontFamily="monospace"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area Fills */}
              {activityCoords.appliedArea && (
                <path d={activityCoords.appliedArea} fill="url(#appliedGrad)" />
              )}
              {activityCoords.allottedArea && (
                <path d={activityCoords.allottedArea} fill="url(#allottedGrad)" />
              )}

              {/* Lines */}
              {activityCoords.appliedPath && (
                <path
                  d={activityCoords.appliedPath}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                />
              )}
              {activityCoords.allottedPath && (
                <path
                  d={activityCoords.allottedPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                />
              )}

              {/* Points & Hover Columns */}
              {activityCoords.appliedPoints.map((pt, idx) => {
                const isHovered = hoveredActivityIndex === idx;
                const showLabel =
                  activityTimeline.length <= 8 ||
                  idx === 0 ||
                  idx === activityTimeline.length - 1 ||
                  idx % Math.ceil(activityTimeline.length / 6) === 0;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredActivityIndex(idx)}
                    onMouseLeave={() => setHoveredActivityIndex(null)}
                  >
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={padding.top}
                        x2={pt.x}
                        y2={padding.top + chartHeight}
                        stroke="#52525b"
                        strokeWidth="1.2"
                        strokeDasharray="2,2"
                      />
                    )}

                    {/* Applied Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#6366f1"
                      stroke="#09090b"
                      strokeWidth="2"
                    />

                    {/* Allotted Dot */}
                    {activityCoords.allottedPoints[idx] && (
                      <circle
                        cx={activityCoords.allottedPoints[idx].x}
                        cy={activityCoords.allottedPoints[idx].y}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#10b981"
                        stroke="#09090b"
                        strokeWidth="2"
                      />
                    )}

                    {/* Date label */}
                    {showLabel && (
                      <text
                        x={pt.x}
                        y={padding.top + chartHeight + 18}
                        textAnchor="middle"
                        fontSize="9.5"
                        fill={isHovered ? "#f4f4f5" : "#71717a"}
                        fontWeight={isHovered ? "600" : "400"}
                      >
                        {pt.raw.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {activeActivityPoint && hoveredActivityIndex !== null && (
              <div
                className="absolute pointer-events-none z-20 bg-zinc-950/95 border border-zinc-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md text-xs min-w-[170px]"
                style={{
                  left: `${((activityCoords.appliedPoints[hoveredActivityIndex]?.x ?? 0) / svgWidth) * 100}%`,
                  top: "5%",
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-semibold text-zinc-200 border-b border-zinc-800 pb-1 mb-1.5 flex items-center justify-between gap-2">
                  <span>{activeActivityPoint.label}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{activeActivityPoint.date}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-indigo-400 font-medium">
                    <span>Applied:</span>
                    <span className="font-bold">{activeActivityPoint.appliedCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 font-medium">
                    <span>Allotted:</span>
                    <span className="font-bold">{activeActivityPoint.allottedCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Not Allotted:</span>
                    <span>{activeActivityPoint.notAllottedCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300 font-medium pt-1 border-t border-zinc-800/80">
                    <span>Allotment Rate:</span>
                    <span className="font-bold text-zinc-100">{activeActivityPoint.allotmentRate}%</span>
                  </div>
                  {activeActivityPoint.ipoNames.length > 0 && (
                    <div className="text-[10.5px] text-zinc-500 pt-1 truncate">
                      {activeActivityPoint.ipoNames.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Profit Gained Chart */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md shadow-xs">
          {/* Header with Mini-KPI and View Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {profitViewMode === "CUMULATIVE" ? "Cumulative Realized Profit" : "Periodic Realized Profit"}
                  </span>
                </h3>
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                {profitViewMode === "CUMULATIVE"
                  ? "Continuous equity and syndicate payout growth curve"
                  : "Net profit or loss realized per active period"}
              </p>
            </div>

            {/* Mode Toggle & Mini KPI */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setProfitViewMode("CUMULATIVE")}
                  className={cn(
                    "px-2 py-0.5 text-[10.5px] font-medium rounded-md transition-all cursor-pointer",
                    profitViewMode === "CUMULATIVE"
                      ? "bg-zinc-800 text-zinc-100 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Cumulative
                </button>
                <button
                  type="button"
                  onClick={() => setProfitViewMode("DISCRETE")}
                  className={cn(
                    "px-2 py-0.5 text-[10.5px] font-medium rounded-md transition-all cursor-pointer",
                    profitViewMode === "DISCRETE"
                      ? "bg-zinc-800 text-zinc-100 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Periodic
                </button>
              </div>

              <div className="text-right pl-2 border-l border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
                  NET PROFIT
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-sm font-bold",
                    kpis.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {formatCurrency(kpis.totalProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Profit Chart */}
          <div className="relative mt-3 w-full aspect-16/9 sm:aspect-21/9 max-h-[220px]">
            {!profitStats.hasProfitData ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/40">
                <Coins className="h-6 w-6 text-zinc-600 mb-1" />
                <p className="text-xs text-zinc-400 font-medium">No realized profit data available</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Profit distributions for selected period have not yet been finalized.
                </p>
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[0, 0.33, 0.66, 1].map((pct, i) => {
                    const y = padding.top + chartHeight * pct;
                    const val = Math.round(profitStats.max - pct * (profitStats.max - profitStats.min));
                    return (
                      <g key={i}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + chartWidth}
                          y2={y}
                          stroke="#27272a"
                          strokeWidth="1"
                          strokeDasharray={pct === 1 ? "none" : "3,3"}
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9.5"
                          fill="#71717a"
                          fontFamily="monospace"
                        >
                          ₹{Math.round(val / 1000)}k
                        </text>
                      </g>
                    );
                  })}

                  {/* Zero baseline */}
                  {profitStats.min < 0 && (
                    <line
                      x1={padding.left}
                      y1={profitStats.zeroY}
                      x2={padding.left + chartWidth}
                      y2={profitStats.zeroY}
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                    />
                  )}

                  {/* Area Fill */}
                  {profitStats.area && (
                    <path d={profitStats.area} fill="url(#profitGrad)" />
                  )}

                  {/* Profit Line */}
                  {profitStats.path && (
                    <path
                      d={profitStats.path}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Data Points */}
                  {profitStats.points?.map((pt, idx) => {
                    const isHovered = hoveredProfitIndex === idx;
                    const isPositive = pt.value >= 0;
                    const showLabel =
                      profitTimeline.length <= 8 ||
                      idx === 0 ||
                      idx === profitTimeline.length - 1 ||
                      idx % Math.ceil(profitTimeline.length / 6) === 0;

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredProfitIndex(idx)}
                        onMouseLeave={() => setHoveredProfitIndex(null)}
                      >
                        {isHovered && (
                          <line
                            x1={pt.x}
                            y1={padding.top}
                            x2={pt.x}
                            y2={padding.top + chartHeight}
                            stroke="#52525b"
                            strokeWidth="1.2"
                            strokeDasharray="2,2"
                          />
                        )}

                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 5.5 : 3.5}
                          fill={isPositive ? "#10b981" : "#ef4444"}
                          stroke="#09090b"
                          strokeWidth="2"
                        />

                        {showLabel && (
                          <text
                            x={pt.x}
                            y={padding.top + chartHeight + 18}
                            textAnchor="middle"
                            fontSize="9.5"
                            fill={isHovered ? "#f4f4f5" : "#71717a"}
                            fontWeight={isHovered ? "600" : "400"}
                          >
                            {pt.raw.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Profit Tooltip */}
                {activeProfitPoint && hoveredProfitIndex !== null && (
                  <div
                    className="absolute pointer-events-none z-20 bg-zinc-950/95 border border-zinc-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md text-xs min-w-[160px]"
                    style={{
                      left: `${((profitStats.points?.[hoveredProfitIndex]?.x ?? 0) / svgWidth) * 100}%`,
                      top: "5%",
                      transform: "translate(-50%, -100%)",
                    }}
                  >
                    <div className="font-semibold text-zinc-200 border-b border-zinc-800 pb-1 mb-1.5 flex items-center justify-between gap-2">
                      <span>{activeProfitPoint.label}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{activeProfitPoint.date}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">
                          {profitViewMode === "CUMULATIVE" ? "Cumulative Profit:" : "Periodic Profit:"}
                        </span>
                        <span
                          className={cn(
                            "font-bold",
                            (profitViewMode === "CUMULATIVE" ? activeProfitPoint.cumulativeProfit : activeProfitPoint.profit) >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          )}
                        >
                          {formatCurrency(
                            profitViewMode === "CUMULATIVE"
                              ? activeProfitPoint.cumulativeProfit
                              : activeProfitPoint.profit
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                        <span>Capital Pooled:</span>
                        <span className="font-medium text-zinc-300">
                          {formatCurrency(activeProfitPoint.capital)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300 font-medium pt-1 border-t border-zinc-800/80">
                        <span>Period ROI:</span>
                        <span
                          className={cn(
                            "font-bold",
                            activeProfitPoint.returnRate >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}
                        >
                          {formatPercentage(activeProfitPoint.returnRate, { showPlus: true })}
                        </span>
                      </div>
                      {activeProfitPoint.ipoNames.length > 0 && (
                        <div className="text-[10.5px] text-zinc-500 pt-1 truncate">
                          {activeProfitPoint.ipoNames.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Application Outcome Strip & Summary Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Outcome Breakdown Segmented Card (2 Cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 backdrop-blur-xs flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                <PieChart className="h-3.5 w-3.5 text-purple-400" />
                <span>Application Outcome Distribution</span>
              </span>
              <span className="text-zinc-400 text-[11px] font-mono">
                {outcome.applied} Total Applications
              </span>
            </div>
            <p className="text-[11.5px] text-zinc-400 mt-0.5">
              Breakdown of finalized allocations and awaiting filings
            </p>
          </div>

          {/* Segmented Bar */}
          <div className="w-full bg-zinc-800/90 rounded-xl h-3 overflow-hidden flex shadow-inner">
            {outcome.applied > 0 ? (
              <>
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(outcome.allotted / outcome.applied) * 100}%` }}
                  title={`Allotted: ${outcome.allotted} (${outcome.allotmentRate}%)`}
                />
                <div
                  className="bg-zinc-600 h-full transition-all duration-500"
                  style={{ width: `${(outcome.notAllotted / outcome.applied) * 100}%` }}
                  title={`Not Allotted: ${outcome.notAllotted} (${outcome.notAllottedRate}%)`}
                />
                {outcome.pending > 0 && (
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${(outcome.pending / outcome.applied) * 100}%` }}
                    title={`Pending: ${outcome.pending} (${outcome.pendingRate}%)`}
                  />
                )}
              </>
            ) : (
              <div className="bg-zinc-800 w-full h-full" />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/60 text-xs">
            <div className="flex items-center gap-4 text-[11.5px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">
                  Allotted — <strong className="text-zinc-100">{outcome.allotted}</strong> ·{" "}
                  <span className="text-emerald-400 font-medium">{outcome.allotmentRate}%</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
                <span className="text-zinc-300">
                  Not Allotted — <strong className="text-zinc-100">{outcome.notAllotted}</strong> ·{" "}
                  <span className="text-zinc-400 font-medium">{outcome.notAllottedRate}%</span>
                </span>
              </div>
              {outcome.pending > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-zinc-300">
                    Pending — <strong className="text-zinc-100">{outcome.pending}</strong> ·{" "}
                    <span className="text-amber-400 font-medium">{outcome.pendingRate}%</span>
                  </span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBreakdownTable(!showBreakdownTable)}
              className="h-7 px-2.5 text-xs font-medium border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg gap-1 cursor-pointer"
            >
              <span>{showBreakdownTable ? "Hide" : "Inspect"} Breakdown ({breakdown.length})</span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  showBreakdownTable && "rotate-90"
                )}
              />
            </Button>
          </div>
        </div>

        {/* Dynamic Telemetry Insights Box (1 Col on lg) */}
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 backdrop-blur-xs flex flex-col justify-between gap-2.5">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs border-b border-zinc-800/60 pb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            <span>Key Performance Insights</span>
          </div>

          <div className="space-y-2 text-xs text-zinc-300 font-normal">
            {insights.peakApplied && (
              <div className="flex items-start gap-1.5">
                <span className="text-indigo-400 shrink-0 font-bold">•</span>
                <span>
                  Peak applications on <strong>{insights.peakApplied.date}</strong> (
                  <span className="text-indigo-400 font-medium">{insights.peakApplied.count} lots</span>
                  {insights.peakApplied.name ? ` · ${insights.peakApplied.name}` : ""}).
                </span>
              </div>
            )}

            {insights.peakAllotted && (
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0 font-bold">•</span>
                <span>
                  Highest allotment achieved:{" "}
                  <strong className="text-emerald-400">{insights.peakAllotted.count} lots</strong> on{" "}
                  {insights.peakAllotted.date}.
                </span>
              </div>
            )}

            {insights.bestProfitIpo && (
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0 font-bold">•</span>
                <span>
                  Top realized return:{" "}
                  <strong className="text-emerald-400">+{formatCurrency(insights.bestProfitIpo.profit)}</strong> (
                  {insights.bestProfitIpo.name}).
                </span>
              </div>
            )}

            <div className="flex items-start gap-1.5">
              <span className="text-purple-400 shrink-0 font-bold">•</span>
              <span>
                Cumulative strike rate across active range:{" "}
                <strong className="text-purple-400">{formatPercentage(insights.overallAllotmentRate)}</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded IPO Breakdown Table */}
      {showBreakdownTable && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-sm animate-in fade-in-50 duration-200">
          <div className="p-3.5 sm:p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-zinc-200">
                Individual Offering Performance ({breakdown.length} IPOs in {selectedRange})
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Applications, confirmed allotments, capital, and profit realization per offering
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-zinc-400 font-medium">
                  <th className="py-2.5 px-4">IPO Name</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Applied</th>
                  <th className="py-2.5 px-3 text-right">Allotted</th>
                  <th className="py-2.5 px-3 text-right">Not Allotted</th>
                  <th className="py-2.5 px-3 text-right">Strike %</th>
                  <th className="py-2.5 px-3 text-right">Capital</th>
                  <th className="py-2.5 px-4 text-right">Profit</th>
                  <th className="py-2.5 px-4 text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                {breakdown.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium text-zinc-100">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                      {item.date ? new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-400 font-medium">
                      {formatNumber(item.totalApplications)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                      {formatNumber(item.allottedApplications)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-500">
                      {formatNumber(item.notAllottedApplications)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-zinc-200">
                      {formatPercentage(item.allotmentRate)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-300 font-mono">
                      {formatCurrency(item.capitalInvested)}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 px-4 text-right font-semibold font-mono",
                        item.realizedProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatCurrency(item.realizedProfit)}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 px-4 text-right font-semibold",
                        item.returnPercentage >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatPercentage(item.returnPercentage, { showPlus: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

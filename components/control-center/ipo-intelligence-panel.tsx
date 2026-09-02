"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Target,
  Coins,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  X,
  Building,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IpoIntelligenceInsight,
  IpoIntelligencePriority,
} from "@/types/control-center";
import { cn } from "@/lib/utils";

interface IpoIntelligencePanelProps {
  insights: IpoIntelligenceInsight[];
  onOpenMissingPansModal?: () => void;
  onSelectTab?: (tabKey: string) => void;
}

export function IpoIntelligencePanel({
  insights,
  onOpenMissingPansModal,
  onSelectTab,
}: IpoIntelligencePanelProps) {
  const router = useRouter();
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("ALL");
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [allModalSearch, setAllModalSearch] = useState("");

  const criticalCount = insights.filter((i) => i.priority === "CRITICAL").length;
  const highCount = insights.filter((i) => i.priority === "HIGH").length;
  const mediumCount = insights.filter((i) => i.priority === "MEDIUM").length;
  const infoCount = insights.filter((i) => i.priority === "INFO").length;

  const filteredInsights = useMemo(() => {
    if (selectedPriorityFilter === "ALL") return insights;
    return insights.filter((i) => i.priority === selectedPriorityFilter);
  }, [insights, selectedPriorityFilter]);

  // Show top 4 initially
  const topInsights = filteredInsights.slice(0, 4);

  function handleActionClick(insight: IpoIntelligenceInsight) {
    if (insight.actionType === "MODAL") {
      if (insight.actionTarget === "MISSING_PANS_MODAL" && onOpenMissingPansModal) {
        onOpenMissingPansModal();
      }
    } else if (insight.actionType === "TAB") {
      if (onSelectTab) {
        onSelectTab(insight.actionTarget);
      }
    } else if (insight.actionType === "NAVIGATE") {
      router.push(insight.actionTarget);
    }
  }

  function renderPriorityBadge(priority: IpoIntelligencePriority) {
    switch (priority) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono text-[10.5px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            🔴 CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[10.5px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            🟠 HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-300 font-mono text-[10.5px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            🟡 MEDIUM
          </span>
        );
      case "INFO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 font-mono text-[10.5px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            🔵 INFO
          </span>
        );
    }
  }

  function renderInsightIcon(iconName: string, priority: IpoIntelligencePriority) {
    const iconClass = cn(
      "h-4 w-4",
      priority === "CRITICAL"
        ? "text-rose-400"
        : priority === "HIGH"
        ? "text-amber-400"
        : priority === "MEDIUM"
        ? "text-yellow-400"
        : "text-sky-400"
    );

    switch (iconName) {
      case "AlertTriangle":
        return <AlertTriangle className={iconClass} />;
      case "Clock":
        return <Clock className={iconClass} />;
      case "Sparkles":
        return <Sparkles className={iconClass} />;
      case "TrendingUp":
        return <TrendingUp className={iconClass} />;
      case "Target":
        return <Target className={iconClass} />;
      case "Coins":
        return <Coins className={iconClass} />;
      case "ShieldAlert":
        return <ShieldAlert className={iconClass} />;
      case "CheckCircle2":
        return <CheckCircle2 className={iconClass} />;
      default:
        return <Brain className={iconClass} />;
    }
  }

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 shadow-sm space-y-4">
      {/* Header with Title & Priority Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-xs">
            <Brain className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                IPO Intelligence
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 font-semibold">
                AUTOMATED ALERTS
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Real-time operational alerts and actionable signals calculated from live database data.
            </p>
          </div>
        </div>

        {/* Insight Counters Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPriorityFilter(selectedPriorityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
            className={cn(
              "px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              selectedPriorityFilter === "CRITICAL"
                ? "bg-rose-500/25 border-rose-500/50 text-rose-200"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/15"
            )}
          >
            <span>🔴 Critical:</span>
            <span>{criticalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPriorityFilter(selectedPriorityFilter === "HIGH" ? "ALL" : "HIGH")}
            className={cn(
              "px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              selectedPriorityFilter === "HIGH"
                ? "bg-amber-500/25 border-amber-500/50 text-amber-200"
                : "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/15"
            )}
          >
            <span>🟠 High:</span>
            <span>{highCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPriorityFilter(selectedPriorityFilter === "MEDIUM" ? "ALL" : "MEDIUM")}
            className={cn(
              "px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5",
              selectedPriorityFilter === "MEDIUM"
                ? "bg-yellow-500/25 border-yellow-500/50 text-yellow-200"
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/15"
            )}
          >
            <span>🟡 Medium:</span>
            <span>{mediumCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPriorityFilter(selectedPriorityFilter === "INFO" ? "ALL" : "INFO")}
            className={cn(
              "px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5",
              selectedPriorityFilter === "INFO"
                ? "bg-sky-500/25 border-sky-500/50 text-sky-200"
                : "bg-sky-500/10 border-sky-500/20 text-sky-300 hover:bg-sky-500/15"
            )}
          >
            <span>🔵 Updates:</span>
            <span>{infoCount}</span>
          </button>

          {selectedPriorityFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedPriorityFilter("ALL")}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 underline ml-1 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Top Insights Grid */}
      {topInsights.length === 0 ? (
        <div className="py-8 text-center text-xs text-emerald-400 flex flex-col items-center justify-center gap-1.5 bg-zinc-950/40 rounded-xl border border-zinc-800/50">
          <CheckCircle2 className="h-6 w-6" />
          <span className="font-semibold text-zinc-200 text-sm">Zero Operational Anomalies Detected</span>
          <span className="text-zinc-500 text-xs">All active IPO schedules, applications, and allotments are up to date.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {topInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 shadow-2xs group hover:-translate-y-0.5",
                insight.priority === "CRITICAL"
                  ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
                  : insight.priority === "HIGH"
                  ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50"
                  : insight.priority === "MEDIUM"
                  ? "bg-yellow-950/15 border-yellow-500/25 hover:border-yellow-500/40"
                  : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
              )}
            >
              {/* Card Header: Priority + Icon + Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderPriorityBadge(insight.priority)}
                  {insight.ipoName && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-zinc-300 bg-zinc-850 px-2 py-0.5 rounded">
                      <Building className="h-3 w-3 text-zinc-400" />
                      <span className="truncate max-w-[150px]">{insight.ipoName}</span>
                    </span>
                  )}
                </div>
                {insight.dateText && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    {insight.dateText}
                  </span>
                )}
              </div>

              {/* Card Body: Title & Explanation */}
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {renderInsightIcon(insight.iconName, insight.priority)}
                  </div>
                  <h4 className="text-xs font-bold text-zinc-100 leading-snug">
                    {insight.title}
                  </h4>
                </div>
                <p className="text-xs text-zinc-400 pl-6 leading-relaxed">
                  {insight.explanation}
                </p>
              </div>

              {/* Card Footer: Action Button */}
              <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleActionClick(insight)}
                  className="h-7 text-xs font-mono font-medium px-2.5 rounded-lg text-purple-300 hover:text-purple-200 hover:bg-purple-500/15 cursor-pointer inline-flex items-center gap-1"
                >
                  <span>{insight.actionLabel}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer view all link if multiple insights */}
      {insights.length > 4 && (
        <div className="pt-2 flex items-center justify-between border-t border-zinc-800/50 text-xs">
          <span className="text-zinc-500 font-mono text-[11px]">
            Showing {topInsights.length} of {insights.length} total operational insights
          </span>
          <button
            type="button"
            onClick={() => setIsViewAllOpen(true)}
            className="text-purple-400 hover:text-purple-300 font-mono font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All Insights ({insights.length}) →</span>
          </button>
        </div>
      )}

      {/* "View All Insights" Modal */}
      {isViewAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 font-mono">
                    ALL IPO INTELLIGENCE INSIGHTS
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {insights.length} total active operational signals detected
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewAllOpen(false)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-950/40">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  value={allModalSearch}
                  onChange={(e) => setAllModalSearch(e.target.value)}
                  placeholder="Search intelligence insights by IPO or keyword..."
                  className="pl-9 h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-200 font-mono"
                />
              </div>
            </div>

            {/* Modal Insights List */}
            <div className="p-4 overflow-y-auto space-y-3">
              {insights
                .filter((item) => {
                  if (!allModalSearch.trim()) return true;
                  const q = allModalSearch.toLowerCase();
                  return (
                    item.title.toLowerCase().includes(q) ||
                    item.explanation.toLowerCase().includes(q) ||
                    (item.ipoName && item.ipoName.toLowerCase().includes(q))
                  );
                })
                .map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {renderPriorityBadge(insight.priority)}
                        {insight.ipoName && (
                          <span className="text-[11px] font-mono text-zinc-300 font-medium">
                            • {insight.ipoName}
                          </span>
                        )}
                        {insight.dateText && (
                          <span className="text-[10.5px] font-mono text-zinc-500">
                            ({insight.dateText})
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200 truncate">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2">
                        {insight.explanation}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsViewAllOpen(false);
                        handleActionClick(insight);
                      }}
                      className="shrink-0 h-8 text-xs font-mono border-zinc-700 hover:bg-zinc-800 text-purple-300 cursor-pointer"
                    >
                      <span>{insight.actionLabel}</span>
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

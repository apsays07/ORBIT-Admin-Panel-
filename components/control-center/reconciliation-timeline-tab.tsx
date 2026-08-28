"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  Shield,
  Search,
  History,
  Activity,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { ReconciliationTimelineItem } from "@/types/control-center";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ReconciliationTimelineTabProps {
  timeline: ReconciliationTimelineItem[];
  selectedIpoName: string;
}

export function ReconciliationTimelineTab({
  timeline,
  selectedIpoName,
}: ReconciliationTimelineTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredItems = timeline.filter((item) => {
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.actorUsername && item.actorUsername.toLowerCase().includes(q)) ||
      (item.memberUsername && item.memberUsername.toLowerCase().includes(q))
    );
  });

  function renderCategoryBadge(cat: string) {
    switch (cat) {
      case "RECONCILIATION":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
            RECONCILIATION
          </span>
        );
      case "APPLICATION":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            APPLICATION
          </span>
        );
      case "ALLOTMENT":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            ALLOTMENT
          </span>
        );
      case "PROFIT":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            PROFIT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            {cat}
          </span>
        );
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-5 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span>Recent Changes & Reconciliation Timeline</span>
            </h4>
            <p className="text-xs text-zinc-400">
              Audit log stream of syndicate updates, discrepancy detections, and resolutions for {selectedIpoName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activity..."
                className="pl-8 pr-3 bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:ring-purple-500/30"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-300 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="RECONCILIATION">Reconciliation</option>
              <option value="APPLICATION">Application</option>
              <option value="ALLOTMENT">Allotment</option>
              <option value="PROFIT">Profit</option>
              <option value="SECURITY">Security</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
        </div>

        {/* Timeline Events Stream */}
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No reconciliation events found matching your criteria.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
            {filteredItems.map((event) => (
              <div key={event.id} className="relative group">
                {/* Dot */}
                <div
                  className={cn(
                    "absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 bg-zinc-950",
                    event.type === "DISCREPANCY_DETECTED"
                      ? "border-rose-500"
                      : event.type === "ISSUE_RESOLVED"
                      ? "border-emerald-500"
                      : "border-purple-500"
                  )}
                />

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">
                        {event.title}
                      </span>
                      {renderCategoryBadge(event.category)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(event.timestamp).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500 font-mono">
                    {event.actorUsername && (
                      <span>Actor: <strong className="text-zinc-300 font-normal">@{event.actorUsername}</strong></span>
                    )}
                    {event.memberUsername && (
                      <span>Member: <strong className="text-zinc-300 font-normal">@{event.memberUsername}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

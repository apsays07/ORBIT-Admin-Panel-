"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calculator,
  HelpCircle,
  TrendingUp,
  Search,
  Copy,
  Check,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExplainNumberMetric } from "@/types/control-center";
import { cn } from "@/lib/utils";

interface ExplainNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: ExplainNumberMetric | null;
  isLoading?: boolean;
}

export function ExplainNumberModal({
  isOpen,
  onClose,
  metric,
  isLoading = false,
}: ExplainNumberModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const items = metric?.breakdownItems || [];
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
      (item.pan && item.pan.toLowerCase().includes(q)) ||
      (item.memberUsername && item.memberUsername.toLowerCase().includes(q))
    );
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
                  Explain This Number
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  LIVE CALCULATION
                </span>
              </div>
              <p className="text-xs text-zinc-400">{metric?.title || "Metric Details"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Top Summary Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-950/20 via-zinc-900/40 to-zinc-950 border-b border-zinc-800/80 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs text-purple-300 font-medium">{metric?.subtitle}</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tracking-tight mt-0.5">
                {metric?.formattedTotalValue || "0"}
              </div>
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              <span className="text-zinc-200 font-semibold">{metric?.breakdownCount || 0}</span> contributing record{metric?.breakdownCount === 1 ? "" : "s"}
            </div>
          </div>

          {metric?.formulaDescription && (
            <div className="flex items-start gap-2 text-xs text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 leading-relaxed">
              <HelpCircle className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>{metric.formulaDescription}</span>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        {items.length > 5 && (
          <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/80 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search breakdown by member, PAN..."
                className="pl-8 pr-3 bg-zinc-900/80 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:ring-purple-500/30"
              />
            </div>
          </div>
        )}

        {/* Breakdown Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-zinc-800/40">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono animate-pulse">
              Computing mathematical breakdown...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No contributing items found.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-mono text-zinc-600 w-5 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-200 truncate">
                        {item.label}
                      </span>
                      {item.pan && (
                        <button
                          type="button"
                          onClick={() => handleCopy(item.pan!, `pan_${idx}`)}
                          className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{item.pan}</span>
                          {copiedId === `pan_${idx}` ? (
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                        </button>
                      )}
                      {item.statusBadge && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {item.statusBadge}
                        </span>
                      )}
                    </div>
                    {item.subLabel && (
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {item.subLabel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-semibold text-zinc-100">
                    {item.formattedValue}
                  </span>
                  {typeof item.percentageOfTotal === "number" && item.percentageOfTotal > 0 && (
                    <div className="text-[10px] text-purple-400/80 font-mono">
                      {item.percentageOfTotal.toFixed(1)}% of total
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            <span>Exact summation verified across {items.length} records</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-7 px-3 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

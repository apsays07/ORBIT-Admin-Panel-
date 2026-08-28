"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CreditCard,
  History,
  Calendar,
  Layers,
  Building,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanAuditTimelineItem } from "@/types/control-center";
import { formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface PanTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: PanAuditTimelineItem | null;
  isLoading?: boolean;
}

export function PanTimelineModal({
  isOpen,
  onClose,
  timelineData,
  isLoading = false,
}: PanTimelineModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

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

  function handleCopyPan() {
    if (!timelineData?.pan) return;
    navigator.clipboard.writeText(timelineData.pan);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">
                  Why is this PAN listed?
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  AUDIT TRAIL
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Historical application timeline and participation verification
              </p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-zinc-500 font-mono animate-pulse">
              Retrieving historical application timeline...
            </div>
          ) : !timelineData ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              PAN audit timeline not available.
            </div>
          ) : (
            <>
              {/* PAN & Member Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/20 via-zinc-900/40 to-zinc-950 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg text-zinc-100">
                      {timelineData.pan}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPan}
                      className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                    {timelineData.totalHistoricalIpos} Past IPOs
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span>
                    Linked Member: <strong className="text-zinc-200">{timelineData.memberUsername ? `@${timelineData.memberUsername}` : timelineData.memberName}</strong>
                  </span>
                  <span>
                    Current IPO Status:{" "}
                    <strong className={cn(timelineData.isAppliedInCurrentIpo ? "text-emerald-400" : "text-rose-400")}>
                      {timelineData.currentIpoStatus}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                  Chronological Participation Log
                </h4>
                <div className="space-y-2">
                  {timelineData.timeline.map((event, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-zinc-500 text-[11px] w-4">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-zinc-200">{event.ipoName}</span>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {event.lots} Lot(s) • ₹{formatNumber(event.totalContribution)} • {event.applicationDate ? new Date(event.applicationDate).toLocaleDateString("en-IN") : "—"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10.5px] font-mono",
                          event.isAllotted
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-400"
                        )}
                      >
                        {event.isAllotted ? "ALLOTTED" : event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/40 flex justify-end text-xs shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

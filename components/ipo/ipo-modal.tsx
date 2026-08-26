"use client";

import React, { useState, useEffect } from "react";
import { NexoIPORecord } from "@/types/ipo";
import { createIpo, updateIpo } from "@/lib/ipo/actions";
import {
  X,
  Plus,
  Loader2,
  AlertCircle,
  TrendingUp,
  Check,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function getTodayYmd(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseToYmd(dateStr?: string): string {
  if (!dateStr) return getTodayYmd();
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return getTodayYmd();
}

interface IpoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: NexoIPORecord | null;
  onSuccess: () => void;
}

export function IpoModal({ isOpen, onClose, initialData, onSuccess }: IpoModalProps) {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState<"Mainboard" | "SME">(
    (initialData?.category as "Mainboard" | "SME") || "Mainboard"
  );
  const [ipoDate, setIpoDate] = useState<string>(() =>
    parseToYmd(initialData?.metrics?.openDate || initialData?.createdAt)
  );
  const [minInvestment, setMinInvestment] = useState<string>(
    initialData?.metrics?.minInvestment ? String(initialData.metrics.minInvestment) : ""
  );
  const [issueSize, setIssueSize] = useState<string>(() => {
    if (!initialData?.metrics?.issueSize) return "";
    return initialData.metrics.issueSize.replace(/[^0-9.]/g, "");
  });
  const [thesis, setThesis] = useState(initialData?.thesis || "");

  // GMP Section (Optional)
  const [gmpPrice, setGmpPrice] = useState<string>(
    initialData?.metrics?.gmpPrice !== undefined ? String(initialData.metrics.gmpPrice) : ""
  );
  const [gmpPercent, setGmpPercent] = useState<string>(
    initialData?.metrics?.gmpPercent !== undefined ? String(initialData.metrics.gmpPercent) : ""
  );

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  // GMP Auto-Calculation
  function handleGmpPriceChange(val: string) {
    setGmpPrice(val);
    const numericGmp = parseFloat(val);
    const numericMinInv = parseFloat(minInvestment) || 0;
    const estSharePrice = numericMinInv > 0 ? Math.round(numericMinInv / 100) : 0;

    if (!isNaN(numericGmp) && numericGmp > 0 && estSharePrice > 0) {
      if (!gmpPercent) {
        const calculatedPercent = ((numericGmp / estSharePrice) * 100).toFixed(2);
        setGmpPercent(calculatedPercent);
      }
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "IPO Name is required.";
    }

    if (!minInvestment.trim()) {
      errors.minInvestment = "Minimum investment is required.";
    } else if (isNaN(Number(minInvestment)) || Number(minInvestment) <= 0) {
      errors.minInvestment = "Enter a valid positive investment amount.";
    }

    if (!issueSize.trim()) {
      errors.issueSize = "Issue size is required.";
    } else if (isNaN(Number(issueSize)) || Number(issueSize) <= 0) {
      errors.issueSize = "Enter a valid numeric issue size.";
    }

    if (!thesis.trim()) {
      errors.thesis = "Description or Investment Thesis is required.";
    }

    if (gmpPercent.trim() && isNaN(Number(gmpPercent))) {
      errors.gmpPercent = "GMP percentage must be a valid number.";
    }

    if (gmpPrice.trim() && isNaN(Number(gmpPrice))) {
      errors.gmpPrice = "GMP price must be a valid number.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    // Formulate dates based on selected date
    const selectedDate = ipoDate ? new Date(ipoDate) : new Date();
    const formattedOpen = selectedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const closeD = new Date(selectedDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const formattedClose = closeD.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const allotmentD = new Date(selectedDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    const formattedAllotment = allotmentD.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const listingD = new Date(selectedDate.getTime() + 10 * 24 * 60 * 60 * 1000);
    const formattedListing = listingD.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("category", category);
    formData.append("minInvestment", minInvestment.trim());
    formData.append("issueSize", issueSize.trim());
    formData.append("thesis", thesis.trim());

    if (gmpPrice.trim()) formData.append("gmpPrice", gmpPrice.trim());
    if (gmpPercent.trim()) formData.append("gmpPercent", gmpPercent.trim());

    formData.append("openDate", formattedOpen);
    formData.append("closeDate", initialData?.metrics?.closeDate || formattedClose);
    formData.append("allotmentDate", initialData?.metrics?.allotmentDate || formattedAllotment);
    formData.append("listingDate", initialData?.metrics?.listingDate || formattedListing);
    formData.append("fundUnblockDate", initialData?.metrics?.fundUnblockDate || formattedAllotment);
    formData.append("groupDecision", initialData?.groupDecision || thesis.trim());
    formData.append("groupDecisionAuthor", initialData?.groupDecisionAuthor || "Admin");
    formData.append("registrarUrl", initialData?.registrarUrl || "");
    formData.append("status", initialData?.status || "APPLICATION_OPEN");

    try {
      let res;
      if (isEditing && initialData?.id) {
        res = await updateIpo(initialData.id, formData);
      } else {
        res = await createIpo(formData);
      }

      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || "Failed to save IPO record.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected server error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-zinc-950/95 border border-zinc-800/80 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-zinc-100 font-sans overflow-hidden flex flex-col backdrop-blur-xl">
        {/* Top subtle ambient glow line */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-zinc-900/80 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-indigo-600/10 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <Plus className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono uppercase">
                  {isEditing ? "Edit Offering" : "New Offering"}
                </span>
                <span className="text-[11.5px] text-zinc-400 font-medium font-sans">Basic Details</span>
              </div>
              <h2 className="text-[18px] font-semibold text-zinc-100 tracking-tight leading-snug font-sans">
                {isEditing ? "Edit IPO Opportunity" : "Add IPO Opportunity"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleFinalSubmit} className="px-6 py-4 space-y-4 flex-1">
          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: IPO Name */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1 font-sans">
              <span>IPO Name</span>
              <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationErrors.name) {
                  setValidationErrors((prev) => ({ ...prev, name: "" }));
                }
              }}
              placeholder="e.g. Tempsens Instruments Limited"
              className={cn(
                "h-10 bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/80 text-[13.5px] text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/80 transition-all shadow-inner font-sans",
                validationErrors.name && "border-rose-500"
              )}
            />
            {validationErrors.name && (
              <p className="text-[11px] text-rose-400 font-medium">{validationErrors.name}</p>
            )}
          </div>

          {/* Row 2: Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-zinc-300 block font-sans">Category</label>
              <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 h-10 items-center">
                <button
                  type="button"
                  onClick={() => setCategory("Mainboard")}
                  className={cn(
                    "flex-1 h-full rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center font-sans",
                    category === "Mainboard"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-xs font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Mainboard
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("SME")}
                  className={cn(
                    "flex-1 h-full rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center font-sans",
                    category === "SME"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-xs font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  SME
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5 font-sans">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <span>Date</span>
                <span className="text-rose-400">*</span>
              </label>
              <Input
                type="date"
                value={ipoDate}
                onChange={(e) => setIpoDate(e.target.value)}
                className="h-10 bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/80 text-[13px] text-zinc-100 font-sans rounded-xl focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/80 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Row 3: Min Investment + Issue Size */}
          <div className="grid grid-cols-2 gap-3">
            {/* Min Investment */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1 font-sans">
                <span>Min Investment</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs font-semibold select-none">₹</span>
                <Input
                  type="number"
                  value={minInvestment}
                  onChange={(e) => {
                    setMinInvestment(e.target.value);
                    if (validationErrors.minInvestment) {
                      setValidationErrors((prev) => ({ ...prev, minInvestment: "" }));
                    }
                  }}
                  placeholder="15000"
                  className={cn(
                    "pl-7 h-10 bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/80 text-[13.5px] text-zinc-100 font-mono placeholder:text-zinc-500 rounded-xl focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/80 transition-all shadow-inner",
                    validationErrors.minInvestment && "border-rose-500"
                  )}
                />
              </div>
              {validationErrors.minInvestment && (
                <p className="text-[11px] text-rose-400 font-medium">{validationErrors.minInvestment}</p>
              )}
            </div>

            {/* Issue Size */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1 font-sans">
                <span>Issue Size</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs font-semibold select-none">₹</span>
                <Input
                  type="number"
                  value={issueSize}
                  onChange={(e) => {
                    setIssueSize(e.target.value);
                    if (validationErrors.issueSize) {
                      setValidationErrors((prev) => ({ ...prev, issueSize: "" }));
                    }
                  }}
                  placeholder="650"
                  className={cn(
                    "pl-7 pr-10 h-10 bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/80 text-[13.5px] text-zinc-100 font-mono placeholder:text-zinc-500 rounded-xl focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/80 transition-all shadow-inner",
                    validationErrors.issueSize && "border-rose-500"
                  )}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 font-mono text-[10.5px] select-none">
                  Cr
                </span>
              </div>
              {validationErrors.issueSize && (
                <p className="text-[11px] text-rose-400 font-medium">{validationErrors.issueSize}</p>
              )}
            </div>
          </div>

          {/* Row 3: Thesis / Description */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1 font-sans">
              <span>Thesis / Decision Notes</span>
              <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              value={thesis}
              onChange={(e) => {
                setThesis(e.target.value);
                if (validationErrors.thesis) {
                  setValidationErrors((prev) => ({ ...prev, thesis: "" }));
                }
              }}
              placeholder="Leading manufacturer with strong domestic market share and robust financials..."
              className={cn(
                "w-full bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 text-[13px] text-zinc-100 placeholder:text-zinc-500 rounded-xl p-3 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/80 resize-none leading-relaxed transition-all shadow-inner font-sans",
                validationErrors.thesis && "border-rose-500"
              )}
            />
            {validationErrors.thesis && (
              <p className="text-[11px] text-rose-400 font-medium">{validationErrors.thesis}</p>
            )}
          </div>

          {/* Row 4: GMP (Optional) */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-950/20 to-zinc-900/40 border border-emerald-500/20 rounded-2xl space-y-2.5 relative overflow-hidden backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-400 font-sans">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span>Grey Market Premium (GMP)</span>
              </div>
              <span className="text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 select-none">
                Optional
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 font-sans">GMP Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">₹</span>
                  <Input
                    type="number"
                    value={gmpPrice}
                    onChange={(e) => handleGmpPriceChange(e.target.value)}
                    placeholder="0"
                    className="pl-6 h-8.5 bg-zinc-950/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/70"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 font-sans">GMP %</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={gmpPercent}
                    onChange={(e) => setGmpPercent(e.target.value)}
                    placeholder="0.00"
                    className="pr-7 h-8.5 bg-zinc-950/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/70"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-5 text-[13px] font-medium bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 rounded-xl cursor-pointer transition-all"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-6 text-[13px] font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] tracking-tight font-sans"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isEditing ? "Saving..." : "Creating..."}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditing ? "Save Changes" : "Create IPO"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

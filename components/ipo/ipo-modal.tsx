"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useToast } from "@/components/ui/toast";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";
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
  const toast = useToast();
  const isEditing = !!initialData;
  const nameInputRef = useRef<HTMLInputElement | null>(null);
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

  // Modal keyboard handling (ESC & focus restore)
  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    isSubmitting: loading,
    initialFocusRef: nameInputRef,
  });

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
        if (res.success) {
          toast.success("IPO Updated", `"${name.trim()}" details have been successfully updated.`);
          onSuccess();
        } else {
          const errMsg = res.error || "Failed to update IPO record.";
          setError(errMsg);
          toast.error("Failed to Update IPO", errMsg);
        }
      } else {
        res = await createIpo(formData);
        if (res.success) {
          toast.success("IPO Created", `"${name.trim()}" has been successfully added to offerings.`);
          onSuccess();
        } else {
          const errMsg = res.error || "Failed to create IPO record.";
          setError(errMsg);
          toast.error("Failed to Create IPO", errMsg);
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setError(errMsg);
      toast.error("Server Error", errMsg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl text-zinc-100 font-sans overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                {isEditing ? "Edit IPO Offering" : "Add New IPO Offering"}
              </h2>
              <p className="text-[11px] text-zinc-500">IPO offering details, dates, and allocation sizing</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleFinalSubmit} className="px-5 py-4 space-y-3.5 flex-1">
          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-md bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: IPO Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
              <span>IPO Name</span>
              <span className="text-rose-400">*</span>
            </label>
            <Input
              ref={nameInputRef}
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
                "h-9 bg-zinc-900 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-md focus-visible:ring-zinc-700",
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
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 block">Category</label>
              <div className="flex bg-zinc-900 p-0.5 rounded-md border border-zinc-800 h-9 items-center">
                <button
                  type="button"
                  onClick={() => setCategory("Mainboard")}
                  className={cn(
                    "flex-1 h-full rounded text-xs font-medium transition-colors cursor-pointer flex items-center justify-center",
                    category === "Mainboard"
                      ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/80 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Mainboard
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("SME")}
                  className={cn(
                    "flex-1 h-full rounded text-xs font-medium transition-colors cursor-pointer flex items-center justify-center",
                    category === "SME"
                      ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/80 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  SME
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-zinc-400" />
                <span>Date</span>
                <span className="text-rose-400">*</span>
              </label>
              <Input
                type="date"
                value={ipoDate}
                onChange={(e) => setIpoDate(e.target.value)}
                className="h-9 bg-zinc-900 border-zinc-800 text-xs text-zinc-100 rounded-md focus-visible:ring-zinc-700 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Row 3: Min Investment + Issue Size */}
          <div className="grid grid-cols-2 gap-3">
            {/* Min Investment */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                <span>Min Investment</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs select-none">₹</span>
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
                    "pl-6 h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 rounded-md focus-visible:ring-zinc-700",
                    validationErrors.minInvestment && "border-rose-500"
                  )}
                />
              </div>
              {validationErrors.minInvestment && (
                <p className="text-[11px] text-rose-400 font-medium">{validationErrors.minInvestment}</p>
              )}
            </div>

            {/* Issue Size */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                <span>Issue Size</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs select-none">₹</span>
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
                    "pl-6 pr-8 h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 rounded-md focus-visible:ring-zinc-700",
                    validationErrors.issueSize && "border-rose-500"
                  )}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[10px] select-none">
                  Cr
                </span>
              </div>
              {validationErrors.issueSize && (
                <p className="text-[11px] text-rose-400 font-medium">{validationErrors.issueSize}</p>
              )}
            </div>
          </div>

          {/* Row 3: Thesis / Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleFinalSubmit(e as any);
                }
              }}
              placeholder="Leading manufacturer with strong domestic market share and robust financials..."
              className={cn(
                "w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none leading-relaxed transition-colors font-sans",
                validationErrors.thesis && "border-rose-500"
              )}
            />
            {validationErrors.thesis && (
              <p className="text-[11px] text-rose-400 font-medium">{validationErrors.thesis}</p>
            )}
          </div>

          {/* Row 4: GMP (Optional) */}
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span>Grey Market Premium (GMP)</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 select-none">
                Optional
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">GMP Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">₹</span>
                  <Input
                    type="number"
                    value={gmpPrice}
                    onChange={(e) => handleGmpPriceChange(e.target.value)}
                    placeholder="0"
                    className="pl-6 h-8 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">GMP %</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={gmpPercent}
                    onChange={(e) => setGmpPercent(e.target.value)}
                    placeholder="0.00"
                    className="pr-6 h-8 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3 text-xs font-medium border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md cursor-pointer transition-colors flex items-center gap-2"
            >
              <span>Cancel</span>
              <KbdEsc />
            </Button>

            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              loadingText={isEditing ? "Saving..." : "Creating..."}
              className="h-8 min-w-[130px] px-4 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
            >
              <span>{isEditing ? "Save IPO" : "Create IPO"}</span>
              <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

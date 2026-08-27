"use client";

import React, { useState, useEffect, useRef } from "react";
import { ApplicationRecord } from "@/types/application";
import { bulkDeleteApplications } from "@/lib/application/actions";
import { useToast } from "@/components/ui/toast";
import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
  Layers,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: ApplicationRecord[];
  onBulkDeleted: (deletedIds: string[]) => void;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  selectedApplications,
  onBulkDeleted,
}: BulkDeleteModalProps) {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [isOpen, selectedApplications]);

  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    onConfirm: handleConfirmDelete,
    isSubmitting: isDeleting,
    initialFocusRef: cancelButtonRef,
  });

  if (!isOpen || selectedApplications.length === 0) return null;

  const count = selectedApplications.length;
  const totalCapital = selectedApplications.reduce(
    (sum, a) => sum + (a.totalContribution || 0),
    0
  );
  const totalPans = selectedApplications.reduce(
    (sum, a) => sum + (a.numberOfPanCards || a.panNumbers?.length || 1),
    0
  );

  async function handleConfirmDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);

    const ids = selectedApplications.map((a) => a.id);

    try {
      const res = await bulkDeleteApplications(ids);
      if (res.success) {
        toast.success(
          "Bulk Deletion Successful",
          `Permanently deleted ${res.count || count} application(s).`
        );
        onBulkDeleted(ids);
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to delete selected applications.");
        toast.error("Bulk Delete Failed", res.error || "Could not complete bulk deletion.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setErrorMessage(msg);
      toast.error("Error", msg);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl text-zinc-100 p-5 flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Delete {count} Applications
              </h3>
              <p className="text-[11px] text-zinc-500">Confirm bulk permanent deletion</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <Layers className="h-3 w-3 text-zinc-500" />
              Selected Records:
            </span>
            <span className="font-mono font-medium text-zinc-200">{count} applications ({totalPans} PANs)</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <Coins className="h-3 w-3 text-zinc-500" />
              Total Pooled Capital:
            </span>
            <span className="font-mono font-medium text-rose-300 t-num">
              ₹{totalCapital.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <p className="text-[11.5px] text-zinc-400 leading-normal font-sans">
          This action will permanently remove the <strong className="text-zinc-200">{count}</strong> selected application records from the database. This operation cannot be reversed.
        </p>

        {errorMessage && (
          <div className="p-2.5 rounded-md bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="h-8 px-3 text-xs font-medium border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md cursor-pointer flex items-center gap-2"
          >
            <span>Cancel</span>
            <KbdEsc />
          </Button>

          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            loadingText={`Deleting ${count} records...`}
            className="h-8 min-w-[150px] px-3.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete {count} Records</span>
            <KbdEnter label="Confirm" className="bg-black/30 border-white/20 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

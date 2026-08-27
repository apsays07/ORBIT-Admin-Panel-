"use client";

import React, { useState, useEffect, useRef } from "react";
import { ApplicationRecord } from "@/types/application";
import { deleteApplication } from "@/lib/application/actions";
import { useToast } from "@/components/ui/toast";
import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
  FileText,
  User,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";

interface DeleteApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationRecord | null;
  onDeleted: (appId: string) => void;
}

export function DeleteApplicationModal({
  isOpen,
  onClose,
  application,
  onDeleted,
}: DeleteApplicationModalProps) {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [isOpen, application]);

  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    onConfirm: handleDelete,
    isSubmitting: isDeleting,
    initialFocusRef: cancelButtonRef,
  });

  if (!isOpen || !application) return null;

  async function handleDelete() {
    if (!application || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deleteApplication(application.id);
      if (res.success) {
        onDeleted(application.id);
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to delete application record.");
        toast.error("Delete Failed", res.error || "Could not delete application.");
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
        {/* Modal Top Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Delete Application
              </h3>
              <p className="text-[11px] text-zinc-500">Confirm irreversible removal of application record</p>
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

        {/* Application Details Summary Card */}
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <FileText className="h-3 w-3 text-zinc-500" />
              Application ID:
            </span>
            <span className="font-mono font-medium text-zinc-200">{application.id}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <User className="h-3 w-3 text-zinc-500" />
              Applicant User:
            </span>
            <span className="font-medium text-zinc-100 font-sans">{application.applicantName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-sans">Offering / IPO:</span>
            <span className="font-medium text-zinc-200">{application.ipoName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <CreditCard className="h-3 w-3 text-zinc-500" />
              PAN Card(s):
            </span>
            <span className="font-mono text-zinc-300">
              {application.panNumbers?.join(", ") || "—"}
            </span>
          </div>
        </div>

        <p className="text-[11.5px] text-zinc-400 leading-normal font-sans">
          Are you sure you want to permanently delete this application? This action cannot be undone and will remove all allocation records linked to this filing.
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
            onClick={handleDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            loadingText="Deleting..."
            className="h-8 min-w-[140px] px-3.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete Application</span>
            <KbdEnter label="Confirm" className="bg-black/30 border-white/20 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

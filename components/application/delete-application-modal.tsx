"use client";

import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    setErrorMessage(null);
  }, [isOpen, application]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !application) return null;

  async function handleDelete() {
    if (!application || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deleteApplication(application.id);
      if (res.success) {
        toast.success(
          "Application Deleted",
          `Application ${application.id} for ${application.applicantName} was permanently removed.`
        );
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-zinc-800/90 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-zinc-100 p-6 flex flex-col gap-4 backdrop-blur-xl">
        {/* Ambient Top Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

        {/* Modal Top Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono uppercase">
                CONFIRM DELETION
              </span>
              <h3 className="text-lg font-semibold text-zinc-100 tracking-tight mt-0.5">
                Delete Application?
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Application Details Summary Card */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <FileText className="h-3.5 w-3.5 text-zinc-500" />
              Application ID:
            </span>
            <span className="font-mono font-semibold text-zinc-200">{application.id}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <User className="h-3.5 w-3.5 text-zinc-500" />
              Applicant User:
            </span>
            <span className="font-semibold text-zinc-100 font-sans">{application.applicantName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-sans">Offering / IPO:</span>
            <span className="font-medium text-zinc-200">{application.ipoName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
              PAN Card(s):
            </span>
            <span className="font-mono text-zinc-300">
              {application.panNumbers?.join(", ") || "—"}
            </span>
          </div>
        </div>

        <p className="text-[12.5px] text-zinc-400 leading-relaxed font-sans">
          Are you sure you want to permanently delete this application? This action cannot be undone and will remove all allocation records linked to this filing.
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-900">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="h-9.5 px-4 text-xs font-medium border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-9.5 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Application</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

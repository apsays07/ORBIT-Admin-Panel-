"use client";

import React, { useState } from "react";
import { MemberData } from "@/types/member";
import { deleteMember } from "@/lib/member/actions";
import { useToast } from "@/components/ui/toast";
import {
  X,
  AlertTriangle,
  Loader2,
  Trash2,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";

interface DeleteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberData | null;
  onDeleted: (memberId: string) => void;
}

export function DeleteMemberModal({
  isOpen,
  onClose,
  member,
  onDeleted,
}: DeleteMemberModalProps) {
  const toast = useToast();
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");
  const [isDeleting, setIsDeleting] = useState(false);

  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);

  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    onConfirm: handleConfirmDelete,
    isSubmitting: isDeleting,
    initialFocusRef: cancelButtonRef,
  });

  async function handleConfirmDelete() {
    if (!member || isDeleting) return;

    setIsDeleting(true);
    const hardDelete = deleteMode === "hard";
    const res = await deleteMember(member.id, hardDelete);
    setIsDeleting(false);

    if (res.success) {
      toast.success(
        hardDelete ? "Member Deleted" : "Member Deactivated",
        hardDelete
          ? `Permanently removed @${member.username} from the system.`
          : `Member @${member.username} status set to Blocked.`
      );
      onDeleted(member.id);
      onClose();
    } else {
      toast.error("Action Failed", res.error || "Failed to remove member.");
    }
  }

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-50">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xl text-zinc-100 font-sans">
        {/* Modal Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Manage Account Removal
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Target Member Profile Box */}
        <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
          <MemberAvatar
            src={member.avatar}
            name={member.name}
            className="h-8 w-8 rounded-md border border-zinc-800 text-xs shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-100 truncate">
                {member.name}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                @{member.username}
              </span>
            </div>
            <p className="text-[10.5px] text-zinc-500 font-mono">ID: {member.id}</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <label
            onClick={() => setDeleteMode("soft")}
            className={`p-2.5 rounded-md border cursor-pointer flex items-center gap-2.5 transition-colors ${
              deleteMode === "soft"
                ? "bg-amber-950/20 border-amber-500/40"
                : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="deleteMode"
              checked={deleteMode === "soft"}
              onChange={() => setDeleteMode("soft")}
              className="text-amber-500"
            />
            <div className="text-xs flex items-center gap-1.5">
              <span className="font-medium text-zinc-100">Deactivate Account</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                Recommended
              </span>
            </div>
          </label>

          <label
            onClick={() => setDeleteMode("hard")}
            className={`p-2.5 rounded-md border cursor-pointer flex items-center gap-2.5 transition-colors ${
              deleteMode === "hard"
                ? "bg-rose-950/20 border-rose-500/40"
                : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="deleteMode"
              checked={deleteMode === "hard"}
              onChange={() => setDeleteMode("hard")}
              className="text-rose-500"
            />
            <span className="text-xs font-medium text-rose-300">Permanent Delete</span>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
            className="text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-md flex items-center gap-2 h-8 px-3"
          >
            <span>Cancel</span>
            <KbdEsc />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            loadingText={deleteMode === "hard" ? "Deleting..." : "Deactivating..."}
            className={`text-xs font-medium rounded-md px-3.5 h-8 min-w-[140px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
              deleteMode === "hard"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-amber-600 hover:bg-amber-500 text-white"
            }`}
          >
            <span>{deleteMode === "hard" ? "Permanent Delete" : "Deactivate Account"}</span>
            <KbdEnter label="Confirm" className="bg-black/30 border-white/20 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

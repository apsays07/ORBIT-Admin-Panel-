"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  NotificationRecord,
  NotificationType,
  NotificationAudience,
  CreateNotificationInput,
  UpdateNotificationInput,
} from "@/types/notification";
import {
  createNotification,
  updateNotification,
} from "@/lib/notification/actions";
import { MemberOption, getMembersForSelection } from "@/lib/application/actions";
import { useToast } from "@/components/ui/toast";
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  Bell,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Coins,
  FileCheck2,
} from "lucide-react";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberSelectDropdown } from "@/components/ui/member-select-dropdown";
import { cn } from "@/lib/utils";

interface NotificationManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingNotification?: NotificationRecord | null;
  onSaved: (notif: NotificationRecord) => void;
}

const TYPE_OPTIONS: { type: NotificationType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { type: "INFO", label: "Info", icon: Info, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { type: "SUCCESS", label: "Success", icon: CheckCircle2, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { type: "ALLOTMENT", label: "Allotment", icon: FileCheck2, color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { type: "PROFIT", label: "Profit", icon: Coins, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { type: "WARNING", label: "Warning", icon: AlertTriangle, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { type: "URGENT", label: "Urgent", icon: Flame, color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
];

export function NotificationManagerDialog({
  isOpen,
  onClose,
  editingNotification,
  onSaved,
}: NotificationManagerDialogProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("INFO");
  const [targetAudience, setTargetAudience] = useState<NotificationAudience>("ALL_MEMBERS");
  const [targetMemberId, setTargetMemberId] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    isSubmitting,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (editingNotification) {
      setTitle(editingNotification.title || "");
      setMessage(editingNotification.message || "");
      setType(editingNotification.type || "INFO");
      setTargetAudience(editingNotification.targetAudience || "ALL_MEMBERS");
      setTargetMemberId(editingNotification.targetMemberId || "");
      setLinkUrl(editingNotification.linkUrl || "");
    } else {
      setTitle("");
      setMessage("");
      setType("INFO");
      setTargetAudience("ALL_MEMBERS");
      setTargetMemberId("");
      setLinkUrl("");
    }
    setError(null);

    // Load members list
    getMembersForSelection().then((list) => setMembers(list)).catch(() => {});
  }, [isOpen, editingNotification]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Notification title is required.");
      return;
    }
    if (!message.trim()) {
      setError("Notification message is required.");
      return;
    }
    if (targetAudience === "SPECIFIC_MEMBER" && !targetMemberId) {
      setError("Please select a target member.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingNotification) {
        const payload: UpdateNotificationInput = {
          id: editingNotification.id,
          title: title.trim(),
          message: message.trim(),
          type,
          targetAudience,
          targetMemberId: targetAudience === "SPECIFIC_MEMBER" ? targetMemberId : undefined,
          linkUrl: linkUrl.trim() || undefined,
        };
        const res = await updateNotification(payload);
        if (!res.success || !res.notification) {
          setError(res.error || "Failed to update notification.");
          return;
        }
        toast.success("Notification Updated", `"${title}" has been updated.`);
        onSaved(res.notification);
        onClose();
      } else {
        const payload: CreateNotificationInput = {
          title: title.trim(),
          message: message.trim(),
          type,
          targetAudience,
          targetMemberId: targetAudience === "SPECIFIC_MEMBER" ? targetMemberId : undefined,
          linkUrl: linkUrl.trim() || undefined,
        };
        const res = await createNotification(payload);
        if (!res.success || !res.notification) {
          setError(res.error || "Failed to send notification.");
          return;
        }
        toast.success("Notification Broadcasted", `"${title}" has been sent.`);
        onSaved(res.notification);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to process notification.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in-50 font-sans">
      <div className="w-full max-w-lg max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-100 tracking-tight">
                {editingNotification ? "Edit Notification" : "Send New Notification"}
              </h3>
              <p className="text-xs text-zinc-400">
                {editingNotification ? "Modify notification details and recipient" : "Broadcast notification to members"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

              {/* Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Notification Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = type === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setType(opt.type)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer gap-1",
                          isSelected
                            ? opt.color + " ring-1 ring-white/20 font-semibold"
                            : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-[11px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetAudience("ALL_MEMBERS")}
                    className={cn(
                      "h-8 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs",
                      targetAudience === "ALL_MEMBERS"
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <span>📢 All Members</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetAudience("SPECIFIC_MEMBER")}
                    className={cn(
                      "h-8 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs",
                      targetAudience === "SPECIFIC_MEMBER"
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <span>👤 Specific Member</span>
                  </button>
                </div>
              </div>

              {/* Specific Member Dropdown */}
              {targetAudience === "SPECIFIC_MEMBER" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Select Member <span className="text-rose-400">*</span>
                  </label>
                  <MemberSelectDropdown
                    members={members}
                    value={targetMemberId}
                    onChange={setTargetMemberId}
                    disabled={isSubmitting}
                    placeholder="Choose recipient member..."
                  />
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Allotment Results Finalized"
                  disabled={isSubmitting}
                  className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 rounded-xl focus-visible:ring-blue-500"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Message Content <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Write the announcement or alert details here..."
                  disabled={isSubmitting}
                  className="w-full bg-zinc-900/80 border border-zinc-800 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl focus:outline-hidden focus:border-blue-500 resize-none font-sans"
                />
              </div>

              {/* Action Link (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Action Link (Optional)
                </label>
                <Input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. /ad/profit or /ad/allotment"
                  disabled={isSubmitting}
                  className="h-10 bg-zinc-900/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-10 px-5 text-xs font-medium border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer flex items-center gap-2"
              >
                <span>Cancel</span>
                <KbdEsc />
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-6 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : editingNotification ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Changes</span>
                    <KbdEnter className="bg-blue-700/80 border-blue-400/40 text-blue-100" />
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send Notification</span>
                    <KbdEnter className="bg-blue-700/80 border-blue-400/40 text-blue-100" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
}

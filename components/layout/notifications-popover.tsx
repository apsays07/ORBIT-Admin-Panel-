"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  NotificationRecord,
  NotificationType,
} from "@/types/notification";
import {
  getNotifications,
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from "@/lib/notification/actions";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/toast";

const NotificationManagerDialog = dynamic(
  () => import("@/components/layout/notification-manager-dialog").then((m) => m.NotificationManagerDialog),
  { ssr: false }
);
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  CheckCheck,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Coins,
  FileCheck2,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "SUCCESS":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case "ALLOTMENT":
      return <FileCheck2 className="h-3.5 w-3.5 text-sky-400" />;
    case "PROFIT":
      return <Coins className="h-3.5 w-3.5 text-emerald-400" />;
    case "WARNING":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    case "URGENT":
      return <Flame className="h-3.5 w-3.5 text-rose-400" />;
    case "INFO":
    default:
      return <Info className="h-3.5 w-3.5 text-blue-400" />;
  }
}

function getTypeBadgeColor(type: NotificationType) {
  switch (type) {
    case "SUCCESS":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "ALLOTMENT":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "PROFIT":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "WARNING":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "URGENT":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "INFO":
    default:
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

let _cachedNotifications: NotificationRecord[] | null = null;
let _cachedUnreadCount = 0;
let _lastNotificationFetch = 0;
const NOTIFICATION_CACHE_TTL_MS = 60000;

export function NotificationsPopover() {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>(_cachedNotifications || []);
  const [unreadCount, setUnreadCount] = useState(_cachedUnreadCount);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog State for creating / editing
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NotificationRecord | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount & when opened
  async function loadData(force = false) {
    const now = Date.now();
    if (!force && _cachedNotifications && now - _lastNotificationFetch < NOTIFICATION_CACHE_TTL_MS) {
      setNotifications(_cachedNotifications);
      setUnreadCount(_cachedUnreadCount);
      return;
    }

    setIsLoading(true);
    try {
      const res = await getNotifications();
      if (res.success) {
        _cachedNotifications = res.notifications;
        _cachedUnreadCount = res.unreadCount;
        _lastNotificationFetch = Date.now();
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (_cachedNotifications) {
      setNotifications(_cachedNotifications);
      setUnreadCount(_cachedUnreadCount);
    } else {
      loadData(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData(true);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await deleteNotification(id);
    if (res.success) {
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== id);
        _cachedNotifications = next;
        return next;
      });
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        _cachedUnreadCount = next;
        return next;
      });
      _lastNotificationFetch = 0;
      toast.success("Notification Deleted", "Notification removed from database.");
    }
  }

  function handleEdit(item: NotificationRecord, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingItem(item);
    setIsManagerOpen(true);
    setIsOpen(false);
  }

  function handleOpenCreate() {
    setEditingItem(null);
    setIsManagerOpen(true);
    setIsOpen(false);
  }

  async function handleMarkAllAsRead() {
    const res = await markAllNotificationsAsRead();
    if (res.success) {
      setNotifications((prev) => {
        const next = prev.map((n) => ({ ...n, isRead: true }));
        _cachedNotifications = next;
        return next;
      });
      setUnreadCount(0);
      _cachedUnreadCount = 0;
      toast.success("All Caught Up", "All notifications marked as read.");
    }
  }

  async function handleClearAll() {
    if (!confirm("Are you sure you want to clear and delete all notifications?")) return;
    const res = await clearAllNotifications();
    if (res.success) {
      setNotifications([]);
      setUnreadCount(0);
      _cachedNotifications = [];
      _cachedUnreadCount = 0;
      _lastNotificationFetch = Date.now();
      toast.success("Cleared", "All notifications have been removed.");
    }
  }

  async function handleItemClick(item: NotificationRecord) {
    if (!item.isRead) {
      markNotificationAsRead(item.id);
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n));
        _cachedNotifications = next;
        return next;
      });
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        _cachedUnreadCount = next;
        return next;
      });
    }
  }

  return (
    <>
      <div className="relative" ref={containerRef}>
        {/* Bell Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title="Notifications & Broadcasts"
          className={cn(
            "relative h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs",
            isOpen
              ? "bg-zinc-800 border-zinc-700 text-white"
              : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          )}
        >
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-blue-600 border border-zinc-950 text-white font-mono text-[9.5px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Popover Flyout */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-[380px] sm:w-[420px] bg-zinc-950/95 border border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col font-sans animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-100 font-sans tracking-tight">
                  Notifications
                </span>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10.5px] font-mono font-semibold">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-400 text-[10.5px] font-mono">
                    {notifications.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {notifications.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Clear all notifications"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                <Button
                  type="button"
                  onClick={handleOpenCreate}
                  size="sm"
                  className="h-7 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg gap-1 cursor-pointer ml-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Send</span>
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-900">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-zinc-400" />
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2 px-4">
                  <div className="h-10 w-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-zinc-300">No Notifications</p>
                  <p className="text-[11px] text-zinc-500 max-w-[240px] mx-auto">
                    Broadcast announcements, allotments, and profit alerts to syndicate members.
                  </p>
                  <Button
                    type="button"
                    onClick={handleOpenCreate}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white rounded-lg mt-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Send First Notification
                  </Button>
                </div>
              ) : (
                notifications.map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        "p-3.5 hover:bg-zinc-900/60 transition-colors group cursor-pointer relative flex flex-col gap-1.5",
                        !item.isRead && "bg-blue-950/10"
                      )}
                    >
                      {/* Top row: Type badge, Audience, Relative time & Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border font-sans uppercase tracking-wider",
                              getTypeBadgeColor(item.type)
                            )}
                          >
                            {getTypeIcon(item.type)}
                            <span>{item.type}</span>
                          </span>

                          <span className="text-[10.5px] text-zinc-400 font-medium">
                            {item.targetAudience === "SPECIFIC_MEMBER"
                              ? `👤 ${item.targetMemberName || "Specific Member"}`
                              : "📢 All Members"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {formatRelativeTime(item.createdAt)}
                          </span>

                          {/* Hover action buttons: Edit & Delete */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleEdit(item, e)}
                              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              title="Edit notification"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(item.id, e)}
                              className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Title & Message */}
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-100 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-[11.5px] text-zinc-400 leading-relaxed mt-0.5">
                          {item.message}
                        </p>
                      </div>

                      {/* Optional Link */}
                      {item.linkUrl && (
                        <div className="pt-0.5">
                          <Link
                            href={item.linkUrl}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            <span>View details</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Notification Dialog */}
      <NotificationManagerDialog
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        editingNotification={editingItem}
        onSaved={() => {
          loadData();
        }}
      />
    </>
  );
}

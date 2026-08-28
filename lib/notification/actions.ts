"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import {
  NotificationRecord,
  CreateNotificationInput,
  UpdateNotificationInput,
} from "@/types/notification";
import { MemberData } from "@/types/member";
import { generateEntityId } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit/actions";
import { verifyAdminSession } from "@/lib/auth/session";

/**
 * Fetch all notifications ordered by creation date
 */
export async function getNotifications(): Promise<{
  success: boolean;
  notifications: NotificationRecord[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, notifications: [], unreadCount: 0, error: "Database unavailable." };
    }

    const docs = await db
      .collection<NotificationRecord>("notifications")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const notifications: NotificationRecord[] = docs.map((d) => ({
      ...d,
      id: d.id,
      title: d.title || "Notification",
      message: d.message || "",
      type: d.type || "INFO",
      targetAudience: d.targetAudience || "ALL_MEMBERS",
      isRead: Boolean(d.isRead),
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString(),
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      success: true,
      notifications: JSON.parse(JSON.stringify(notifications)),
      unreadCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch notifications.";
    return { success: false, notifications: [], unreadCount: 0, error: msg };
  }
}

/**
 * Admin creates and broadcasts a new notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; error?: string; notification?: NotificationRecord }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const title = input.title?.trim();
    const message = input.message?.trim();
    if (!title) return { success: false, error: "Notification title is required." };
    if (!message) return { success: false, error: "Notification message is required." };

    let targetMemberName: string | undefined;
    if (input.targetAudience === "SPECIFIC_MEMBER" && input.targetMemberId) {
      const mem = await db.collection<MemberData>("members").findOne({ id: input.targetMemberId });
      if (mem) {
        targetMemberName = mem.username ? `@${mem.username}` : mem.name;
      }
    }

    const nowIso = new Date().toISOString();
    const notifId = generateEntityId("notif");

    const newDoc: NotificationRecord = {
      id: notifId,
      title,
      message,
      type: input.type || "INFO",
      targetAudience: input.targetAudience || "ALL_MEMBERS",
      targetMemberId: input.targetAudience === "SPECIFIC_MEMBER" ? input.targetMemberId : undefined,
      targetMemberName,
      isRead: false,
      linkUrl: input.linkUrl?.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: adminUser,
    };

    await db.collection("notifications").insertOne(newDoc as any);

    await logAuditEvent({
      eventType: "NOTIFICATION_SENT",
      category: "SYSTEM",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "NOTIFICATION",
      targetId: notifId,
      targetName: title,
      title: `Sent Notification: ${title}`,
      subtitle: `Broadcasted to ${input.targetAudience === "SPECIFIC_MEMBER" ? targetMemberName || "member" : "All Members"}`,
    });

    revalidatePath("/ad");
    return {
      success: true,
      notification: JSON.parse(JSON.stringify({ ...newDoc, _id: undefined })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create notification.";
    return { success: false, error: msg };
  }
}

/**
 * Admin updates an existing notification
 */
export async function updateNotification(
  input: UpdateNotificationInput
): Promise<{ success: boolean; error?: string; notification?: NotificationRecord }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const { id, title, message, type, targetAudience, targetMemberId, linkUrl } = input;
    if (!id) return { success: false, error: "Notification ID is required." };

    const existing = await db.collection<NotificationRecord>("notifications").findOne({ id });
    if (!existing) return { success: false, error: "Notification not found." };

    let targetMemberName: string | undefined = existing.targetMemberName;
    if (targetAudience === "SPECIFIC_MEMBER" && targetMemberId) {
      const mem = await db.collection<MemberData>("members").findOne({ id: targetMemberId });
      if (mem) {
        targetMemberName = mem.username ? `@${mem.username}` : mem.name;
      }
    } else if (targetAudience === "ALL_MEMBERS") {
      targetMemberName = undefined;
    }

    const updates: Partial<NotificationRecord> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (message !== undefined) updates.message = message.trim();
    if (type !== undefined) updates.type = type;
    if (targetAudience !== undefined) updates.targetAudience = targetAudience;
    if (targetMemberId !== undefined) updates.targetMemberId = targetAudience === "SPECIFIC_MEMBER" ? targetMemberId : undefined;
    updates.targetMemberName = targetMemberName;
    if (linkUrl !== undefined) updates.linkUrl = linkUrl.trim() || undefined;

    await db.collection("notifications").updateOne({ id }, { $set: updates });

    const updatedDoc = await db
      .collection<NotificationRecord>("notifications")
      .findOne({ id }, { projection: { _id: 0 } });

    await logAuditEvent({
      eventType: "NOTIFICATION_UPDATED",
      category: "SYSTEM",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "NOTIFICATION",
      targetId: id,
      targetName: updates.title || existing.title,
      title: `Updated Notification: ${updates.title || existing.title}`,
    });

    revalidatePath("/ad");
    return {
      success: true,
      notification: updatedDoc ? JSON.parse(JSON.stringify(updatedDoc)) : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update notification.";
    return { success: false, error: msg };
  }
}

/**
 * Admin deletes a notification
 */
export async function deleteNotification(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const existing = await db.collection<NotificationRecord>("notifications").findOne({ id });
    if (!existing) return { success: false, error: "Notification not found." };

    await db.collection("notifications").deleteOne({ id });

    await logAuditEvent({
      eventType: "NOTIFICATION_DELETED",
      category: "SYSTEM",
      severity: "WARN",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "NOTIFICATION",
      targetId: id,
      targetName: existing.title,
      title: `Deleted Notification: ${existing.title}`,
    });

    revalidatePath("/ad");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete notification.";
    return { success: false, error: msg };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    await db.collection("notifications").updateOne(
      { id },
      { $set: { isRead: true, updatedAt: new Date().toISOString() } }
    );

    revalidatePath("/ad");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark as read.";
    return { success: false, error: msg };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    await db.collection("notifications").updateMany(
      { isRead: false },
      { $set: { isRead: true, updatedAt: new Date().toISOString() } }
    );

    revalidatePath("/ad");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark all as read.";
    return { success: false, error: msg };
  }
}

/**
 * Clear / Delete all notifications
 */
export async function clearAllNotifications(): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    await db.collection("notifications").deleteMany({});

    await logAuditEvent({
      eventType: "NOTIFICATIONS_CLEARED",
      category: "SYSTEM",
      severity: "WARN",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      title: "Cleared All Notifications",
      subtitle: "Admin purged all records from notifications collection",
    });

    revalidatePath("/ad");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to clear notifications.";
    return { success: false, error: msg };
  }
}

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import { SessionRecord, SecurityOverviewData } from "@/types/security";
import { AuditRecord } from "@/types/audit";
import { logAuditEvent } from "@/lib/audit/actions";

async function verifyAdminSession(): Promise<string> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("orbit_session");
  if (!sessionCookie) {
    throw new Error("Unauthorized: Admin session required.");
  }
  try {
    const parsed = JSON.parse(sessionCookie.value);
    return parsed.user || "Admin";
  } catch {
    throw new Error("Unauthorized: Invalid session.");
  }
}

export async function getSecurityOverview(): Promise<SecurityOverviewData> {
  await verifyAdminSession();
  const db = await getDatabase();

  if (!db) {
    return {
      metrics: {
        activeSessionsCount: 0,
        totalSessionsCount: 0,
        superAdminsCount: 0,
        securityEventsCount: 0,
      },
      sessions: [],
      recentSecurityEvents: [],
    };
  }

  const now = new Date().toISOString();
  const sessionCollection = db.collection<SessionRecord>("sessions");
  const activityCollection = db.collection<AuditRecord>("activities");
  const userCollection = db.collection("users");

  try {
    const [
      sessionDocs,
      totalSessionsCount,
      activeSessionsCount,
      superAdminsCount,
      secEventDocs,
      securityEventsCount,
    ] = await Promise.all([
      sessionCollection
        .find(
          {},
          {
            projection: {
              _id: 0,
              id: 1,
              userId: 1,
              createdAt: 1,
              updatedAt: 1,
              expiresAt: 1,
              lastActiveAt: 1,
              revokedAt: 1,
              deviceType: 1,
              browser: 1,
              os: 1,
              deviceName: 1,
              ipAddress: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(50)
        .maxTimeMS(8000)
        .toArray(),
      sessionCollection.countDocuments({}, { maxTimeMS: 8000 }),
      sessionCollection.countDocuments({
        revokedAt: null,
        expiresAt: { $gt: now },
      }, { maxTimeMS: 8000 }),
      userCollection.countDocuments({
        $or: [{ role: "SUPER_ADMIN" }, { isSuperAdmin: true }],
      }, { maxTimeMS: 8000 }),
      activityCollection
        .find(
          { $or: [{ isSecurityEvent: true }, { category: "SECURITY" }] },
          {
            projection: {
              _id: 0,
              id: 1,
              eventType: 1,
              type: 1,
              actorName: 1,
              memberName: 1,
              title: 1,
              subtitle: 1,
              createdAt: 1,
              timestamp: 1,
            },
          }
        )
        .sort({ createdAt: -1, timestamp: -1, _id: -1 })
        .limit(20)
        .maxTimeMS(8000)
        .toArray(),
      activityCollection.countDocuments({
        $or: [{ isSecurityEvent: true }, { category: "SECURITY" }],
      }, { maxTimeMS: 8000 }),
    ]);

  const nowMs = Date.now();
  const sessions: SessionRecord[] = sessionDocs.map((s) => ({
    ...s,
    _id: s._id?.toString(),
    sessionTokenHash: undefined,
    isActive: !s.revokedAt && new Date(s.expiresAt).getTime() > nowMs,
  }));

  const recentSecurityEvents: AuditRecord[] = secEventDocs.map((e) => ({
    ...e,
    _id: e._id?.toString(),
  }));

  return {
    metrics: {
      activeSessionsCount,
      totalSessionsCount,
      superAdminsCount,
      securityEventsCount,
    },
    sessions,
    recentSecurityEvents,
  };
  } catch (error) {
    console.error("[getSecurityOverview] Error:", error);
    return {
      metrics: {
        activeSessionsCount: 0,
        totalSessionsCount: 0,
        superAdminsCount: 0,
        securityEventsCount: 0,
      },
      sessions: [],
      recentSecurityEvents: [],
    };
  }
}

export async function revokeSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const nowIso = new Date().toISOString();

    const result = await db.collection("sessions").updateOne(
      { id: sessionId },
      {
        $set: {
          revokedAt: nowIso,
          updatedAt: nowIso,
        },
      }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Session not found." };
    }

    // Log authoritative audit event
    await logAuditEvent({
      eventType: "ADMIN_REVOKE_SESSION",
      category: "SECURITY",
      severity: "WARNING",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "SESSION",
      targetId: sessionId,
      targetName: `Revoked session ${sessionId}`,
      metadata: {
        revokedSessionId: sessionId,
        revokedAt: nowIso,
      },
    });

    revalidatePath("/ad/security");
    revalidatePath("/ad/audit");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke session.";
    return { success: false, error: msg };
  }
}

export async function revokeAllOtherSessions(): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const nowIso = new Date().toISOString();

    await db.collection("sessions").updateMany(
      { revokedAt: null },
      {
        $set: {
          revokedAt: nowIso,
          updatedAt: nowIso,
        },
      }
    );

    await logAuditEvent({
      eventType: "ALL_SESSIONS_REVOKED",
      category: "SECURITY",
      severity: "WARNING",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "SESSIONS",
      targetName: "All active sessions revoked",
      metadata: {
        revokedAt: nowIso,
      },
    });

    revalidatePath("/ad/security");
    revalidatePath("/ad/audit");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke sessions.";
    return { success: false, error: msg };
  }
}

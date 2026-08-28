import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { getDatabase } from "@/lib/db/mongodb";
import { SessionRecord } from "@/types/security";

/**
 * Authoritative Centralized Session Configuration
 */
export const SESSION_CONFIG = {
  COOKIE_NAME: "orbit_session",
  // Persistent session lifetime (When "Remember Me" is ON): 30 days
  PERSISTENT_MAX_AGE_SECONDS: 30 * 24 * 60 * 60,
  // Transient session lifetime (When "Remember Me" is OFF): 24 hours (or browser session)
  TRANSIENT_MAX_AGE_SECONDS: 24 * 60 * 60,
  // Automatic refresh threshold: Refresh session when less than 5 days remaining
  REFRESH_THRESHOLD_SECONDS: 5 * 24 * 60 * 60,
  // Throttled lastActiveAt update interval (5 minutes)
  ACTIVITY_UPDATE_INTERVAL_MS: 5 * 60 * 1000,
} as const;

export interface SessionPayload {
  sessionId: string;
  user: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER";
  rememberMe: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface SessionValidationResult {
  authenticated: boolean;
  user?: string;
  role?: string;
  sessionId?: string;
  reason?: "NO_SESSION" | "EXPIRED" | "REVOKED" | "INVALID" | "ERROR";
  sessionData?: SessionPayload;
}

/**
 * Parse client device details from headers
 */
function parseDeviceDetails(userAgentRaw?: string | null): {
  browser: string;
  os: string;
  deviceType: string;
  deviceName: string;
} {
  const ua = userAgentRaw || "";
  let browser = "Browser";
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/edge|edg/i.test(ua)) browser = "Edge";
  else if (/opera|opr/i.test(ua)) browser = "Opera";

  let os = "OS";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

  let deviceType = "Desktop";
  if (/mobile|android|iphone|ipod/i.test(ua)) deviceType = "Mobile";
  else if (/ipad|tablet/i.test(ua)) deviceType = "Tablet";

  const deviceName = `${browser} on ${os}`;
  return { browser, os, deviceType, deviceName };
}

/**
 * Generate a unique, cryptographically random session token ID
 */
export function generateSessionId(): string {
  const random = crypto.randomBytes(24).toString("hex");
  return `sess_${Date.now()}_${random}`;
}

/**
 * Create and persist a new authenticated session in MongoDB and set the secure cookie.
 */
export async function createSession({
  userId,
  role = "SUPER_ADMIN",
  rememberMe = true,
}: {
  userId: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "MEMBER";
  rememberMe?: boolean;
}): Promise<SessionPayload> {
  const sessionId = generateSessionId();
  const now = Date.now();
  const maxAgeSeconds = rememberMe
    ? SESSION_CONFIG.PERSISTENT_MAX_AGE_SECONDS
    : SESSION_CONFIG.TRANSIENT_MAX_AGE_SECONDS;

  const expiresAtMs = now + maxAgeSeconds * 1000;
  const createdAtIso = new Date(now).toISOString();
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  const payload: SessionPayload = {
    sessionId,
    user: userId,
    role,
    rememberMe,
    createdAt: now,
    expiresAt: expiresAtMs,
  };

  // 1. Persist session record into MongoDB `sessions` collection
  try {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "Unknown";
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const deviceInfo = parseDeviceDetails(userAgent);

    const db = await getDatabase();
    if (db) {
      const sessionDoc: SessionRecord = {
        id: sessionId,
        userId,
        createdAt: createdAtIso,
        updatedAt: createdAtIso,
        expiresAt: expiresAtIso,
        lastActiveAt: createdAtIso,
        revokedAt: null,
        userAgent,
        ipAddress,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
        deviceName: deviceInfo.deviceName,
        isActive: true,
      };

      await db.collection<any>("sessions").insertOne(sessionDoc);
    }
  } catch (err) {
    console.error("[createSession] Error persisting session document:", err);
  }

  // 2. Set secure HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_CONFIG.COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // If rememberMe is false, omitting maxAge creates a browser-session cookie
    ...(rememberMe ? { maxAge: maxAgeSeconds } : {}),
  });

  return payload;
}

/**
 * Validate the current session from the request cookie and verify against MongoDB.
 */
export async function validateSession(): Promise<SessionValidationResult> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_CONFIG.COOKIE_NAME);

    if (!sessionCookie?.value) {
      return { authenticated: false, reason: "NO_SESSION" };
    }

    let payload: SessionPayload;
    try {
      payload = JSON.parse(sessionCookie.value);
    } catch {
      return { authenticated: false, reason: "INVALID" };
    }

    if (!payload.sessionId || !payload.user) {
      return { authenticated: false, reason: "INVALID" };
    }

    const now = Date.now();

    // Check expiration timestamp
    if (payload.expiresAt && now > payload.expiresAt) {
      // Cookie is expired
      await destroySession();
      return { authenticated: false, reason: "EXPIRED" };
    }

    // Verify session state in database
    try {
      const db = await getDatabase();
      if (db) {
        const sessionDoc = await db.collection<SessionRecord>("sessions").findOne(
          { id: payload.sessionId },
          { maxTimeMS: 4000 }
        );

        if (sessionDoc) {
          // Check if revoked
          if (sessionDoc.revokedAt) {
            await destroySession();
            return { authenticated: false, reason: "REVOKED" };
          }

          // Check DB expiration
          if (sessionDoc.expiresAt && new Date(sessionDoc.expiresAt).getTime() < now) {
            await destroySession();
            return { authenticated: false, reason: "EXPIRED" };
          }

          // Update lastActiveAt throttled
          const lastActiveTime = sessionDoc.lastActiveAt ? new Date(sessionDoc.lastActiveAt).getTime() : 0;
          if (now - lastActiveTime > SESSION_CONFIG.ACTIVITY_UPDATE_INTERVAL_MS) {
            db.collection("sessions")
              .updateOne(
                { id: payload.sessionId },
                { $set: { lastActiveAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() } }
              )
              .catch(() => {});
          }

          // Auto-refresh session if approaching expiration and rememberMe is true
          const remainingSeconds = Math.floor((payload.expiresAt - now) / 1000);
          if (payload.rememberMe && remainingSeconds < SESSION_CONFIG.REFRESH_THRESHOLD_SECONDS) {
            const newExpiresAtMs = now + SESSION_CONFIG.PERSISTENT_MAX_AGE_SECONDS * 1000;
            payload.expiresAt = newExpiresAtMs;

            cookieStore.set(SESSION_CONFIG.COOKIE_NAME, JSON.stringify(payload), {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: SESSION_CONFIG.PERSISTENT_MAX_AGE_SECONDS,
            });

            db.collection("sessions")
              .updateOne(
                { id: payload.sessionId },
                { $set: { expiresAt: new Date(newExpiresAtMs).toISOString(), updatedAt: new Date(now).toISOString() } }
              )
              .catch(() => {});
          }
        }
      }
    } catch (dbErr) {
      // Graceful fallback: If database is temporarily unreachable, do not abruptly logout a valid cookie session
      console.warn("[validateSession] DB check skipped (resilient mode):", dbErr);
    }

    return {
      authenticated: true,
      user: payload.user,
      role: payload.role || "SUPER_ADMIN",
      sessionId: payload.sessionId,
      sessionData: payload,
    };
  } catch (error) {
    console.error("[validateSession] Unexpected error:", error);
    return { authenticated: false, reason: "ERROR" };
  }
}

/**
 * Destroy the current session (Logout):
 * - Deletes the cookie
 * - Marks the session as revoked in MongoDB
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_CONFIG.COOKIE_NAME);

    if (sessionCookie?.value) {
      try {
        const payload: SessionPayload = JSON.parse(sessionCookie.value);
        if (payload.sessionId) {
          const db = await getDatabase();
          if (db) {
            const nowIso = new Date().toISOString();
            await db.collection("sessions").updateOne(
              { id: payload.sessionId },
              { $set: { revokedAt: nowIso, updatedAt: nowIso, isActive: false } }
            );
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);
  } catch (err) {
    console.error("[destroySession] Error:", err);
  }
}

/**
 * Server-side guard for protected server actions and routes.
 * Throws Unauthorized error if session is invalid.
 */
export async function verifyAdminSession(): Promise<string> {
  const result = await validateSession();
  if (!result.authenticated || !result.user) {
    throw new Error("Unauthorized: Admin session required.");
  }
  return result.user;
}

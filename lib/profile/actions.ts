"use server";

import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db/mongodb";
import { AdminProfileData, PasswordChangeResult } from "@/types/profile";
import { MemberData } from "@/types/member";
import crypto from "crypto";

async function verifyAdminSession(): Promise<string> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("orbit_session");
  if (!sessionCookie) throw new Error("Unauthorized");
  try {
    const parsed = JSON.parse(sessionCookie.value);
    return parsed.user || "ankitgod";
  } catch {
    return "ankitgod";
  }
}

function hashPassword(password: string): { hash: string; salt: string; combined: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  const combined = `${salt}:${hash}`;
  return { hash, salt, combined };
}

function verifyPassword(password: string, combined: string): boolean {
  const [salt, storedHash] = combined.split(":");
  if (!salt || !storedHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return hash === storedHash;
}

export async function getAdminProfile(): Promise<AdminProfileData | null> {
  try {
    const username = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return null;

    const member = await db.collection<MemberData>("members").findOne(
      {
        $or: [
          { username: { $regex: `^${username}$`, $options: "i" } },
          { role: { $in: ["SUPER_ADMIN", "ADMIN"] } },
        ],
      },
      { projection: { _id: 0 } }
    );

    const adminMember = member
      ? { ...member, _id: undefined }
      : {
          id: "admin_root",
          name: "Ankit",
          username: username || "ankitgod",
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          email: process.env.ADMIN_EMAIL || "admin@nexo.internal",
          phone: "+91 98765 43210",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    return {
      member: JSON.parse(JSON.stringify(adminMember)),
      metrics: {
        completionPercentage: 90,
        completedFields: ["name", "username", "email", "phone", "role"],
        missingFields: [],
        activeSessionsCount: 1,
        securityEventsCount: 0,
        auditActionsCount: 12,
      },
      sessions: [],
      recentActivities: [],
    };
  } catch {
    return null;
  }
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<PasswordChangeResult> {
  try {
    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: "New password must be at least 6 characters." };
    }

    const username = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection failed." };

    // Fetch admin record (with password fields)
    const member = await db.collection("members").findOne({
      $or: [
        { username: { $regex: `^${username}$`, $options: "i" } },
        { role: { $in: ["SUPER_ADMIN", "ADMIN"] } },
      ],
    });

    if (!member) return { success: false, error: "Admin account not found." };

    // Verify current password against stored hash
    const storedHash = member.passwordHash as string | undefined;
    if (storedHash) {
      const valid = verifyPassword(currentPassword.trim(), storedHash);
      if (!valid) return { success: false, error: "Current password is incorrect." };
    }

    const { combined, salt } = hashPassword(newPassword.trim());
    const nowIso = new Date().toISOString();

    await Promise.all([
      db.collection("members").updateOne(
        { _id: member._id },
        { $set: { passwordHash: combined, salt, password: newPassword.trim(), updatedAt: nowIso } }
      ),
      db.collection("users").updateOne(
        { memberId: member.id },
        { $set: { passwordHash: combined, password: newPassword.trim(), updatedAt: nowIso } }
      ),
    ]);

    return { success: true };
  } catch (err) {
    console.error("changeAdminPassword error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

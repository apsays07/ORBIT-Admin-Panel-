"use server";

import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db/mongodb";
import { AdminProfileData, PasswordChangeResult } from "@/types/profile";
import { MemberData } from "@/types/member";
import { verifyAdminSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

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
    if (!newPassword || newPassword.length < 6) {
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
      const valid = verifyPassword(currentPassword, storedHash);
      if (!valid) return { success: false, error: "Current password is incorrect." };
    }

    const { combined, salt } = hashPassword(newPassword);
    const nowIso = new Date().toISOString();

    await Promise.all([
      db.collection("members").updateOne(
        { _id: member._id },
        {
          $set: { passwordHash: combined, salt, updatedAt: nowIso },
          $unset: { password: "" },
        }
      ),
      db.collection("users").updateOne(
        { memberId: member.id },
        {
          $set: { passwordHash: combined, updatedAt: nowIso },
          $unset: { password: "" },
        }
      ),
    ]);

    return { success: true };
  } catch (err) {
    console.error("changeAdminPassword error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

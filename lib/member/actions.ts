"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { getDatabase } from "@/lib/db/mongodb";
import {
  MemberData,
  MemberRosterMetrics,
  MemberPerformanceCategory,
  MemberLeaderboardRow,
  CreateMemberInput,
  UpdateMemberInput,
} from "@/types/member";
import { ApplicationRecord } from "@/types/application";
import { logAuditEvent } from "@/lib/audit/actions";
import { generateEntityId } from "@/lib/utils";
import { Filter } from "mongodb";

export interface GetMembersParams {
  query?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GetMembersResponse {
  members: MemberData[];
  total: number;
  page: number;
  totalPages: number;
  metrics: MemberRosterMetrics;
  currentUserUsername: string;
}

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

function sanitizeUsername(raw: string): string {
  let u = raw.trim().toLowerCase();
  if (u.startsWith("@")) u = u.slice(1);
  return u;
}

function maskPan(pan?: string): string | undefined {
  if (!pan) return undefined;
  const clean = pan.trim().toUpperCase();
  if (clean.length < 5) return clean;
  return `${clean.slice(0, 5)}XXXX${clean.slice(-1)}`;
}

function hashPassword(password: string): { hash: string; salt: string; combined: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt, combined: `${salt}:${hash}` };
}

export async function checkUsernameAvailability(
  rawUsername: string,
  excludeMemberId?: string
): Promise<{ available: boolean; message?: string }> {
  const username = sanitizeUsername(rawUsername);
  if (!username) {
    return { available: false, message: "Username cannot be empty." };
  }
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
    return {
      available: false,
      message: "Username must be 3-30 chars (lowercase letters, numbers, _, -, .).",
    };
  }

  const db = await getDatabase();
  if (!db) return { available: true };

  const filter: Filter<MemberData> = {
    username: { $regex: `^${username}$`, $options: "i" },
  };
  if (excludeMemberId) {
    filter.id = { $ne: excludeMemberId };
  }

  const existing = await db.collection<MemberData>("members").findOne(filter);
  if (existing) {
    return { available: false, message: `@${username} is already taken.` };
  }

  return { available: true };
}

export async function getMembers(
  params: GetMembersParams = {}
): Promise<GetMembersResponse> {
  const db = await getDatabase();
  let currentUserUsername = "ankitgod";
  try {
    currentUserUsername = await verifyAdminSession();
  } catch {
    // default
  }

  if (!db) {
    return {
      members: [],
      total: 0,
      page: 1,
      totalPages: 0,
      metrics: {
        totalMembers: 0,
        adminCount: 0,
        totalApplicationsSubmitted: 0,
        verifiedPercentage: 100,
      },
      currentUserUsername,
    };
  }

  const {
    query = "",
    role = "ALL",
    status = "ALL",
    page = 1,
    limit = 50,
  } = params;

  const memberCollection = db.collection<MemberData>("members");
  const appCollection = db.collection<ApplicationRecord>("applications");
  const distCollection = db.collection("profit_distributions");

  // Build Query Filter
  const filter: Filter<MemberData> = {};

  if (role && role !== "ALL") {
    if (role === "SUPER_ADMIN") {
      filter.role = { $in: ["SUPER_ADMIN", "ADMIN"] };
    } else if (role === "CORE_MEMBER") {
      filter.role = "CORE_MEMBER";
    } else if (role === "MEMBERS") {
      filter.role = { $nin: ["SUPER_ADMIN", "ADMIN"] };
    } else {
      filter.role = role;
    }
  }

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (query.trim()) {
    const rawQ = query.trim();
    const withoutAt = rawQ.startsWith("@") ? rawQ.slice(1) : rawQ;
    const escaped = withoutAt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { username: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { id: { $regex: escaped, $options: "i" } },
      { panFull: { $regex: escaped, $options: "i" } },
      { panMasked: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  // Execute global apps count and combined member facet in parallel
  const [totalAppsCountRaw, [memberFacetRaw]] = await Promise.all([
    appCollection
      .aggregate<{ _id: null; total: number }>([
        { $group: { _id: null, total: { $sum: { $ifNull: ["$numberOfPanCards", 1] } } } },
      ])
      .toArray(),
    memberCollection
      .aggregate<{
        total: { count: number }[];
        admin: { count: number }[];
        active: { count: number }[];
        totalFiltered: { count: number }[];
        rows: MemberData[];
      }>([
        {
          $facet: {
            total: [{ $count: "count" }],
            admin: [{ $match: { role: { $in: ["SUPER_ADMIN", "ADMIN"] } } }, { $count: "count" }],
            active: [{ $match: { status: { $in: ["ACTIVE", "VERIFIED"] } } }, { $count: "count" }],
            totalFiltered: [{ $match: filter }, { $count: "count" }],
            rows: [
              { $match: filter },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  passwordHash: 0,
                  salt: 0,
                },
              },
            ],
          },
        },
      ])
      .maxTimeMS(8000)
      .toArray(),
  ]);

  const totalMembers = memberFacetRaw?.total?.[0]?.count || 0;
  const adminCount = memberFacetRaw?.admin?.[0]?.count || 0;
  const activeCount = memberFacetRaw?.active?.[0]?.count || 0;
  const totalFiltered = memberFacetRaw?.totalFiltered?.[0]?.count || 0;
  const rawDocs = memberFacetRaw?.rows || [];
  const totalApplicationsSubmitted = totalAppsCountRaw[0]?.total || 0;
  const pageMemberIds = rawDocs.map((d) => d.id).filter(Boolean);

  // Scoped fetch for current page members
  const [pageApps, pageDists] = await Promise.all([
    pageMemberIds.length > 0
      ? appCollection
          .find(
            { $or: [{ memberId: { $in: pageMemberIds } }, { "contributors.memberId": { $in: pageMemberIds } }] },
            { projection: { ipoId: 1, memberId: 1, contributors: 1, totalContribution: 1, numberOfPanCards: 1, panNumbers: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
    pageMemberIds.length > 0
      ? distCollection
          .find(
            { "memberPayouts.memberId": { $in: pageMemberIds } },
            { projection: { memberPayouts: 1 } }
          )
          .toArray()
      : Promise.resolve([]),
  ]);

  const memberParticipation = new Map<string, { ipoIds: Set<string>; appCount: number; totalContributed: number }>();

  pageApps.forEach((app) => {
    const panCount = app.numberOfPanCards || (Array.isArray(app.panNumbers) && app.panNumbers.length > 0 ? app.panNumbers.length : 1);

    if (app.contributors && app.contributors.length > 0) {
      app.contributors.forEach((c) => {
        const memId = c.memberId;
        if (pageMemberIds.includes(memId)) {
          const entry = memberParticipation.get(memId) || { ipoIds: new Set(), appCount: 0, totalContributed: 0 };
          entry.ipoIds.add(app.ipoId);
          entry.appCount += 1;
          entry.totalContributed += c.amount;
          memberParticipation.set(memId, entry);
        }
      });
    } else if (app.memberId) {
      const memId = app.memberId;
      const entry = memberParticipation.get(memId) || { ipoIds: new Set(), appCount: 0, totalContributed: 0 };
      entry.ipoIds.add(app.ipoId);
      entry.appCount += panCount;
      entry.totalContributed += app.totalContribution || 0;
      memberParticipation.set(memId, entry);
    }
  });

  const memberProfits = new Map<string, number>();
  pageDists.forEach((d) => {
    if (d.memberPayouts && Array.isArray(d.memberPayouts)) {
      d.memberPayouts.forEach((p: { memberId: string; profit: number }) => {
        if (p.memberId && pageMemberIds.includes(p.memberId)) {
          memberProfits.set(p.memberId, (memberProfits.get(p.memberId) || 0) + (p.profit || 0));
        }
      });
    }
  });

  const verifiedPercentage = totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 100;
  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const metrics: MemberRosterMetrics = {
    totalMembers,
    adminCount,
    totalApplicationsSubmitted,
    verifiedPercentage,
  };

  const members: MemberData[] = rawDocs.map((doc) => {
    const part = memberParticipation.get(doc.id);
    const iposAppliedCount = part ? part.ipoIds.size : 0;
    const totalContributed = part ? part.totalContributed : 0;
    const totalProfitEarned = memberProfits.get(doc.id) || 0;

    return {
      _id: doc._id?.toString(),
      id: doc.id,
      name: doc.name || doc.username,
      username: doc.username || doc.name,
      email: doc.email,
      phone: doc.phone,
      avatar: doc.avatar,
      role: doc.role || "MEMBER",
      status: doc.status || "ACTIVE",
      panMasked: doc.panMasked || doc.panFull ? maskPan(doc.panFull || doc.panMasked) : undefined,
      panFull: doc.panFull,
      defaultContribution: doc.defaultContribution,
      bankName: doc.bankName,
      accountNumber: doc.accountNumber,
      ifscCode: doc.ifscCode,
      upiId: doc.upiId,
      address: doc.address,
      city: doc.city,
      state: doc.state,
      pincode: doc.pincode,
      notes: doc.notes,
      joinedAt: doc.joinedAt || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : undefined),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastPasswordResetAt: doc.lastPasswordResetAt,
      permissions: doc.permissions,
      iposAppliedCount,
      totalContributed,
      totalProfitEarned,
    };
  });

  return {
    members,
    total: totalFiltered,
    page: currentPage,
    totalPages,
    metrics,
    currentUserUsername,
  };
}

export async function checkPanAvailability(
  pan: string,
  excludeMemberId?: string
): Promise<{ available: boolean; message?: string }> {
  const db = await getDatabase();
  if (!db) return { available: true };

  const clean = pan.trim().toUpperCase();
  if (!clean) return { available: true };
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
    return {
      available: false,
      message: "Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).",
    };
  }

  const filter: Filter<MemberData> = { panFull: clean };
  if (excludeMemberId) {
    filter.id = { $ne: excludeMemberId };
  }

  const existing = await db.collection<MemberData>("members").findOne(filter);
  if (existing) {
    return {
      available: false,
      message: `PAN is already registered to @${existing.username} (${existing.name}).`,
    };
  }

  return { available: true };
}

export async function createMember(
  input: CreateMemberInput
): Promise<{ success: boolean; error?: string; member?: MemberData }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const username = sanitizeUsername(input.username);
    if (!username) {
      return { success: false, error: "Username is required." };
    }
    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      return {
        success: false,
        error: "Username must be 3-30 characters (letters, numbers, _, -, .).",
      };
    }

    const avail = await checkUsernameAvailability(username);
    if (!avail.available) {
      return { success: false, error: avail.message || "Username is already taken." };
    }

    // PAN Validation and Uniqueness Check
    let panClean: string | undefined;
    let panMasked: string | undefined;
    if (input.panFull && input.panFull.trim()) {
      panClean = input.panFull.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panClean)) {
        return {
          success: false,
          error: "Invalid PAN Card format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).",
        };
      }
      const existingPan = await db.collection<MemberData>("members").findOne({ panFull: panClean });
      if (existingPan) {
        return {
          success: false,
          error: `PAN Card is already registered to member @${existingPan.username} (${existingPan.name}).`,
        };
      }
      panMasked = maskPan(panClean);
    }

    // Email validation
    let emailClean: string | undefined;
    if (input.email && input.email.trim()) {
      emailClean = input.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
        return { success: false, error: "Please provide a valid email address." };
      }
    }

    const name = input.name?.trim() || username;
    const nowIso = new Date().toISOString();
    const memberId = generateEntityId("mem");
    const cleanPass = input.password?.trim() || `${username}@${Math.floor(1000 + Math.random() * 9000)}`;
    const phoneClean = input.phone?.trim() || undefined;
    const emailFinal = emailClean || `${username}@nexo.private`;

    const { hash, salt, combined } = hashPassword(cleanPass);

    const newMemberDoc: any = {
      id: memberId,
      name,
      displayName: name,
      username,
      password: cleanPass,
      email: emailFinal,
      phone: phoneClean,
      phoneNormalized: phoneClean ? phoneClean.replace(/[\s-]/g, "") : undefined,
      avatar: input.avatar?.trim() || undefined,
      role: input.role || "MEMBER",
      status: input.status || "ACTIVE",
      panFull: panClean,
      panMasked,
      panNormalized: panClean,
      defaultContribution: input.defaultContribution ? Number(input.defaultContribution) : undefined,
      bankName: input.bankName?.trim() || undefined,
      accountNumber: input.accountNumber?.trim() || undefined,
      ifscCode: input.ifscCode?.trim().toUpperCase() || undefined,
      upiId: input.upiId?.trim() || undefined,
      address: input.address?.trim() || undefined,
      city: input.city?.trim() || undefined,
      state: input.state?.trim() || undefined,
      pincode: input.pincode?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      permissions: input.permissions || {
        canSubmitApplications: true,
        canDistributeProfit: false,
        canEditIpos: false,
        canAccessAdminConsole: false,
        canManageMembers: false,
      },
      passwordHash: combined,
      salt,
      joinedAt: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Insert into canonical members collection
    await db.collection("members").insertOne(newMemberDoc);

    // 2. Insert into canonical users collection for cross-website authentication
    const userDoc: any = {
      id: `usr_${Date.now()}`,
      memberId,
      username,
      name,
      email: emailFinal,
      emailNormalized: emailFinal.toLowerCase(),
      phone: phoneClean,
      phoneNormalized: phoneClean ? phoneClean.replace(/[\s-]/g, "") : undefined,
      password: cleanPass,
      passwordHash: combined,
      role: input.role || "MEMBER",
      status: input.status || "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.collection("users").insertOne(userDoc);

    // Authoritative audit log
    await logAuditEvent({
      eventType: "MEMBER_CREATED",
      category: "MEMBERS",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "MEMBER",
      targetId: memberId,
      targetName: `@${username} (${name})`,
      metadata: {
        username,
        name,
        role: newMemberDoc.role,
        status: newMemberDoc.status,
        hasPan: Boolean(panClean),
      },
    });

    revalidatePath("/ad/members");
    return {
      success: true,
      member: JSON.parse(JSON.stringify({ ...newMemberDoc, passwordHash: undefined, salt: undefined, _id: undefined })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create member.";
    return { success: false, error: msg };
  }
}

export async function updateMember(
  memberId: string,
  input: UpdateMemberInput
): Promise<{ success: boolean; error?: string; member?: MemberData }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const existingMember = await db.collection<MemberData>("members").findOne({ id: memberId });
    if (!existingMember) {
      return { success: false, error: "Member not found." };
    }

    // Optimistic Concurrency Control
    if (
      input.lastKnownUpdatedAt &&
      existingMember.updatedAt &&
      new Date(existingMember.updatedAt).getTime() > new Date(input.lastKnownUpdatedAt).getTime() + 1000
    ) {
      return {
        success: false,
        error: "This member was recently modified by another administrator. Please refresh the record before saving your changes.",
      };
    }

    const updates: Partial<MemberData> = {
      updatedAt: new Date().toISOString(),
    };

    const oldUsername = existingMember.username;
    let newUsername = existingMember.username;

    if (input.username !== undefined) {
      const sanitized = sanitizeUsername(input.username);
      if (!sanitized) {
        return { success: false, error: "Username cannot be empty." };
      }
      if (!/^[a-z0-9_.-]{3,30}$/.test(sanitized)) {
        return {
          success: false,
          error: "Username must be 3-30 characters (letters, numbers, _, -, .).",
        };
      }
      if (sanitized !== oldUsername) {
        const avail = await checkUsernameAvailability(sanitized, memberId);
        if (!avail.available) {
          return { success: false, error: avail.message || "Username is already taken." };
        }
        updates.username = sanitized;
        newUsername = sanitized;
      }
    }

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.email !== undefined) updates.email = input.email.trim() || undefined;
    if (input.phone !== undefined) updates.phone = input.phone.trim() || undefined;
    if (input.avatar !== undefined) updates.avatar = input.avatar.trim() || undefined;
    if (input.role !== undefined) updates.role = input.role;
    if (input.status !== undefined) updates.status = input.status;
    if (input.defaultContribution !== undefined) {
      updates.defaultContribution = input.defaultContribution ? Number(input.defaultContribution) : undefined;
    }
    if (input.panFull !== undefined) {
      const panClean = input.panFull.trim().toUpperCase();
      updates.panFull = panClean || undefined;
      updates.panMasked = panClean ? maskPan(panClean) : undefined;
    }
    if (input.bankName !== undefined) updates.bankName = input.bankName.trim() || undefined;
    if (input.accountNumber !== undefined) updates.accountNumber = input.accountNumber.trim() || undefined;
    if (input.ifscCode !== undefined) updates.ifscCode = input.ifscCode.trim().toUpperCase() || undefined;
    if (input.upiId !== undefined) updates.upiId = input.upiId.trim() || undefined;
    if (input.address !== undefined) updates.address = input.address.trim() || undefined;
    if (input.city !== undefined) updates.city = input.city.trim() || undefined;
    if (input.state !== undefined) updates.state = input.state.trim() || undefined;
    if (input.pincode !== undefined) updates.pincode = input.pincode.trim() || undefined;
    if (input.notes !== undefined) updates.notes = input.notes.trim() || undefined;
    if (input.permissions !== undefined) updates.permissions = input.permissions;

    await db.collection("members").updateOne(
      { id: memberId },
      { $set: updates }
    );

    // Propagate username/name changes to applications safely
    const displayName = updates.name || existingMember.name;
    if (newUsername !== oldUsername || (updates.name && updates.name !== existingMember.name)) {
      const newFormattedUser = `@${newUsername}`;

      await Promise.all([
        // Update applications where user is primary member
        db.collection("applications").updateMany(
          { memberId },
          {
            $set: {
              applicantName: newFormattedUser,
              updatedAt: new Date().toISOString(),
            },
          }
        ),
        // Update applications where user is a contributor
        db.collection("applications").updateMany(
          { "contributors.memberId": memberId },
          {
            $set: {
              "contributors.$[elem].memberName": newFormattedUser,
              updatedAt: new Date().toISOString(),
            },
          },
          {
            arrayFilters: [{ "elem.memberId": memberId }],
          }
        ),
      ]);
    }

    // Synchronize updates with users collection
    const userUpdates: any = { updatedAt: new Date().toISOString() };
    if (updates.name) userUpdates.name = updates.name;
    if (newUsername) userUpdates.username = newUsername;
    if (updates.email) {
      userUpdates.email = updates.email;
      userUpdates.emailNormalized = updates.email.toLowerCase();
    }
    if (updates.status) userUpdates.status = updates.status;
    if (updates.role) userUpdates.role = updates.role;
    if (updates.phone) {
      userUpdates.phone = updates.phone;
      userUpdates.phoneNormalized = updates.phone.replace(/[\s-]/g, "");
    }
    await db.collection("users").updateOne({ memberId }, { $set: userUpdates });

    // Authoritative audit log
    await logAuditEvent({
      eventType: "MEMBER_UPDATED",
      category: "MEMBERS",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "MEMBER",
      targetId: memberId,
      targetName: `@${newUsername} (${displayName})`,
      metadata: {
        oldUsername,
        newUsername,
        updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
      },
    });

    revalidatePath("/ad/members");
    revalidatePath(`/ad/members/${memberId}`);
    revalidatePath("/ad/applications");
    revalidatePath("/ad/profit");

    const updatedDoc = await db.collection<MemberData>("members").findOne({ id: memberId });
    return {
      success: true,
      member: updatedDoc ? JSON.parse(JSON.stringify({ ...updatedDoc, _id: undefined })) : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update member.";
    return { success: false, error: msg };
  }
}

export async function resetMemberPassword(
  memberId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const member = await db.collection<MemberData>("members").findOne({ id: memberId });
    if (!member) {
      return { success: false, error: "Member not found." };
    }

    const cleanPass = newPassword.trim();
    const { hash, salt, combined } = hashPassword(cleanPass);
    const nowIso = new Date().toISOString();

    await Promise.all([
      db.collection("members").updateOne(
        { id: memberId },
        {
          $set: {
            password: cleanPass,
            passwordHash: combined,
            salt,
            lastPasswordResetAt: nowIso,
            updatedAt: nowIso,
          },
        }
      ),
      db.collection("users").updateOne(
        { memberId },
        {
          $set: {
            password: cleanPass,
            passwordHash: combined,
            updatedAt: nowIso,
          },
        }
      ),
    ]);

    // Audit log (NEVER store password)
    await logAuditEvent({
      eventType: "MEMBER_PASSWORD_RESET",
      category: "SECURITY",
      severity: "WARNING",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "MEMBER",
      targetId: memberId,
      targetName: `@${member.username}`,
      metadata: {
        resetAt: nowIso,
      },
    });

    revalidatePath("/ad/members");
    revalidatePath(`/ad/members/${memberId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset password.";
    return { success: false, error: msg };
  }
}

export async function deleteMember(
  memberId: string,
  hardDelete: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const member = await db.collection<MemberData>("members").findOne({ id: memberId });
    if (!member) {
      return { success: false, error: "Member not found." };
    }

    const nowIso = new Date().toISOString();

    if (hardDelete) {
      await Promise.all([
        db.collection("members").deleteOne({ id: memberId }),
        db.collection("users").deleteOne({ memberId }),
      ]);
      await logAuditEvent({
        eventType: "MEMBER_DELETED",
        category: "MEMBERS",
        severity: "CRITICAL",
        actorUsername: adminUser,
        actorRole: "SUPER_ADMIN",
        targetType: "MEMBER",
        targetId: memberId,
        targetName: `@${member.username}`,
        metadata: { hardDelete: true, deletedAt: nowIso },
      });
    } else {
      // Soft deletion / deactivate
      await Promise.all([
        db.collection("members").updateOne(
          { id: memberId },
          {
            $set: {
              status: "BLOCKED",
              updatedAt: nowIso,
            },
          }
        ),
        db.collection("users").updateOne(
          { memberId },
          {
            $set: {
              status: "BLOCKED",
              updatedAt: nowIso,
            },
          }
        ),
      ]);
      await logAuditEvent({
        eventType: "MEMBER_DEACTIVATED",
        category: "MEMBERS",
        severity: "WARNING",
        actorUsername: adminUser,
        actorRole: "SUPER_ADMIN",
        targetType: "MEMBER",
        targetId: memberId,
        targetName: `@${member.username}`,
        metadata: { status: "BLOCKED", deactivatedAt: nowIso },
      });
    }

    revalidatePath("/ad/members");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete member.";
    return { success: false, error: msg };
  }
}

export async function getMemberPerformanceRecords(): Promise<MemberPerformanceCategory[]> {
  const db = await getDatabase();
  if (!db) return [];

  const [membersRaw, appsRaw, distsRaw] = await Promise.all([
    db.collection("members").find({}, { projection: { id: 1, name: 1, username: 1, avatar: 1 } }).toArray(),
    db.collection("applications").find({}, {
      projection: {
        id: 1,
        ipoId: 1,
        ipoName: 1,
        memberId: 1,
        applicantName: 1,
        numberOfPanCards: 1,
        panNumbers: 1,
        totalContribution: 1,
        contributors: 1,
        status: 1,
        allotmentStatus: 1,
        allottedIndices: 1,
      },
    }).toArray(),
    db.collection("profit_distributions").find({}, { projection: { memberPayouts: 1 } }).toArray(),
  ]);

  const memberMap = new Map<string, { id: string; name: string; username: string; avatar?: string }>();
  membersRaw.forEach((m) => {
    if (m.id) {
      memberMap.set(m.id, {
        id: m.id,
        name: m.name || m.username || "Member",
        username: m.username || m.name || "user",
        avatar: m.avatar,
      });
    }
  });

  const profitMap = new Map<string, number>();
  distsRaw.forEach((dist) => {
    (dist.memberPayouts || []).forEach((p: { memberId: string; profit: number }) => {
      if (p.memberId) {
        const cur = profitMap.get(p.memberId) || 0;
        profitMap.set(p.memberId, cur + (p.profit || 0));
      }
    });
  });

  const capitalMap = new Map<string, number>();
  const totalAppliedLotsMap = new Map<string, number>();
  const ipoAppliedLotsMap = new Map<string, Map<string, { ipoName: string; lots: number }>>();
  const allottedLotsMap = new Map<string, number>();

  appsRaw.forEach((app) => {
    const panCount =
      app.numberOfPanCards ||
      (Array.isArray(app.panNumbers) && app.panNumbers.length > 0 ? app.panNumbers.length : 1);
    const isSolo = !app.contributors || app.contributors.length === 0;

    let allottedCount = 0;
    if (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) {
      allottedCount = app.allottedIndices.length;
    } else if (app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED") {
      allottedCount = panCount;
    }

    if (isSolo) {
      if (app.memberId) {
        capitalMap.set(app.memberId, (capitalMap.get(app.memberId) || 0) + (app.totalContribution || 0));
        totalAppliedLotsMap.set(app.memberId, (totalAppliedLotsMap.get(app.memberId) || 0) + panCount);

        const memberIpos = ipoAppliedLotsMap.get(app.memberId) || new Map();
        const curIpoLots = memberIpos.get(app.ipoId) || { ipoName: app.ipoName || "IPO", lots: 0 };
        curIpoLots.lots += panCount;
        if (app.ipoName) curIpoLots.ipoName = app.ipoName;
        memberIpos.set(app.ipoId, curIpoLots);
        ipoAppliedLotsMap.set(app.memberId, memberIpos);

        if (allottedCount > 0) {
          allottedLotsMap.set(app.memberId, (allottedLotsMap.get(app.memberId) || 0) + allottedCount);
        }
      }
    } else {
      const totalAmount =
        app.contributors.reduce((sum: number, c: { amount?: number }) => sum + (c.amount || 0), 0) || app.totalContribution || 1;
      app.contributors.forEach((c: { memberId?: string; amount?: number }) => {
        if (c.memberId) {
          const contribAmount = c.amount || 0;
          const shareRatio = totalAmount > 0 ? contribAmount / totalAmount : 1 / app.contributors.length;
          const contribLots = panCount * shareRatio;

          capitalMap.set(c.memberId, (capitalMap.get(c.memberId) || 0) + contribAmount);
          totalAppliedLotsMap.set(c.memberId, (totalAppliedLotsMap.get(c.memberId) || 0) + contribLots);

          const memberIpos = ipoAppliedLotsMap.get(c.memberId) || new Map();
          const curIpoLots = memberIpos.get(app.ipoId) || { ipoName: app.ipoName || "IPO", lots: 0 };
          curIpoLots.lots += contribLots;
          if (app.ipoName) curIpoLots.ipoName = app.ipoName;
          memberIpos.set(app.ipoId, curIpoLots);
          ipoAppliedLotsMap.set(c.memberId, memberIpos);

          if (allottedCount > 0) {
            allottedLotsMap.set(c.memberId, (allottedLotsMap.get(c.memberId) || 0) + allottedCount * shareRatio);
          }
        }
      });
    }
  });

  function computeStandardCompetitionRanking(
    rawEntries: { memberId: string; value: number; context?: string }[],
    formatFn: (val: number, entry: { memberId: string; value: number; context?: string }) => string
  ): MemberLeaderboardRow[] {
    const sorted = [...rawEntries]
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value);

    const ranked: MemberLeaderboardRow[] = [];
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      if (i > 0) {
        if (Math.abs(entry.value - sorted[i - 1].value) > 0.0001) {
          currentRank = i + 1;
        }
      }

      if (currentRank > 5) break;

      const member = memberMap.get(entry.memberId);
      if (member) {
        ranked.push({
          rank: currentRank,
          member,
          rawValue: entry.value,
          valueDisplay: formatFn(entry.value, entry),
          context: entry.context,
        });
      }
    }

    return ranked;
  }

  // 1. Highest Profit
  const profitEntries = Array.from(profitMap.entries()).map(([memberId, value]) => ({ memberId, value }));
  const profitRows = computeStandardCompetitionRanking(profitEntries, (val) => `₹${Math.round(val).toLocaleString("en-IN")}`);

  // 2. Highest Capital Investment
  const capitalEntries = Array.from(capitalMap.entries()).map(([memberId, value]) => ({ memberId, value }));
  const capitalRows = computeStandardCompetitionRanking(capitalEntries, (val) => `₹${Math.round(val).toLocaleString("en-IN")}`);

  // 3. Highest Total Applied Lots
  const appliedEntries = Array.from(totalAppliedLotsMap.entries()).map(([memberId, value]) => ({ memberId, value }));
  const appliedRows = computeStandardCompetitionRanking(appliedEntries, (val) => `${Math.round(val)} Lots`);

  // 4. Highest Lots Applied in a Single IPO
  const singleIpoEntriesMap = new Map<string, { memberId: string; value: number; context?: string }>();
  ipoAppliedLotsMap.forEach((ipos, memberId) => {
    let maxLots = 0;
    let maxIpoName = "";
    ipos.forEach((d) => {
      if (d.lots > maxLots) {
        maxLots = d.lots;
        maxIpoName = d.ipoName;
      }
    });
    if (maxLots > 0) {
      singleIpoEntriesMap.set(memberId, { memberId, value: maxLots, context: maxIpoName });
    }
  });
  const singleIpoEntries = Array.from(singleIpoEntriesMap.values());
  const singleIpoRows = computeStandardCompetitionRanking(singleIpoEntries, (val) => `${Math.round(val)} Lots`);

  // 5. Highest Total Allotted Lots
  const allottedEntries = Array.from(allottedLotsMap.entries()).map(([memberId, value]) => ({ memberId, value }));
  const allottedRows = computeStandardCompetitionRanking(allottedEntries, (val) => `${Math.round(val)} ${Math.round(val) === 1 ? "Lot" : "Lots"}`);

  // 6. Highest Allotment / Applied Lot Percentage
  const rateEntries: { memberId: string; value: number; context?: string }[] = [];
  totalAppliedLotsMap.forEach((applied, memberId) => {
    if (applied >= 1) {
      const allotted = allottedLotsMap.get(memberId) || 0;
      if (allotted > 0) {
        const rate = (allotted / applied) * 100;
        rateEntries.push({
          memberId,
          value: rate,
          context: `${allotted.toFixed(1)} / ${applied.toFixed(1)} lots`,
        });
      }
    }
  });
  const rateRows = computeStandardCompetitionRanking(rateEntries, (val) => `${val.toFixed(1)}%`);

  // 7. Most Offerings Joined
  const offeringEntries: { memberId: string; value: number }[] = [];
  ipoAppliedLotsMap.forEach((ipos, memberId) => {
    if (ipos.size > 0) {
      offeringEntries.push({ memberId, value: ipos.size });
    }
  });
  const offeringsRows = computeStandardCompetitionRanking(offeringEntries, (val) => `${val} IPOs`);

  const categories: MemberPerformanceCategory[] = [
    {
      id: "highest_profit",
      metricId: "highest_profit",
      badgeLabel: "HIGHEST PROFIT",
      title: "Highest Profit",
      subtitle: "Lifetime distributed earnings from Nexo payouts",
      accentColor: "emerald",
      rows: profitRows,
      isEmpty: profitRows.length === 0,
    },
    {
      id: "highest_capital",
      metricId: "highest_capital",
      badgeLabel: "HIGHEST CAPITAL",
      title: "Capital Investment",
      subtitle: "Total pooled funds across solo & split applications",
      accentColor: "sky",
      rows: capitalRows,
      isEmpty: capitalRows.length === 0,
    },
    {
      id: "most_applied_lots",
      metricId: "most_applied_lots",
      badgeLabel: "MOST APPLIED LOTS",
      title: "Total Applied Lots",
      subtitle: "Cumulative lots submitted across all offerings",
      accentColor: "indigo",
      rows: appliedRows,
      isEmpty: appliedRows.length === 0,
    },
    {
      id: "highest_single_ipo",
      metricId: "highest_single_ipo",
      badgeLabel: "SINGLE IPO RECORD",
      title: "Single IPO Max Lots",
      subtitle: "Highest lot count applied for in a single offering",
      accentColor: "purple",
      rows: singleIpoRows,
      isEmpty: singleIpoRows.length === 0,
    },
    {
      id: "most_allotted_lots",
      metricId: "most_allotted_lots",
      badgeLabel: "MOST ALLOTTED LOTS",
      title: "Total Allotted Lots",
      subtitle: "Successfully confirmed lot allocations",
      accentColor: "amber",
      rows: allottedRows,
      isEmpty: allottedRows.length === 0,
    },
    {
      id: "highest_allotment_rate",
      metricId: "highest_allotment_rate",
      badgeLabel: "ALLOTMENT RATE",
      title: "Allotment Rate %",
      subtitle: "Allotted lots ÷ applied lots (min. 1 lot)",
      accentColor: "teal",
      rows: rateRows,
      isEmpty: rateRows.length === 0,
    },
    {
      id: "most_offerings",
      metricId: "most_offerings",
      badgeLabel: "SYNDICATE PARTICIPATION",
      title: "Most IPOs Joined",
      subtitle: "Distinct IPO syndicates participated in",
      accentColor: "rose",
      rows: offeringsRows,
      isEmpty: offeringsRows.length === 0,
    },
  ];

  return categories;
}

export interface MemberPanRecord {
  pan: string;
  panMasked: string;
  sourceApplicationId?: string;
  sourceIpoName?: string;
  contribution?: number;
  status?: string;
  appliedDate?: string;
}

export interface MemberActivityItem {
  id: string;
  eventType: string;
  category: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  subtitle?: string;
  actorUsername?: string;
  timestamp: string;
}

export interface MemberDetailResponse {
  member: MemberData;
  applications: ApplicationRecord[];
  payouts: Array<{
    ipoId: string;
    ipoName?: string;
    contribution: number;
    lots: number;
    profit: number;
    publishedAt?: string;
  }>;
  soloApplicationsCount: number;
  combinedApplicationsCount: number;
  totalCapitalDeployed: number;
  panRecords: MemberPanRecord[];
  activityTimeline: MemberActivityItem[];
}

export async function getMemberDetail(
  id: string
): Promise<MemberDetailResponse | null> {
  const db = await getDatabase();
  if (!db || !id) return null;

  const memberDoc = await db.collection("members").findOne({
    $or: [{ id }, { username: id }],
  });
  if (!memberDoc) return null;

  const memberId = memberDoc.id;

  // Fetch applications, distributions, IPOs, and audit activities in parallel
  const [apps, distDocs, ipoDocs, rawActivities] = await Promise.all([
    db
      .collection<ApplicationRecord>("applications")
      .find(
        {
          $or: [
            { memberId },
            { applicantName: `@${memberDoc.username}` },
            { applicantName: memberDoc.name },
            { "contributors.memberId": memberId },
          ],
        },
        {
          projection: {
            _id: 0,
            id: 1,
            ipoId: 1,
            ipoName: 1,
            memberId: 1,
            applicantName: 1,
            panNumbers: 1,
            numberOfPanCards: 1,
            totalContribution: 1,
            fundingStructure: 1,
            contributors: 1,
            status: 1,
            allotmentStatus: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection("profit_distributions")
      .find(
        { "memberPayouts.memberId": memberId },
        { projection: { _id: 0, ipoId: 1, memberPayouts: 1, publishedAt: 1, createdAt: 1 } }
      )
      .toArray(),
    db.collection("ipos").find({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray(),
    db
      .collection("activities")
      .find({
        $or: [
          { targetId: memberId },
          { targetName: { $regex: memberDoc.username, $options: "i" } },
          { memberName: memberDoc.username },
          { "metadata.username": memberDoc.username },
          { "metadata.targetId": memberId },
        ],
      })
      .sort({ createdAt: -1, timestamp: -1, _id: -1 })
      .limit(50)
      .toArray(),
  ]);

  const ipoNameMap = new Map<string, string>();
  ipoDocs.forEach((i) => ipoNameMap.set(i.id, i.name));

  const applications: ApplicationRecord[] = apps.map((a) => ({
    ...a,
    _id: a._id?.toString(),
  }));

  const payouts: MemberDetailResponse["payouts"] = [];

  for (const dist of distDocs) {
    if (dist.memberPayouts && Array.isArray(dist.memberPayouts)) {
      const userPayout = dist.memberPayouts.find(
        (p: { memberId: string }) => p.memberId === memberId
      );
      if (userPayout) {
        payouts.push({
          ipoId: dist.ipoId,
          ipoName: ipoNameMap.get(dist.ipoId) || dist.ipoId,
          contribution: userPayout.contribution,
          lots: userPayout.lots,
          profit: userPayout.profit,
          publishedAt: dist.publishedAt || dist.createdAt,
        });
      }
    }
  }

  // Calculate Solo vs Combined application breakdown and member's actual deployed capital
  let soloApplicationsCount = 0;
  let combinedApplicationsCount = 0;
  let totalCapitalDeployed = 0;

  const panMap = new Map<string, MemberPanRecord>();

  // Registered PAN if available
  if (memberDoc.panFull || memberDoc.panMasked) {
    const regPan = (memberDoc.panFull || memberDoc.panMasked) as string;
    panMap.set(regPan.toUpperCase(), {
      pan: regPan.toUpperCase(),
      panMasked: maskPan(regPan) || regPan,
      sourceIpoName: "Primary KYC Record",
      status: "VERIFIED",
      appliedDate: memberDoc.createdAt || memberDoc.joinedAt,
    });
  }

  applications.forEach((app) => {
    const isCombined = Boolean(app.contributors && app.contributors.length > 0);
    if (isCombined) {
      combinedApplicationsCount += 1;
      const userContrib = app.contributors?.find((c) => c.memberId === memberId);
      totalCapitalDeployed += (userContrib?.amount || 0);
    } else {
      soloApplicationsCount += 1;
      totalCapitalDeployed += (app.totalContribution || 0);
    }

    // Extract PAN records used in applications
    if (Array.isArray(app.panNumbers) && app.panNumbers.length > 0) {
      app.panNumbers.forEach((p) => {
        if (p && p.trim()) {
          const upperPan = p.trim().toUpperCase();
          if (!panMap.has(upperPan)) {
            panMap.set(upperPan, {
              pan: upperPan,
              panMasked: maskPan(upperPan) || upperPan,
              sourceApplicationId: app.id,
              sourceIpoName: app.ipoName,
              contribution: app.totalContribution,
              status: app.status,
              appliedDate: app.createdAt,
            });
          }
        }
      });
    }
  });

  const panRecords = Array.from(panMap.values());

  // Format activity timeline
  const activityTimeline: MemberActivityItem[] = rawActivities.map((act) => ({
    id: act._id?.toString() || act.id || "act_unknown",
    eventType: act.eventType || act.type || "ACTIVITY",
    category: act.category || "MEMBERS",
    severity: act.severity || "INFO",
    title: act.title || act.targetName || act.eventType?.replace(/_/g, " ") || "Member Activity",
    subtitle: act.subtitle || (act.metadata ? JSON.stringify(act.metadata) : undefined),
    actorUsername: act.actorUsername || act.actorName || "Admin",
    timestamp: act.createdAt || act.timestamp || new Date().toISOString(),
  }));

  // If no activity events exist yet in DB, synthesize creation event
  if (activityTimeline.length === 0 && memberDoc.createdAt) {
    activityTimeline.push({
      id: "act_init",
      eventType: "ACCOUNT_CREATED",
      category: "MEMBERS",
      severity: "INFO",
      title: "Account Registered",
      subtitle: `Member profile @${memberDoc.username} registered with the syndicate.`,
      actorUsername: "System",
      timestamp: memberDoc.createdAt,
    });
  }

  const member: MemberData = {
    _id: memberDoc._id?.toString(),
    id: memberDoc.id,
    name: memberDoc.name || memberDoc.username,
    username: memberDoc.username || memberDoc.name,
    email: memberDoc.email,
    phone: memberDoc.phone,
    avatar: memberDoc.avatar,
    role: memberDoc.role || "MEMBER",
    status: memberDoc.status || "ACTIVE",
    panMasked: memberDoc.panMasked || (memberDoc.panFull ? maskPan(memberDoc.panFull) : undefined),
    panFull: memberDoc.panFull,
    defaultContribution: memberDoc.defaultContribution,
    bankName: memberDoc.bankName,
    accountNumber: memberDoc.accountNumber,
    ifscCode: memberDoc.ifscCode,
    upiId: memberDoc.upiId,
    address: memberDoc.address,
    city: memberDoc.city,
    state: memberDoc.state,
    pincode: memberDoc.pincode,
    notes: memberDoc.notes,
    joinedAt: memberDoc.joinedAt,
    createdAt: memberDoc.createdAt,
    updatedAt: memberDoc.updatedAt,
    lastPasswordResetAt: memberDoc.lastPasswordResetAt,
    permissions: memberDoc.permissions,
    iposAppliedCount: new Set(applications.map((a) => a.ipoId)).size,
    totalContributed: totalCapitalDeployed,
    totalProfitEarned: payouts.reduce((acc, p) => acc + (p.profit || 0), 0),
  };

  return {
    member,
    applications,
    payouts,
    soloApplicationsCount,
    combinedApplicationsCount,
    totalCapitalDeployed,
    panRecords,
    activityTimeline,
  };
}

export async function updateMemberStatus(
  memberId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const nowIso = new Date().toISOString();
    await db.collection("members").updateOne(
      { id: memberId },
      {
        $set: {
          status: newStatus,
          updatedAt: nowIso,
        },
      }
    );

    await logAuditEvent({
      eventType: "MEMBER_STATUS_CHANGED",
      category: "MEMBERS",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "MEMBER",
      targetId: memberId,
      targetName: `Status changed to ${newStatus}`,
      metadata: { newStatus, changedAt: nowIso },
    });

    revalidatePath("/ad/members");
    revalidatePath(`/ad/members/${memberId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update member status.";
    return { success: false, error: msg };
  }
}

export async function bulkUpdateMemberStatus(
  memberIds: string[],
  newStatus: string
): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
  try {
    if (!memberIds || memberIds.length === 0) {
      return { success: false, error: "No members selected." };
    }

    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const nowIso = new Date().toISOString();
    const result = await db.collection("members").updateMany(
      { id: { $in: memberIds } },
      {
        $set: {
          status: newStatus,
          updatedAt: nowIso,
        },
      }
    );

    await logAuditEvent({
      eventType: "BULK_MEMBER_STATUS_CHANGED",
      category: "MEMBERS",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "MEMBER",
      targetId: `bulk_${memberIds.length}`,
      targetName: `Bulk status update to ${newStatus} (${result.modifiedCount} members)`,
      metadata: {
        memberIds,
        newStatus,
        modifiedCount: result.modifiedCount,
        changedAt: nowIso,
      },
    });

    revalidatePath("/ad/members");
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to bulk update member status.";
    return { success: false, error: msg };
  }
}

export async function bulkDeleteMembers(
  memberIds: string[]
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    if (!memberIds || memberIds.length === 0) {
      return { success: false, error: "No members selected." };
    }

    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const result = await db.collection("members").deleteMany({
      id: { $in: memberIds },
    });

    await logAuditEvent({
      eventType: "BULK_MEMBERS_DELETED",
      category: "MEMBERS",
      severity: "WARN",
      actorUsername: adminUser,
      actorRole: "SUPER_ADMIN",
      targetType: "MEMBER",
      targetId: `bulk_${memberIds.length}`,
      targetName: `Bulk deleted ${result.deletedCount} members`,
      metadata: {
        memberIds,
        deletedCount: result.deletedCount,
      },
    });

    revalidatePath("/ad/members");
    return { success: true, deletedCount: result.deletedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to bulk delete members.";
    return { success: false, error: msg };
  }
}


"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import {
  ApplicationRecord,
  ApplicationMetricsSummary,
  MemberRecord,
  ApplicationContributor,
} from "@/types/application";
import { NexoIPORecord } from "@/types/ipo";
import { logAuditEvent } from "@/lib/audit/actions";
import { isValidPan, formatCombinedApplicants, generateEntityId } from "@/lib/utils";
import { Filter } from "mongodb";
import { verifyAdminSession } from "@/lib/auth/session";
import { syncIpoProfitDistribution } from "@/lib/profit/sync";

export interface IpoOption {
  id: string;
  name: string;
  count: number;
}

export interface MemberOption {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  panFull?: string;
  panMasked?: string;
  defaultContribution?: number;
  role?: string;
  status?: string;
}

export interface IpoSelectOption {
  id: string;
  name: string;
  status: string;
  category?: string;
  minInvestment?: number;
  lotSize?: number;
}

export interface GetApplicationsParams {
  query?: string;
  ipoId?: string;
  memberId?: string;
  status?: string;
  fundingStructure?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetApplicationsResponse {
  applications: ApplicationRecord[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  metrics: ApplicationMetricsSummary;
  availableIpos: IpoOption[];
  availableStatuses: string[];
  selectedIpoId?: string;
  selectedIpoName?: string;
}

import { ApplicationService } from "@/lib/services/application.service";

export async function getApplications(
  params: GetApplicationsParams = {}
): Promise<GetApplicationsResponse> {
  return ApplicationService.getApplications(params);
}

export interface ApplicationDetailResponse {
  application: ApplicationRecord;
  member: MemberRecord | null;
  ipo: NexoIPORecord | null;
}

export async function getApplicationDetail(
  id: string
): Promise<ApplicationDetailResponse | null> {
  const db = await getDatabase();
  if (!db || !id) return null;

  const appDoc = await db.collection<ApplicationRecord>("applications").findOne({ id });
  if (!appDoc) return null;

  const application: ApplicationRecord = {
    ...appDoc,
    _id: appDoc._id?.toString(),
    applicantName: formatCombinedApplicants(appDoc),
  };

  // Fetch linked member and IPO in parallel
  const [memberDoc, ipoDoc] = await Promise.all([
    application.memberId
      ? db.collection<MemberRecord>("members").findOne({ id: application.memberId })
      : Promise.resolve(null),
    application.ipoId
      ? db.collection<NexoIPORecord>("ipos").findOne({ id: application.ipoId })
      : Promise.resolve(null),
  ]);

  const member: MemberRecord | null = memberDoc
    ? { ...memberDoc, _id: memberDoc._id?.toString() }
    : null;

  const ipo: NexoIPORecord | null = ipoDoc
    ? { ...ipoDoc, _id: ipoDoc._id?.toString() }
    : null;

  return {
    application,
    member,
    ipo,
  };
}

/**
 * Fetch member options for select dropdowns
 */
export async function getMembersForSelection(): Promise<MemberOption[]> {
  return ApplicationService.getMembersForSelection();
}

/**
 * Fetch IPO options for select dropdowns
 */
export async function getIposForSelection(): Promise<IpoSelectOption[]> {
  const db = await getDatabase();
  if (!db) return [];

  const docs = await db
    .collection<NexoIPORecord>("ipos")
    .find({}, {
      projection: {
        id: 1,
        name: 1,
        status: 1,
        category: 1,
        metrics: 1,
      },
    })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    category: d.category,
    minInvestment: d.metrics?.minInvestment || 15000,
    lotSize: d.metrics?.lotSize || 1,
  }));
}

export interface SoloApplicationInputRow {
  memberId: string;
  panNumber: string;
  amount?: number;
}

export interface CreateSoloApplicationsInput {
  ipoId: string;
  applications: SoloApplicationInputRow[];
}

export interface CreateSoloApplicationsResult {
  success: boolean;
  error?: string;
  errorsByRow?: Record<number, string>;
  count?: number;
  createdApplications?: ApplicationRecord[];
}

/**
 * Create Multiple Solo Applications in batch
 */
export async function createSoloApplicationsBatch(
  data: CreateSoloApplicationsInput
): Promise<CreateSoloApplicationsResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database connection unavailable." };
    }

    const { ipoId, applications: rows } = data;

    if (!ipoId) {
      return { success: false, error: "Target IPO is required." };
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "At least one application row is required." };
    }

    // 1. Verify Target IPO exists
    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
    if (!ipo) {
      return { success: false, error: `Selected IPO (${ipoId}) was not found in the database.` };
    }

    // 2. Fetch all members referenced in the batch
    const memberIds = Array.from(new Set(rows.map((r) => r.memberId).filter(Boolean)));
    const memberDocs = await db
      .collection("members")
      .find({ id: { $in: memberIds } })
      .toArray();

    const memberMap = new Map<string, (typeof memberDocs)[0]>();
    memberDocs.forEach((m) => memberMap.set(m.id, m));

    // 3. Fetch existing PANs for this IPO from database to detect duplicates
    const existingAppsForIpo = await db
      .collection<ApplicationRecord>("applications")
      .find({ ipoId }, { projection: { panNumbers: 1, applicantName: 1, id: 1 } })
      .toArray();

    const existingPanSet = new Set<string>();
    existingAppsForIpo.forEach((app) => {
      (app.panNumbers || []).forEach((pan) => {
        if (pan) existingPanSet.add(pan.toUpperCase().trim());
      });
    });

    const errorsByRow: Record<number, string> = {};
    const seenPansInBatch = new Set<string>();

    // 4. Validate each row
    rows.forEach((row, index) => {
      if (!row.memberId) {
        errorsByRow[index] = "Applicant User is required.";
        return;
      }

      const member = memberMap.get(row.memberId);
      if (!member) {
        errorsByRow[index] = "Selected user does not exist in the database.";
        return;
      }

      const rawPan = (row.panNumber || "").trim().toUpperCase();
      if (!rawPan) {
        errorsByRow[index] = "PAN card number is required.";
        return;
      }

      if (!isValidPan(rawPan)) {
        errorsByRow[index] = `Invalid PAN format: "${rawPan}". Must be 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).`;
        return;
      }

      if (seenPansInBatch.has(rawPan)) {
        errorsByRow[index] = `Duplicate PAN in batch: "${rawPan}" is entered more than once.`;
        return;
      }
      seenPansInBatch.add(rawPan);

      if (existingPanSet.has(rawPan)) {
        errorsByRow[index] = `PAN "${rawPan}" has already been filed for ${ipo.name}.`;
        return;
      }
    });

    if (Object.keys(errorsByRow).length > 0) {
      return {
        success: false,
        error: `Validation failed for ${Object.keys(errorsByRow).length} application(s). Please review row errors.`,
        errorsByRow,
      };
    }

    // 5. Construct Application Documents
    const defaultAmount = ipo.metrics?.minInvestment || 15000;
    const nowIso = new Date().toISOString();
    const createdDocs: ApplicationRecord[] = rows.map((row, index) => {
      const member = memberMap.get(row.memberId)!;
      const pan = row.panNumber.trim().toUpperCase();
      const rawUser = member.username || member.name;
      const applicantName = rawUser.startsWith("@") ? rawUser : `@${rawUser}`;
      const amount = typeof row.amount === "number" && row.amount > 0 ? row.amount : defaultAmount;

      const appId = generateEntityId(`app_${index}`);

      return {
        id: appId,
        ipoId: ipo.id,
        ipoName: ipo.name,
        memberId: member.id,
        applicantName,
        applicantUsername: member.username || member.name,
        fundingStructure: "SOLO",
        numberOfPanCards: 1,
        panNumbers: [pan],
        totalContribution: amount,
        status: "AWAITING",
        allotmentStatus: "AWAITING",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    // 6. Batch insert into database
    await db.collection<ApplicationRecord>("applications").insertMany(createdDocs);

    // 7. Audit log
    await logAuditEvent({
      eventType: "APPLICATION_SUBMITTED",
      category: "APPLICATION",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "IPO",
      targetId: ipo.id,
      targetName: ipo.name,
      title: `Created ${createdDocs.length} Solo Application(s)`,
      subtitle: `Admin created batch of ${createdDocs.length} application(s) for ${ipo.name}`,
      metadata: {
        count: createdDocs.length,
        ipoId: ipo.id,
        ipoName: ipo.name,
        applicationIds: createdDocs.map((d) => d.id),
      },
    });

    // 8. Synchronize profit distribution & revalidate all dependent routes
    await syncIpoProfitDistribution(ipo.id, db);

    console.info(`[ORBIT][CREATE_SOLO_APPS] Created ${createdDocs.length} solo applications for ${ipo.name} by ${adminUser}`);

    const plainCreatedApplications = createdDocs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return { ...rest, _id: _id ? String(_id) : undefined };
    });

    return {
      success: true,
      count: createdDocs.length,
      createdApplications: plainCreatedApplications,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create solo applications batch.";
    console.error("[ORBIT][CREATE_SOLO_APPS] Error:", message);
    return { success: false, error: message };
  }
}

export interface CreateMultiFriendApplicationInput {
  ipoId: string;
  memberId: string;
  panNumber: string;
  status?: string;
  contributors: {
    memberId: string;
    memberName?: string;
    amount: number;
    pan?: string;
  }[];
}

export async function createMultiFriendApplication(
  data: CreateMultiFriendApplicationInput
): Promise<{
  success: boolean;
  error?: string;
  application?: ApplicationRecord;
}> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection unavailable." };

    const { ipoId, memberId, panNumber, contributors, status = "AWAITING" } = data;

    if (!ipoId) return { success: false, error: "Target IPO is required." };
    if (!memberId) return { success: false, error: "Primary applicant member is required." };
    if (!panNumber || !isValidPan(panNumber)) {
      return { success: false, error: "Valid PAN Card is required for the application." };
    }
    if (!contributors || contributors.length === 0) {
      return { success: false, error: "At least one contributor is required for Multi-Friend filing." };
    }

    const cleanPan = panNumber.trim().toUpperCase();

    // 1. Fetch Target IPO
    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
    if (!ipo) return { success: false, error: `IPO (${ipoId}) not found.` };

    // 2. Fetch Lead Member & Contributors in parallel
    const allMemberIds = Array.from(
      new Set([memberId, ...contributors.map((c) => c.memberId).filter(Boolean)])
    );
    const memberDocs = await db
      .collection<MemberRecord>("members")
      .find({ id: { $in: allMemberIds } })
      .toArray();
    const memberMap = new Map(memberDocs.map((m) => [m.id, m]));

    const leadMember = memberMap.get(memberId);
    if (!leadMember) return { success: false, error: `Primary applicant member not found.` };

    // Check duplicate PAN for this IPO
    const existingPan = await db.collection("applications").findOne({
      ipoId,
      panNumbers: cleanPan,
    });
    if (existingPan) {
      return {
        success: false,
        error: `PAN ${cleanPan} has already been filed for this IPO (${ipo.name}).`,
      };
    }

    const totalContribution = contributors.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    if (totalContribution <= 0) {
      return { success: false, error: "Total pooled contribution must be greater than 0." };
    }

    // Build enriched contributors list with percentage
    const validContributors: ApplicationContributor[] = contributors.map((c) => {
      const m = memberMap.get(c.memberId);
      const name = m ? (m.username ? `@${m.username}` : m.name) : c.memberName || "Contributor";
      const amount = Number(c.amount) || 0;
      const percentage = totalContribution > 0 ? Math.round((amount / totalContribution) * 100) : 0;
      return {
        memberId: c.memberId,
        memberName: name,
        amount,
        percentage,
      };
    });

    const leadUsername = leadMember.username || leadMember.name;
    const computedApplicantName = formatCombinedApplicants({
      applicantName: leadUsername.startsWith("@") ? leadUsername : `@${leadUsername}`,
      applicantUsername: leadUsername,
      fundingStructure: "MULTI_FRIEND",
      contributors: validContributors,
    });

    const nowIso = new Date().toISOString();
    const appId = generateEntityId("app");

    const newDoc: ApplicationRecord = {
      _id: undefined,
      id: appId,
      ipoId: ipo.id,
      ipoName: ipo.name,
      memberId: leadMember.id,
      applicantName: computedApplicantName,
      applicantUsername: leadUsername,
      fundingStructure: "MULTI_FRIEND",
      numberOfPanCards: 1,
      panNumbers: [cleanPan],
      totalContribution,
      status,
      allotmentStatus: status,
      createdAt: nowIso,
      updatedAt: nowIso,
      contributors: validContributors,
    };

    await db.collection("applications").insertOne(newDoc as any);

    // Audit log
    await logAuditEvent({
      eventType: "APPLICATION_CREATED",
      category: "APPLICATION",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "APPLICATION",
      targetId: appId,
      targetName: `${computedApplicantName} - ${ipo.name}`,
      title: `Created Multi-Friend Application`,
      subtitle: `Admin created multi-friend syndicate application for ${ipo.name} with ${validContributors.length} contributors`,
      metadata: {
        id: appId,
        ipoId: ipo.id,
        ipoName: ipo.name,
        fundingStructure: "MULTI_FRIEND",
        totalContribution,
        contributorsCount: validContributors.length,
      },
    });

    await syncIpoProfitDistribution(ipo.id, db);

    return {
      success: true,
      application: JSON.parse(JSON.stringify({ ...newDoc, _id: undefined })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create multi-friend application.";
    console.error("[ORBIT][CREATE_MULTI_FRIEND_APP] Error:", msg);
    return { success: false, error: msg };
  }
}

export interface MultiFriendBatchAppItem {
  memberId: string;
  panNumber: string;
  contributors: {
    memberId: string;
    amount: number;
  }[];
}

export interface CreateMultiFriendApplicationsBatchInput {
  ipoId: string;
  applications: MultiFriendBatchAppItem[];
}

export interface CreateMultiFriendApplicationsBatchResult {
  success: boolean;
  error?: string;
  count?: number;
  createdApplications?: ApplicationRecord[];
  errorsByAppIndex?: Record<number, string>;
}

/**
 * Create Multiple Multi-Friend Applications in batch at once
 */
export async function createMultiFriendApplicationsBatch(
  data: CreateMultiFriendApplicationsBatchInput
): Promise<CreateMultiFriendApplicationsBatchResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection unavailable." };

    const { ipoId, applications: appItems } = data;

    if (!ipoId) return { success: false, error: "Target IPO is required." };
    if (!appItems || !Array.isArray(appItems) || appItems.length === 0) {
      return { success: false, error: "At least one Multi-Friend application is required." };
    }

    // 1. Verify Target IPO
    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
    if (!ipo) return { success: false, error: `IPO (${ipoId}) not found in the database.` };

    // 2. Fetch all members involved in the batch
    const allMemberIds = new Set<string>();
    appItems.forEach((app) => {
      if (app.memberId) allMemberIds.add(app.memberId);
      app.contributors?.forEach((c) => {
        if (c.memberId) allMemberIds.add(c.memberId);
      });
    });

    const memberDocs = await db
      .collection<MemberRecord>("members")
      .find({ id: { $in: Array.from(allMemberIds) } })
      .toArray();
    const memberMap = new Map(memberDocs.map((m) => [m.id, m]));

    // 3. Check for PAN collisions against existing database records for this IPO
    const batchPans = appItems.map((a) => a.panNumber?.trim().toUpperCase()).filter(Boolean);
    const existingPanDocs = await db
      .collection("applications")
      .find(
        { ipoId, panNumbers: { $in: batchPans } },
        { projection: { panNumbers: 1, applicantName: 1 } }
      )
      .toArray();

    const existingPanSet = new Set<string>();
    existingPanDocs.forEach((d) => {
      d.panNumbers?.forEach((p: string) => existingPanSet.add(p.toUpperCase()));
    });

    // 4. Validate each application in the batch
    const errorsByAppIndex: Record<number, string> = {};
    const seenPansInBatch = new Set<string>();

    appItems.forEach((app, idx) => {
      if (!app.memberId) {
        errorsByAppIndex[idx] = "Primary Lead member is required.";
        return;
      }
      const leadMember = memberMap.get(app.memberId);
      if (!leadMember) {
        errorsByAppIndex[idx] = "Lead member not found in database.";
        return;
      }
      const cleanPan = app.panNumber?.trim().toUpperCase();
      if (!cleanPan || !isValidPan(cleanPan)) {
        errorsByAppIndex[idx] = "Valid Primary PAN Card is required (e.g. ABCDE1234F).";
        return;
      }
      if (seenPansInBatch.has(cleanPan)) {
        errorsByAppIndex[idx] = `Duplicate PAN ${cleanPan} used multiple times in this batch.`;
        return;
      }
      if (existingPanSet.has(cleanPan)) {
        errorsByAppIndex[idx] = `PAN ${cleanPan} is already filed for this IPO in the database.`;
        return;
      }
      seenPansInBatch.add(cleanPan);

      const validContribs = app.contributors?.filter((c) => c.memberId && Number(c.amount) > 0) || [];
      if (validContribs.length === 0) {
        errorsByAppIndex[idx] = "At least one contributor friend with an amount > ₹0 is required.";
        return;
      }
    });

    if (Object.keys(errorsByAppIndex).length > 0) {
      return {
        success: false,
        error: "Please fix the validation errors on the flagged applications.",
        errorsByAppIndex,
      };
    }

    // 5. Construct documents
    const nowIso = new Date().toISOString();
    const createdDocs: ApplicationRecord[] = [];

    appItems.forEach((app) => {
      const cleanPan = app.panNumber.trim().toUpperCase();
      const leadMember = memberMap.get(app.memberId)!;
      const leadUsername = leadMember.username || leadMember.name;

      const totalContrib = app.contributors.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      const contributorsList: ApplicationContributor[] = app.contributors.map((c) => {
        const m = memberMap.get(c.memberId);
        const name = m ? (m.username ? `@${m.username}` : m.name) : "Contributor";
        const amt = Number(c.amount) || 0;
        const pct = totalContrib > 0 ? Math.round((amt / totalContrib) * 100) : 0;
        return {
          memberId: c.memberId,
          memberName: name,
          amount: amt,
          percentage: pct,
        };
      });

      const computedApplicantName = formatCombinedApplicants({
        applicantName: leadUsername.startsWith("@") ? leadUsername : `@${leadUsername}`,
        applicantUsername: leadUsername,
        fundingStructure: "MULTI_FRIEND",
        contributors: contributorsList,
      });

      const doc: ApplicationRecord = {
        _id: undefined,
        id: generateEntityId("app"),
        ipoId: ipo.id,
        ipoName: ipo.name,
        memberId: leadMember.id,
        applicantName: computedApplicantName,
        applicantUsername: leadUsername,
        fundingStructure: "MULTI_FRIEND",
        numberOfPanCards: 1,
        panNumbers: [cleanPan],
        totalContribution: totalContrib,
        status: "AWAITING",
        allotmentStatus: "AWAITING",
        createdAt: nowIso,
        updatedAt: nowIso,
        contributors: contributorsList,
      };

      createdDocs.push(doc);
    });

    // 6. Insert all documents in batch
    await db.collection("applications").insertMany(createdDocs as any);

    // 7. Audit log
    await logAuditEvent({
      eventType: "APPLICATION_CREATED",
      category: "APPLICATION",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "IPO",
      targetId: ipo.id,
      targetName: ipo.name,
      title: `Created ${createdDocs.length} Multi-Friend Application(s)`,
      subtitle: `Admin created batch of ${createdDocs.length} multi-friend applications for ${ipo.name}`,
      metadata: {
        count: createdDocs.length,
        ipoId: ipo.id,
        ipoName: ipo.name,
        applicationIds: createdDocs.map((d) => d.id),
      },
    });

    // 8. Synchronize profit distribution & revalidate routes
    await syncIpoProfitDistribution(ipo.id, db);

    console.info(
      `[ORBIT][CREATE_MULTI_FRIEND_BATCH] Created ${createdDocs.length} multi-friend applications for ${ipo.name} by ${adminUser}`
    );

    return {
      success: true,
      count: createdDocs.length,
      createdApplications: JSON.parse(JSON.stringify(createdDocs)),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create multi-friend applications batch.";
    console.error("[ORBIT][CREATE_MULTI_FRIEND_BATCH] Error:", msg);
    return { success: false, error: msg };
  }
}

export interface UpdateApplicationInput {
  id: string;
  ipoId: string;
  memberId: string;
  panNumbers: string[];
  fundingStructure?: string;
  status?: string;
  totalContribution: number;
  createdAt?: string;
  contributors?: ApplicationContributor[];
  lastKnownUpdatedAt?: string;
}

export interface ApplicationMutationResult {
  success: boolean;
  error?: string;
  application?: ApplicationRecord;
}

/**
 * Update an existing Application with full field support
 */
export async function updateApplication(
  id: string,
  data: UpdateApplicationInput
): Promise<ApplicationMutationResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database connection unavailable." };
    }

    const existing = await db.collection<ApplicationRecord>("applications").findOne({ id });
    if (!existing) {
      return { success: false, error: `Application record "${id}" not found.` };
    }

    // Optimistic Concurrency Control
    if (
      data.lastKnownUpdatedAt &&
      existing.updatedAt &&
      new Date(existing.updatedAt).getTime() > new Date(data.lastKnownUpdatedAt).getTime() + 1000
    ) {
      return {
        success: false,
        error: "This application was recently modified by another administrator. Please refresh the record before saving your changes.",
      };
    }

    const {
      ipoId,
      memberId,
      panNumbers,
      fundingStructure = existing.fundingStructure || "SOLO",
      status = existing.status || "AWAITING",
      totalContribution = existing.totalContribution || 0,
      createdAt = existing.createdAt,
      contributors = existing.contributors || [],
    } = data;

    if (!ipoId) return { success: false, error: "IPO Offering is required." };
    if (!memberId) return { success: false, error: "Applicant Member is required." };

    // Resolve IPO
    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
    if (!ipo) return { success: false, error: `Target IPO "${ipoId}" was not found.` };

    // Resolve Member
    const member = await db.collection("members").findOne({ id: memberId });
    if (!member) return { success: false, error: `Selected Member "${memberId}" was not found.` };

    // Validate PANs
    const cleanedPans = (panNumbers || [])
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    if (cleanedPans.length === 0) {
      return { success: false, error: "At least one PAN card number is required." };
    }

    for (const p of cleanedPans) {
      if (!isValidPan(p)) {
        return { success: false, error: `Invalid PAN format: "${p}". Must follow 5 letters, 4 numbers, 1 letter.` };
      }
    }

    const rawUser = member.username || member.name;
    const singleApplicantName = rawUser.startsWith("@") ? rawUser : `@${rawUser}`;
    const validContributors: ApplicationContributor[] = (contributors || []).map((c) => ({
      memberId: c.memberId,
      memberName: c.memberName || "Contributor",
      amount: Number(c.amount) || 0,
      percentage: totalContribution > 0 ? Math.round(((Number(c.amount) || 0) / totalContribution) * 100) : 0,
    }));

    const computedApplicantName = formatCombinedApplicants({
      applicantName: member.name,
      applicantUsername: member.username,
      fundingStructure,
      contributors: validContributors,
    });

    const nowIso = new Date().toISOString();

    const updateDoc: Partial<ApplicationRecord> = {
      ipoId,
      ipoName: ipo.name,
      memberId: member.id,
      applicantName: computedApplicantName,
      applicantUsername: member.username,
      fundingStructure,
      numberOfPanCards: cleanedPans.length,
      panNumbers: cleanedPans,
      totalContribution: Number(totalContribution) || 0,
      status,
      allotmentStatus: status,
      createdAt: createdAt || existing.createdAt || nowIso,
      updatedAt: nowIso,
      contributors: validContributors,
    };

    await db.collection<ApplicationRecord>("applications").updateOne(
      { id },
      { $set: updateDoc }
    );

    const updatedRecord: ApplicationRecord = {
      ...existing,
      ...updateDoc,
      _id: existing._id ? String(existing._id) : undefined,
    };

    // Audit log
    await logAuditEvent({
      eventType: "APPLICATION_UPDATED",
      category: "APPLICATION",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "APPLICATION",
      targetId: id,
      targetName: `${computedApplicantName} - ${ipo.name}`,
      title: `Updated Application ${id}`,
      subtitle: `Admin updated fields for application ${id}`,
      metadata: {
        id,
        ipoId: ipo.id,
        memberId: member.id,
        status,
        totalContribution,
        numberOfPanCards: cleanedPans.length,
      },
    });

    // Synchronize profit distribution for previous and updated IPO
    if (existing.ipoId && existing.ipoId !== ipoId) {
      await syncIpoProfitDistribution(existing.ipoId, db);
    }
    await syncIpoProfitDistribution(ipoId, db);

    console.info(`[ORBIT][UPDATE_APP] Application ${id} updated by ${adminUser}`);

    return {
      success: true,
      application: JSON.parse(JSON.stringify(updatedRecord)),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update application.";
    console.error("[ORBIT][UPDATE_APP] Error:", message);
    return { success: false, error: message };
  }
}

/**
 * Quick status updater for 1-click changes
 */
export async function quickUpdateApplicationStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection unavailable." };

    const nowIso = new Date().toISOString();
    const res = await db.collection("applications").updateOne(
      { id },
      {
        $set: {
          status,
          allotmentStatus: status,
          updatedAt: nowIso,
        },
      }
    );

    if (res.matchedCount === 0) {
      return { success: false, error: `Application ${id} not found.` };
    }

    await logAuditEvent({
      eventType: "APPLICATION_STATUS_UPDATED",
      category: "APPLICATION",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "APPLICATION",
      targetId: id,
      title: `Changed Status to ${status}`,
      subtitle: `Admin updated application ${id} status to ${status}`,
    });

    const existing = await db.collection<ApplicationRecord>("applications").findOne({ id });
    if (existing?.ipoId) {
      await syncIpoProfitDistribution(existing.ipoId, db);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update status.";
    return { success: false, error: msg };
  }
}

/**
 * Bulk Status Updater
 */
export async function bulkUpdateApplicationStatus(
  ids: string[],
  status: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection unavailable." };

    if (!ids || ids.length === 0) {
      return { success: false, error: "No applications selected." };
    }

    const modifiedApps = await db
      .collection<ApplicationRecord>("applications")
      .find({ id: { $in: ids } }, { projection: { ipoId: 1 } })
      .toArray();

    const affectedIpoIds = Array.from(new Set(modifiedApps.map((a) => a.ipoId).filter(Boolean)));

    const nowIso = new Date().toISOString();
    const result = await db.collection("applications").updateMany(
      { id: { $in: ids } },
      {
        $set: {
          status,
          allotmentStatus: status,
          updatedAt: nowIso,
        },
      }
    );

    await logAuditEvent({
      eventType: "BULK_APPLICATION_STATUS_UPDATED",
      category: "APPLICATION",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      title: `Bulk Updated ${result.modifiedCount} Applications to ${status}`,
      subtitle: `Admin changed status to ${status} for ${result.modifiedCount} applications`,
      metadata: { ids, status, modifiedCount: result.modifiedCount },
    });

    for (const ipoId of affectedIpoIds) {
      await syncIpoProfitDistribution(ipoId, db);
    }
    revalidatePath("/ad/members");
    return { success: true, count: result.modifiedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to bulk update applications.";
    return { success: false, error: msg };
  }
}

/**
 * Bulk Delete Applications
 */
export async function bulkDeleteApplications(
  ids: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection unavailable." };

    if (!ids || ids.length === 0) {
      return { success: false, error: "No applications selected." };
    }

    const toDeleteApps = await db
      .collection<ApplicationRecord>("applications")
      .find({ id: { $in: ids } }, { projection: { ipoId: 1 } })
      .toArray();

    const affectedIpoIds = Array.from(new Set(toDeleteApps.map((a) => a.ipoId).filter(Boolean)));
    const result = await db.collection("applications").deleteMany({ id: { $in: ids } });

    await logAuditEvent({
      eventType: "BULK_APPLICATION_DELETED",
      category: "APPLICATION",
      severity: "WARN",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      title: `Bulk Deleted ${result.deletedCount} Applications`,
      subtitle: `Admin deleted ${result.deletedCount} application filings`,
      metadata: { ids, deletedCount: result.deletedCount },
    });

    for (const ipoId of affectedIpoIds) {
      await syncIpoProfitDistribution(ipoId, db);
    }

    return { success: true, count: result.deletedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to bulk delete applications.";
    return { success: false, error: msg };
  }
}

/**
 * Delete an application record
 */
export async function deleteApplication(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database connection unavailable." };
    }

    const existing = await db.collection<ApplicationRecord>("applications").findOne({ id });
    if (!existing) {
      return { success: false, error: `Application record "${id}" not found.` };
    }

    await db.collection("applications").deleteOne({ id });

    // Audit log
    await logAuditEvent({
      eventType: "APPLICATION_DELETED",
      category: "APPLICATION",
      severity: "WARN",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "APPLICATION",
      targetId: id,
      targetName: `${existing.applicantName} - ${existing.ipoName}`,
      title: `Deleted Application ${id}`,
      subtitle: `Admin deleted application filing (${existing.applicantName})`,
      metadata: {
        id,
        applicantName: existing.applicantName,
        ipoId: existing.ipoId,
        ipoName: existing.ipoName,
        panNumbers: existing.panNumbers,
      },
    });

    if (existing.ipoId) {
      await syncIpoProfitDistribution(existing.ipoId, db);
    }

    console.info(`[ORBIT][DELETE_APP] Application ${id} deleted by ${adminUser}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete application.";
    console.error("[ORBIT][DELETE_APP] Error:", message);
    return { success: false, error: message };
  }
}

/**
 * Restore an application record (Undo deletion)
 */
export async function restoreApplication(
  record: ApplicationRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database connection unavailable." };
    }

    if (!record || !record.id) {
      return { success: false, error: "Invalid application record for restoration." };
    }

    // Clean MongoDB internal fields if any before re-inserting
    const { _id, ...cleanRecord } = record as ApplicationRecord & { _id?: unknown };

    await db.collection("applications").updateOne(
      { id: record.id },
      { $set: cleanRecord },
      { upsert: true }
    );

    // Audit log
    await logAuditEvent({
      eventType: "APPLICATION_RESTORED",
      category: "APPLICATION",
      severity: "INFO",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "APPLICATION",
      targetId: record.id,
      targetName: `${record.applicantName} - ${record.ipoName}`,
      title: `Restored Application ${record.id}`,
      subtitle: `Admin undone deletion of application filing (${record.applicantName})`,
      metadata: {
        id: record.id,
        applicantName: record.applicantName,
        ipoId: record.ipoId,
        ipoName: record.ipoName,
        panNumbers: record.panNumbers,
      },
    });

    if (record.ipoId) {
      await syncIpoProfitDistribution(record.ipoId, db);
    }

    console.info(`[ORBIT][RESTORE_APP] Application ${record.id} restored by ${adminUser}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to restore application.";
    console.error("[ORBIT][RESTORE_APP] Error:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetch ALL application records for an IPO (without pagination capping) specifically for exporting / copying
 */
export async function getAllIpoApplicationsForCopy(ipoId?: string): Promise<{
  success: boolean;
  ipoName: string;
  applications: ApplicationRecord[];
  error?: string;
}> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, ipoName: "All IPOs", applications: [], error: "Database connection unavailable." };
    }

    const filter: Filter<ApplicationRecord> = {};
    let ipoName = "All IPOs";

    if (ipoId && ipoId !== "ALL") {
      filter.ipoId = ipoId;
      const ipoDoc = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
      if (ipoDoc) ipoName = ipoDoc.name;
    }

    const docs = await db
      .collection<ApplicationRecord>("applications")
      .find(filter, {
        projection: {
          id: 1,
          ipoId: 1,
          ipoName: 1,
          applicantName: 1,
          applicantUsername: 1,
          fundingStructure: 1,
          panNumbers: 1,
          contributors: 1,
        },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const applications: ApplicationRecord[] = docs.map((doc) => ({
      ...doc,
      _id: doc._id?.toString(),
    }));

    if (applications.length > 0 && ipoName === "All IPOs" && applications[0].ipoName) {
      ipoName = applications[0].ipoName;
    }

    return {
      success: true,
      ipoName,
      applications,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch IPO applications for copy.";
    return { success: false, ipoName: "All IPOs", applications: [], error: msg };
  }
}

/**
 * Server-side generated export of IPO application filings text for one-click copy
 */
export async function exportIpoApplicationsText(ipoId?: string): Promise<{
  success: boolean;
  text: string;
  count: number;
  ipoName: string;
  error?: string;
}> {
  try {
    const db = await getDatabase();
    if (!db) {
      return { success: false, text: "", count: 0, ipoName: "All IPOs", error: "Database connection unavailable." };
    }

    const filter: Filter<ApplicationRecord> = {};
    let ipoName = "All IPOs";

    if (ipoId && ipoId !== "ALL") {
      filter.ipoId = ipoId;
      const ipoDoc = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId }, { projection: { name: 1 } });
      if (ipoDoc) ipoName = ipoDoc.name;
    }

    const docs = await db
      .collection<ApplicationRecord>("applications")
      .find(filter, {
        projection: {
          id: 1,
          ipoId: 1,
          ipoName: 1,
          applicantName: 1,
          applicantUsername: 1,
          fundingStructure: 1,
          panNumbers: 1,
          contributors: 1,
        },
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Resolve members for current authoritative data
    const memberIds = Array.from(
      new Set([
        ...docs.map((d) => d.memberId),
        ...docs.flatMap((d) => (d.contributors || []).map((c) => c.memberId)),
      ].filter(Boolean))
    );
    const membersList = memberIds.length > 0
      ? await db
          .collection<MemberRecord>("members")
          .find({ id: { $in: memberIds } }, { projection: { id: 1, panFull: 1, username: 1, name: 1 } })
          .toArray()
      : [];
    const memberMap = new Map(membersList.map((m) => [m.id, m]));

    // Format Date (DD/MM/YYYY)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;

    interface FormattedItem {
      username: string;
      pan: string;
    }

    const items: FormattedItem[] = [];
    const usernameTotalCount = new Map<string, number>();

    docs.forEach((app) => {
      let pans = app.panNumbers && app.panNumbers.length > 0 ? app.panNumbers : [];
      if (pans.length === 0) {
        const mem = memberMap.get(app.memberId);
        pans = mem?.panFull ? [mem.panFull] : ["PAN NOT AVAILABLE"];
      }

      let baseUser = "";
      if (app.fundingStructure === "MULTI_FRIEND" && app.contributors && app.contributors.length > 0) {
        baseUser = formatCombinedApplicants(app).replace(/@/g, "").trim();
      } else {
        const mem = memberMap.get(app.memberId);
        const resolvedName = mem?.username || app.applicantUsername || app.applicantName || "User";
        baseUser = resolvedName.replace(/^@/, "").trim();
      }

      pans.forEach((pan) => {
        const cleanPan =
          pan && pan !== "—" && pan !== "PAN NOT AVAILABLE"
            ? pan.trim().toUpperCase()
            : (memberMap.get(app.memberId)?.panFull || "PAN NOT AVAILABLE");
        items.push({
          username: baseUser,
          pan: cleanPan,
        });
        usernameTotalCount.set(baseUser, (usernameTotalCount.get(baseUser) || 0) + 1);
      });
    });

    if (items.length === 0) {
      return {
        success: true,
        text: "",
        count: 0,
        ipoName,
      };
    }

    const usernameRunningIndex = new Map<string, number>();
    const lines: string[] = [];

    // Header format: IPO name Date
    lines.push(`${ipoName} ${dateFormatted}`);
    lines.push("");

    items.forEach((item, index) => {
      const srno = index + 1;
      const totalCount = usernameTotalCount.get(item.username) || 1;
      const currentIndex = (usernameRunningIndex.get(item.username) || 0) + 1;
      usernameRunningIndex.set(item.username, currentIndex);

      let formattedUsername = item.username;
      if (totalCount > 1) {
        formattedUsername = `${item.username}${currentIndex}`;
      }

      lines.push(`${srno} : ${formattedUsername} - ${item.pan}`);
    });

    return {
      success: true,
      text: lines.join("\n"),
      count: items.length,
      ipoName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to export IPO applications text.";
    return { success: false, text: "", count: 0, ipoName: "All IPOs", error: msg };
  }
}



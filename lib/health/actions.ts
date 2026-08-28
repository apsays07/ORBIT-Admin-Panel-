"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import {
  DatabaseHealthReport,
  DatabaseIntegrityIssue,
  CollectionHealthMetric,
  SafeRepairResult,
} from "@/types/health";
import { ApplicationRecord } from "@/types/application";
import { MemberData } from "@/types/member";
import { NexoIPORecord, ProfitDistribution } from "@/types/ipo";
import { SessionRecord } from "@/types/security";
import { logAuditEvent } from "@/lib/audit/actions";
import { isValidPan } from "@/lib/utils";
import { verifyAdminSession } from "@/lib/auth/session";

/**
 * Conduct comprehensive database health inspection and referential integrity audit
 */
export async function getDatabaseHealthReport(): Promise<DatabaseHealthReport> {
  await verifyAdminSession();
  const startTime = Date.now();
  const db = await getDatabase();

  if (!db) {
    return {
      status: "DISCONNECTED",
      pingLatencyMs: 0,
      checkedAt: new Date().toISOString(),
      totalIssues: 1,
      criticalIssues: 1,
      warningIssues: 0,
      infoIssues: 0,
      orphanedRecordsCount: 0,
      duplicateRecordsCount: 0,
      consistencyErrorsCount: 0,
      collections: [],
      issues: [
        {
          id: "conn_err_1",
          issueType: "INVALID_RELATION",
          severity: "CRITICAL",
          entity: "MEMBER",
          recordId: "SYSTEM",
          title: "MongoDB Connection Failure",
          problem: "Unable to establish an active database connection socket.",
          repairable: false,
          detectedAt: new Date().toISOString(),
        },
      ],
    };
  }

  // Measure ping latency
  let pingLatencyMs = 0;
  try {
    const pingStart = Date.now();
    await db.command({ ping: 1 });
    pingLatencyMs = Date.now() - pingStart;
  } catch {
    pingLatencyMs = -1;
  }

  const issues: DatabaseIntegrityIssue[] = [];

  // Fetch only necessary relationship keys with lean projections in parallel
  const [
    memberDocs,
    applicationDocs,
    ipoDocs,
    profitDocs,
    sessionCount,
    memberIndexes,
    appIndexes,
    ipoIndexes,
    profitIndexes,
  ] = await Promise.all([
    db.collection("members").find({}, { projection: { id: 1, name: 1, username: 1, panFull: 1 } }).maxTimeMS(8000).toArray(),
    db.collection("applications").find({}, {
      projection: {
        id: 1,
        memberId: 1,
        ipoId: 1,
        panNumbers: 1,
        fundingStructure: 1,
        contributors: 1,
        totalContribution: 1,
      },
    }).maxTimeMS(8000).toArray(),
    db.collection("ipos").find({}, { projection: { id: 1 } }).maxTimeMS(8000).toArray(),
    db.collection("profit_distributions").find({}, { projection: { id: 1, ipoId: 1 } }).maxTimeMS(8000).toArray(),
    db.collection("sessions").countDocuments({}, { maxTimeMS: 8000 }),
    db.collection("members").indexes().catch(() => []),
    db.collection("applications").indexes().catch(() => []),
    db.collection("ipos").indexes().catch(() => []),
    db.collection("profit_distributions").indexes().catch(() => []),
  ]);

  const nowIso = new Date().toISOString();

  // Index maps for lookup
  const memberIdSet = new Set<string>();
  const memberUsernameMap = new Map<string, string[]>();

  memberDocs.forEach((m) => {
    if (m.id) memberIdSet.add(m.id);
    if (m.username) {
      const lower = m.username.toLowerCase().trim();
      const existing = memberUsernameMap.get(lower) || [];
      existing.push(m.id);
      memberUsernameMap.set(lower, existing);
    }
  });

  const ipoIdSet = new Set<string>();
  ipoDocs.forEach((ipo) => {
    if (ipo.id) ipoIdSet.add(ipo.id);
  });

  // 1. Audit Members
  memberUsernameMap.forEach((ids, username) => {
    if (ids.length > 1) {
      issues.push({
        id: `dup_usr_${username}`,
        issueType: "DUPLICATE",
        severity: "CRITICAL",
        entity: "MEMBER",
        recordId: ids.join(", "),
        title: `Duplicate Username Detected: @${username}`,
        problem: `Multiple member documents (${ids.length}) share the identical username "@${username}".`,
        suggestedAction: "REVIEW",
        repairable: false,
        metadata: { username, conflictingIds: ids },
        detectedAt: nowIso,
      });
    }
  });

  memberDocs.forEach((m) => {
    if (!m.id || !m.name) {
      issues.push({
        id: `mis_field_mem_${m._id || m.id || "unnamed"}`,
        issueType: "MISSING_FIELD",
        severity: "CRITICAL",
        entity: "MEMBER",
        recordId: m.id || String(m._id),
        title: "Member Missing Required Identity Fields",
        problem: `Member document is missing primary immutable ID or display name.`,
        suggestedAction: "MANUAL_FIX",
        repairable: false,
        detectedAt: nowIso,
      });
    }

    if (m.panFull && !isValidPan(m.panFull)) {
      issues.push({
        id: `fmt_pan_mem_${m.id}`,
        issueType: "FORMAT_ERROR",
        severity: "WARNING",
        entity: "MEMBER",
        recordId: m.id,
        title: `Invalid Member PAN Format (${m.panFull})`,
        problem: `Member @${m.username || m.name} has a malformed PAN "${m.panFull}". Expected 5 letters, 4 digits, 1 letter.`,
        suggestedAction: "REVIEW",
        repairable: false,
        detectedAt: nowIso,
      });
    }
  });

  // 2. Audit Applications
  const ipoPanMap = new Map<string, Map<string, string[]>>(); // ipoId -> pan -> appIds[]

  applicationDocs.forEach((app) => {
    // Foreign Key: Member exists
    if (app.memberId && !memberIdSet.has(app.memberId)) {
      issues.push({
        id: `orph_app_mem_${app.id}`,
        issueType: "ORPHAN",
        severity: "CRITICAL",
        entity: "APPLICATION",
        recordId: app.id,
        title: `Application References Nonexistent Member (${app.memberId})`,
        problem: `Application "${app.id}" references memberId "${app.memberId}" which does not exist in the members collection.`,
        suggestedAction: "REVIEW",
        repairable: false,
        metadata: { applicationId: app.id, missingMemberId: app.memberId },
        detectedAt: nowIso,
      });
    }

    // Foreign Key: IPO exists
    if (app.ipoId && !ipoIdSet.has(app.ipoId)) {
      issues.push({
        id: `orph_app_ipo_${app.id}`,
        issueType: "ORPHAN",
        severity: "CRITICAL",
        entity: "APPLICATION",
        recordId: app.id,
        title: `Application References Nonexistent IPO (${app.ipoId})`,
        problem: `Application "${app.id}" references offering "${app.ipoId}" which does not exist in the ipos collection.`,
        suggestedAction: "REVIEW",
        repairable: false,
        metadata: { applicationId: app.id, missingIpoId: app.ipoId },
        detectedAt: nowIso,
      });
    }

    // Check PAN duplicates within the same IPO
    if (app.ipoId && Array.isArray(app.panNumbers)) {
      let panMap = ipoPanMap.get(app.ipoId);
      if (!panMap) {
        panMap = new Map<string, string[]>();
        ipoPanMap.set(app.ipoId, panMap);
      }

      app.panNumbers.forEach((pan) => {
        const cleanPan = pan.trim().toUpperCase();
        if (cleanPan) {
          const appList = panMap!.get(cleanPan) || [];
          appList.push(app.id);
          panMap!.set(cleanPan, appList);
        }
      });
    }

    // Check Combined Application Contributor Relationships & Financial Consistency
    if (app.fundingStructure === "MULTI_FRIEND" && Array.isArray(app.contributors)) {
      let sumAmount = 0;
      const seenContributorMembers = new Set<string>();

      app.contributors.forEach((c) => {
        sumAmount += (Number(c.amount) || 0);

        if (c.memberId && !memberIdSet.has(c.memberId)) {
          issues.push({
            id: `orph_contrib_${app.id}_${c.memberId}`,
            issueType: "ORPHAN",
            severity: "CRITICAL",
            entity: "CONTRIBUTOR",
            recordId: `${app.id} / ${c.memberId}`,
            title: `Combined Contributor References Nonexistent Member (${c.memberId})`,
            problem: `Participant "${c.memberName}" in application "${app.id}" is linked to an unknown memberId "${c.memberId}".`,
            suggestedAction: "REVIEW",
            repairable: false,
            detectedAt: nowIso,
          });
        }

        if (c.memberId) {
          if (seenContributorMembers.has(c.memberId)) {
            issues.push({
              id: `dup_contrib_${app.id}_${c.memberId}`,
              issueType: "DUPLICATE",
              severity: "WARNING",
              entity: "CONTRIBUTOR",
              recordId: app.id,
              title: `Duplicate Contributor in Same Application`,
              problem: `Member "${c.memberName}" is listed multiple times as a participant in application "${app.id}".`,
              suggestedAction: "REVIEW",
              repairable: false,
              detectedAt: nowIso,
            });
          }
          seenContributorMembers.add(c.memberId);
        }
      });

      // Capital Discrepancy Check
      if (app.contributors.length > 0 && Math.abs((app.totalContribution || 0) - sumAmount) > 0.01) {
        issues.push({
          id: `mismatch_cap_${app.id}`,
          issueType: "MISMATCH",
          severity: "CRITICAL",
          entity: "APPLICATION",
          recordId: app.id,
          title: `Application Capital Mismatch in ${app.ipoName || app.id}`,
          problem: `Stored total capital (₹${app.totalContribution?.toLocaleString("en-IN")}) does not match sum of participant contributions (₹${sumAmount.toLocaleString("en-IN")}).`,
          suggestedAction: "REPAIR_RECONCILE",
          repairable: true,
          metadata: {
            applicationId: app.id,
            storedTotal: app.totalContribution || 0,
            calculatedTotal: sumAmount,
          },
          detectedAt: nowIso,
        });
      }
    }
  });

  // Check PAN duplicate collisions
  ipoPanMap.forEach((panMap, ipoId) => {
    panMap.forEach((appIds, pan) => {
      if (appIds.length > 1) {
        issues.push({
          id: `dup_pan_${ipoId}_${pan}`,
          issueType: "DUPLICATE",
          severity: "WARNING",
          entity: "APPLICATION",
          recordId: appIds.join(", "),
          title: `Duplicate PAN Filed for Same IPO (${pan})`,
          problem: `PAN "${pan}" was submitted in multiple applications (${appIds.join(", ")}) for IPO "${ipoId}".`,
          suggestedAction: "REVIEW",
          repairable: false,
          metadata: { ipoId, pan, conflictingApplicationIds: appIds },
          detectedAt: nowIso,
        });
      }
    });
  });

  // 3. Audit Profit Distributions
  profitDocs.forEach((dist) => {
    const ipoId = dist.ipoId;
    if (ipoId && !ipoIdSet.has(ipoId)) {
      issues.push({
        id: `orph_dist_ipo_${dist.id || dist._id}`,
        issueType: "ORPHAN",
        severity: "CRITICAL",
        entity: "PROFIT_DISTRIBUTION",
        recordId: dist.id || String(dist._id),
        title: `Profit Distribution References Missing IPO (${ipoId})`,
        problem: `Profit distribution record exists for IPO "${ipoId}", but no matching IPO document was found in the database.`,
        suggestedAction: "REVIEW",
        repairable: false,
        detectedAt: nowIso,
      });
    }
  });

  // Calculate totals
  const criticalIssues = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningIssues = issues.filter((i) => i.severity === "WARNING").length;
  const infoIssues = issues.filter((i) => i.severity === "INFO").length;
  const orphanedRecordsCount = issues.filter((i) => i.issueType === "ORPHAN").length;
  const duplicateRecordsCount = issues.filter((i) => i.issueType === "DUPLICATE").length;
  const consistencyErrorsCount = issues.filter((i) => i.issueType === "MISMATCH").length;

  const collections: CollectionHealthMetric[] = [
    {
      name: "members",
      documentCount: memberDocs.length,
      indexesCount: memberIndexes.length,
      status: issues.some((i) => i.entity === "MEMBER" && i.severity === "CRITICAL") ? "DEGRADED" : "HEALTHY",
      issuesCount: issues.filter((i) => i.entity === "MEMBER").length,
    },
    {
      name: "applications",
      documentCount: applicationDocs.length,
      indexesCount: appIndexes.length,
      status: issues.some((i) => i.entity === "APPLICATION" && i.severity === "CRITICAL") ? "DEGRADED" : "HEALTHY",
      issuesCount: issues.filter((i) => i.entity === "APPLICATION" || i.entity === "CONTRIBUTOR").length,
    },
    {
      name: "ipos",
      documentCount: ipoDocs.length,
      indexesCount: ipoIndexes.length,
      status: issues.some((i) => i.entity === "IPO" && i.severity === "CRITICAL") ? "DEGRADED" : "HEALTHY",
      issuesCount: issues.filter((i) => i.entity === "IPO").length,
    },
    {
      name: "profit_distributions",
      documentCount: profitDocs.length,
      indexesCount: profitIndexes.length,
      status: issues.some((i) => i.entity === "PROFIT_DISTRIBUTION" && i.severity === "CRITICAL") ? "DEGRADED" : "HEALTHY",
      issuesCount: issues.filter((i) => i.entity === "PROFIT_DISTRIBUTION").length,
    },
    {
      name: "sessions",
      documentCount: sessionCount,
      indexesCount: 1,
      status: "HEALTHY",
      issuesCount: issues.filter((i) => i.entity === "SESSION").length,
    },
  ];

  return {
    status: criticalIssues > 0 ? "DEGRADED" : "CONNECTED",
    pingLatencyMs,
    checkedAt: nowIso,
    totalIssues: issues.length,
    criticalIssues,
    warningIssues,
    infoIssues,
    orphanedRecordsCount,
    duplicateRecordsCount,
    consistencyErrorsCount,
    collections,
    issues,
    dbName: db.databaseName,
  };
}

/**
 * Execute a safe, auditable repair action on an identified database inconsistency
 */
export async function repairDatabaseIssue(
  issueId: string,
  actionType: string
): Promise<SafeRepairResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    if (actionType === "REPAIR_RECONCILE" && issueId.startsWith("mismatch_cap_")) {
      const appId = issueId.replace("mismatch_cap_", "");
      const app = await db.collection<ApplicationRecord>("applications").findOne({ id: appId });

      if (!app) {
        return { success: false, error: `Application record "${appId}" not found.` };
      }

      if (!app.contributors || !Array.isArray(app.contributors) || app.contributors.length === 0) {
        return { success: false, error: "No participant contributors available to derive capital sum." };
      }

      const sumAmount = app.contributors.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
      const oldAmount = app.totalContribution || 0;
      const nowIso = new Date().toISOString();

      await db.collection("applications").updateOne(
        { id: appId },
        {
          $set: {
            totalContribution: sumAmount,
            updatedAt: nowIso,
          },
        }
      );

      // Audit the repair
      await logAuditEvent({
        eventType: "DATABASE_INTEGRITY_REPAIR",
        category: "SYSTEM",
        severity: "INFO",
        actorUsername: adminUser,
        actorRole: "SUPER_ADMIN",
        targetType: "APPLICATION",
        targetId: appId,
        targetName: `Reconciled Capital Discrepancy for ${app.ipoName || appId}`,
        metadata: {
          issueId,
          applicationId: appId,
          previousCapital: oldAmount,
          reconciledCapital: sumAmount,
          action: "REPAIR_RECONCILE",
        },
      });

      revalidatePath("/ad/health");
      revalidatePath("/ad/applications");
      revalidatePath("/ad/allotment");
      revalidatePath("/ad/members");

      return {
        success: true,
        message: `Successfully reconciled capital total for application "${appId}" from ₹${oldAmount.toLocaleString("en-IN")} to ₹${sumAmount.toLocaleString("en-IN")}.`,
        repairedRecordId: appId,
      };
    }

    return {
      success: false,
      error: `Repair action "${actionType}" is not automated for issue "${issueId}". Please review manually.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute database repair.";
    return { success: false, error: msg };
  }
}

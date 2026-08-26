"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import { NexoIPORecord, NexoIPOStatus, ProfitDistribution } from "@/types/ipo";
import { Filter, OptionalUnlessRequiredId } from "mongodb";
import { logAuditEvent } from "@/lib/audit/actions";

export interface GetIposParams {
  query?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetIposResponse {
  ipos: NexoIPORecord[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  availableStatuses: string[];
  metricsSummary?: {
    activeCount: number;
    upcomingCount: number;
    closedCount: number;
    totalApplications: number;
    totalAppliedCount: number;
    totalAllottedCount: number;
    totalIposApplied?: number;
    allotmentRatePercentage: number;
  };
}

/**
 * Verify admin session server-side
 */
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

import { IpoService } from "@/lib/services/ipo.service";

/**
 * Server query for IPOs with filtering, search, sorting and pagination
 */
export async function getIpos(params: GetIposParams = {}): Promise<GetIposResponse> {
  return IpoService.getIpos(params);
}

/**
 * Historical IPOs query - filters only completed/historical IPOs
 */
export async function getHistoricalIpos(params: GetIposParams = {}): Promise<GetIposResponse> {
  const db = await getDatabase();
  if (!db) {
    return { ipos: [], total: 0, page: 1, totalPages: 0, limit: 10, availableStatuses: [] };
  }

  const {
    query = "",
    status = "ALL",
    category = "ALL",
    page = 1,
    limit = 10,
    sortField = "closeDate",
    sortOrder = "desc",
  } = params;

  const filter: Filter<NexoIPORecord> = {};
  const andConditions: Filter<NexoIPORecord>[] = [];

  if (query.trim()) {
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    andConditions.push({
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { company: { $regex: escaped, $options: "i" } },
        { id: { $regex: escaped, $options: "i" } },
      ],
    });
  }

  if (status && status !== "ALL") {
    andConditions.push({ status });
  }

  if (category && category !== "ALL") {
    andConditions.push({ category });
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  const collection = db.collection<NexoIPORecord>("ipos");

  // Safe sorting
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sort: Record<string, 1 | -1> = {};

  if (sortField === "name") {
    sort["name"] = sortDirection;
  } else if (sortField === "listingDate") {
    sort["metrics.listingDate"] = sortDirection;
  } else if (sortField === "closeDate") {
    sort["metrics.closeDate"] = sortDirection;
  } else if (sortField === "status") {
    sort["status"] = sortDirection;
  } else {
    sort["createdAt"] = sortDirection;
  }

  const skip = (Math.max(1, page) - 1) * limit;

  // Execute queries in parallel
  const [
    distinctStatusesRaw,
    [historyFacetRaw],
    globalHistoryStats,
    totalApplicationsAggregate,
    allottedApplicationsAggregate,
    distinctAppliedIposRaw,
  ] = await Promise.all([
    collection.distinct("status"),
    collection
      .aggregate<{
        total: { count: number }[];
        rows: NexoIPORecord[];
      }>([
        {
          $facet: {
            total: [{ $match: filter }, { $count: "count" }],
            rows: [
              { $match: filter },
            ],
          },
        },
      ])
      .toArray(),
    collection
      .aggregate<{
        totalProfit: number;
        completedCount: number;
        allotmentCount: number;
      }>([
        {
          $group: {
            _id: null,
            totalProfit: { $sum: { $ifNull: ["$profitDistribution.totalProfit", 0] } },
            completedCount: {
              $sum: { $cond: [{ $in: ["$status", ["COMPLETED", "LISTED", "CLOSED"]] }, 1, 0] },
            },
            allotmentCount: {
              $sum: { $cond: [{ $eq: ["$allotmentFinalized", true] }, 1, 0] },
            },
          },
        },
      ])
      .toArray(),
    db.collection("applications").aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$numberOfPanCards", 1] } } } },
    ]).toArray(),
    db.collection("applications").aggregate<{ total: number }>([
      {
        $project: {
          allottedPans: {
            $cond: [
              { $or: [{ $eq: ["$status", "ALLOTTED"] }, { $eq: ["$allotmentStatus", "ALLOTTED"] }] },
              {
                $let: {
                  vars: {
                    arr: {
                      $cond: [{ $isArray: "$allottedIndices" }, "$allottedIndices", []],
                    },
                  },
                  in: {
                    $cond: [{ $gt: [{ $size: "$$arr" }, 0] }, { $size: "$$arr" }, 1],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$allottedPans" },
        },
      },
    ]).toArray(),
    db.collection("applications").distinct("ipoId"),
  ]);

  function parseIpoDateTimestamp(doc: NexoIPORecord): number {
    if (doc.metrics?.closeDate) {
      const t = new Date(doc.metrics.closeDate).getTime();
      if (!isNaN(t)) return t;
    }
    if (doc.metrics?.openDate) {
      const t = new Date(doc.metrics.openDate).getTime();
      if (!isNaN(t)) return t;
    }
    if (doc.createdAt) {
      const t = new Date(doc.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  }

  const total = historyFacetRaw?.total?.[0]?.count || 0;
  const allMatchingDocs = historyFacetRaw?.rows || [];

  const sortedDocs = [...allMatchingDocs].sort((a, b) => {
    if (sortField === "name") {
      return sortDirection * a.name.localeCompare(b.name);
    }
    if (sortField === "listingDate") {
      const lA = new Date(a.metrics?.listingDate || "").getTime() || 0;
      const lB = new Date(b.metrics?.listingDate || "").getTime() || 0;
      return sortDirection * (lA - lB);
    }
    if (sortField === "recent" || sortField === "createdAt") {
      const cA = new Date(a.createdAt || "").getTime() || 0;
      const cB = new Date(b.createdAt || "").getTime() || 0;
      return sortDirection * (cA - cB);
    }
    // Default: closeDate / chronological
    const tA = parseIpoDateTimestamp(a);
    const tB = parseIpoDateTimestamp(b);
    return sortDirection * (tA - tB);
  });

  const docs = sortedDocs.slice(skip, skip + limit);

  const availableStatuses = Array.from(
    new Set(distinctStatusesRaw.filter(Boolean))
  ).map(String);

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const ipos: NexoIPORecord[] = docs.map((doc) => ({
    ...doc,
    _id: doc._id?.toString(),
  }));

  const stats = globalHistoryStats[0] || { totalProfit: 0, completedCount: 0, allotmentCount: 0 };
  const totalApplicationsCount = totalApplicationsAggregate[0]?.total || 0;
  const allottedApplicationsCount = allottedApplicationsAggregate[0]?.total || 0;
  const totalIposAppliedCount = Array.isArray(distinctAppliedIposRaw) ? distinctAppliedIposRaw.filter(Boolean).length : 0;

  const allotmentRatePercentage =
    totalApplicationsCount > 0
      ? Number(((allottedApplicationsCount / totalApplicationsCount) * 100).toFixed(1))
      : 0;

  return {
    ipos,
    total,
    page: currentPage,
    totalPages,
    limit,
    availableStatuses,
    metricsSummary: {
      activeCount: stats.completedCount,
      upcomingCount: stats.allotmentCount,
      closedCount: total,
      totalApplications: stats.totalProfit,
      totalAppliedCount: totalApplicationsCount,
      totalAllottedCount: allottedApplicationsCount,
      totalIposApplied: totalIposAppliedCount || total,
      allotmentRatePercentage,
    },
  };
}

/**
 * Get a single IPO record by ID
 */
export async function getIpoById(id: string): Promise<NexoIPORecord | null> {
  const db = await getDatabase();
  if (!db || !id) return null;

  const doc = await db.collection<NexoIPORecord>("ipos").findOne({ id });
  if (!doc) return null;

  return {
    ...doc,
    _id: doc._id?.toString(),
  };
}

export interface HistoricalIpoDetailResponse {
  ipo: NexoIPORecord;
  applicationsCount: number;
  allottedApplicationsCount: number;
  totalFundsContributed: number;
  profitDistribution: ProfitDistribution | null;
}

/**
 * Get full historical details of an IPO including linked applications and profit distributions
 */
export async function getHistoricalIpoDetail(id: string): Promise<HistoricalIpoDetailResponse | null> {
  const db = await getDatabase();
  if (!db || !id) return null;

  const ipoDoc = await db.collection<NexoIPORecord>("ipos").findOne({ id });
  if (!ipoDoc) return null;

  const ipo: NexoIPORecord = {
    ...ipoDoc,
    _id: ipoDoc._id?.toString(),
  };

  // Fetch linked applications with lean projection
  const applications = await db
    .collection("applications")
    .find(
      { ipoId: id },
      { projection: { numberOfPanCards: 1, panNumbers: 1, status: 1, allotmentStatus: 1, totalContribution: 1 } }
    )
    .maxTimeMS(8000)
    .toArray();

  let applicationsCount = 0;
  let allottedApplicationsCount = 0;
  let totalFundsContributed = 0;

  applications.forEach((app: Record<string, unknown>) => {
    const panCount = Number(app.numberOfPanCards) || (Array.isArray(app.panNumbers) && app.panNumbers.length > 0 ? app.panNumbers.length : 1);
    applicationsCount += panCount;
    if (app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED") {
      allottedApplicationsCount += panCount;
    }
    if (typeof app.totalContribution === "number") {
      totalFundsContributed += app.totalContribution;
    }
  });

  // Fetch profit distribution
  let profitDistribution: ProfitDistribution | null = (ipo.profitDistribution as ProfitDistribution) || null;
  if (!profitDistribution) {
    const distDoc = await db.collection("profit_distributions").findOne({ ipoId: id });
    if (distDoc && distDoc.profitDistribution) {
      profitDistribution = distDoc.profitDistribution as ProfitDistribution;
    } else if (distDoc) {
      profitDistribution = {
        totalProfit: distDoc.totalProfit,
        totalLots: distDoc.totalLots,
        allottedLots: distDoc.allottedLots,
        oneLotProfit: distDoc.oneLotProfit,
        publishedAt: distDoc.publishedAt?.toString(),
        publishedBy: distDoc.publishedBy,
        memberPayouts: distDoc.memberPayouts,
      };
    }
  }

  return {
    ipo,
    applicationsCount,
    allottedApplicationsCount,
    totalFundsContributed,
    profitDistribution,
  };
}

export interface IpoMutationResult {
  success: boolean;
  error?: string;
  ipoId?: string;
}

/**
 * Create a new IPO record in the database
 */
export async function createIpo(formData: FormData): Promise<IpoMutationResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database connection unavailable." };
    }

    const name = (formData.get("name") as string)?.trim();
    const company = (formData.get("company") as string)?.trim() || name;
    const category = (formData.get("category") as string)?.trim() || "Mainboard";
    const status = (formData.get("status") as string)?.trim() || "APPLICATION_OPEN";
    const recommendation = (formData.get("recommendation") as string)?.trim() || "APPLY";
    const thesis = (formData.get("thesis") as string)?.trim() || "";
    const registrarUrl = (formData.get("registrarUrl") as string)?.trim() || "";

    const rawIssueSize = (formData.get("issueSize") as string)?.trim();
    const issueSize = rawIssueSize
      ? rawIssueSize.startsWith("₹")
        ? rawIssueSize
        : `₹${rawIssueSize} Cr`
      : "₹0 Cr";

    const lotSize = parseInt(formData.get("lotSize") as string, 10) || 1;
    const minInvestment = parseFloat(formData.get("minInvestment") as string) || 0;

    // Optional GMP fields
    const rawGmpPrice = formData.get("gmpPrice") as string;
    const gmpPrice = rawGmpPrice ? parseFloat(rawGmpPrice) : undefined;

    const rawGmpPercent = formData.get("gmpPercent") as string;
    const gmpPercent = rawGmpPercent ? parseFloat(rawGmpPercent) : undefined;

    const rawEstPrice = formData.get("estimatedListingPrice") as string;
    const estimatedListingPrice = rawEstPrice ? parseFloat(rawEstPrice) : undefined;

    const gmpUpdatedOn = (formData.get("gmpUpdatedOn") as string)?.trim() || undefined;
    const gmpSource = (formData.get("gmpSource") as string)?.trim() || undefined;
    const gmpNotes = (formData.get("gmpNotes") as string)?.trim() || undefined;

    const groupDecision = (formData.get("groupDecision") as string)?.trim() || thesis || undefined;
    const groupDecisionAuthor = (formData.get("groupDecisionAuthor") as string)?.trim() || adminUser || "Admin";

    // Schedule Dates
    const openDate = (formData.get("openDate") as string)?.trim() || "";
    const closeDate = (formData.get("closeDate") as string)?.trim() || "";
    const allotmentDate = (formData.get("allotmentDate") as string)?.trim() || "";
    const listingDate = (formData.get("listingDate") as string)?.trim() || "";
    const fundUnblockDate = (formData.get("fundUnblockDate") as string)?.trim() || "";

    if (!name) {
      return { success: false, error: "IPO Name is required." };
    }

    const ipoId = "ipo_" + Date.now();
    const nowIso = new Date().toISOString();
    const logo = name.slice(0, 2).toUpperCase();

    const newIpo: OptionalUnlessRequiredId<NexoIPORecord> = {
      id: ipoId,
      name,
      nameNormalized: name.toLowerCase(),
      company,
      category,
      status: status as NexoIPOStatus,
      recommendation,
      thesis,
      logo,
      isHidden: false,
      createdAt: nowIso,
      addedAt: nowIso,
      updatedAt: nowIso,
      createdBy: adminUser,
      participantsCount: 0,
      combinedCapital: 0,
      applications: [],
      registrarUrl,
      groupDecision,
      groupDecisionAuthor,
      metrics: {
        issueSize,
        priceBand: { min: 0, max: 0 },
        lotSize,
        minInvestment,
        ...(gmpPercent !== undefined ? { gmpPercent } : {}),
        ...(gmpPrice !== undefined ? { gmpPrice } : {}),
        ...(estimatedListingPrice !== undefined ? { estimatedListingPrice } : {}),
        ...(gmpUpdatedOn ? { gmpUpdatedOn } : {}),
        ...(gmpSource ? { gmpSource } : {}),
        ...(gmpNotes ? { gmpNotes } : {}),
        openDate,
        closeDate,
        allotmentDate,
        listingDate,
        fundUnblockDate,
      },
    };

    await db.collection<NexoIPORecord>("ipos").insertOne(newIpo);
    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");

    return { success: true, ipoId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create IPO.";
    console.error("[ORBIT][CREATE_IPO] Error:", message);
    return { success: false, error: message };
  }
}

/**
 * Update an existing IPO record in the database
 */
export async function updateIpo(id: string, formData: FormData): Promise<IpoMutationResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database connection unavailable." };
    }

    const existing = await db.collection<NexoIPORecord>("ipos").findOne({ id });
    if (!existing) {
      return { success: false, error: `IPO record ${id} not found.` };
    }

    const name = (formData.get("name") as string)?.trim() || existing.name;
    const company = (formData.get("company") as string)?.trim() || existing.company || name;
    const category = (formData.get("category") as string)?.trim() || existing.category;
    const status = (formData.get("status") as string)?.trim() || existing.status;
    const recommendation = (formData.get("recommendation") as string)?.trim() || existing.recommendation;
    const thesis = (formData.get("thesis") as string)?.trim() ?? existing.thesis;
    const registrarUrl = (formData.get("registrarUrl") as string)?.trim() ?? existing.registrarUrl;

    const rawIssueSize = (formData.get("issueSize") as string)?.trim();
    const issueSize = rawIssueSize
      ? rawIssueSize.startsWith("₹")
        ? rawIssueSize
        : `₹${rawIssueSize} Cr`
      : existing.metrics?.issueSize;

    const lotSize = parseInt(formData.get("lotSize") as string, 10) || existing.metrics?.lotSize || 1;
    const minInvestment = parseFloat(formData.get("minInvestment") as string) ?? existing.metrics?.minInvestment ?? 0;

    const rawGmpPrice = formData.get("gmpPrice") as string;
    const gmpPrice = rawGmpPrice ? parseFloat(rawGmpPrice) : existing.metrics?.gmpPrice;

    const rawGmpPercent = formData.get("gmpPercent") as string;
    const gmpPercent = rawGmpPercent ? parseFloat(rawGmpPercent) : existing.metrics?.gmpPercent;

    const rawEstPrice = formData.get("estimatedListingPrice") as string;
    const estimatedListingPrice = rawEstPrice ? parseFloat(rawEstPrice) : existing.metrics?.estimatedListingPrice;

    const gmpUpdatedOn = (formData.get("gmpUpdatedOn") as string)?.trim() || existing.metrics?.gmpUpdatedOn;
    const gmpSource = (formData.get("gmpSource") as string)?.trim() || existing.metrics?.gmpSource;
    const gmpNotes = (formData.get("gmpNotes") as string)?.trim() || existing.metrics?.gmpNotes;

    const groupDecision = (formData.get("groupDecision") as string)?.trim() || existing.groupDecision;
    const groupDecisionAuthor = (formData.get("groupDecisionAuthor") as string)?.trim() || existing.groupDecisionAuthor;

    const openDate = (formData.get("openDate") as string)?.trim() || existing.metrics?.openDate;
    const closeDate = (formData.get("closeDate") as string)?.trim() || existing.metrics?.closeDate;
    const allotmentDate = (formData.get("allotmentDate") as string)?.trim() || existing.metrics?.allotmentDate;
    const listingDate = (formData.get("listingDate") as string)?.trim() || existing.metrics?.listingDate;
    const fundUnblockDate = (formData.get("fundUnblockDate") as string)?.trim() || existing.metrics?.fundUnblockDate;

    const nowIso = new Date().toISOString();

    await db.collection<NexoIPORecord>("ipos").updateOne(
      { id },
      {
        $set: {
          name,
          nameNormalized: name.toLowerCase(),
          company,
          category,
          status,
          recommendation,
          thesis,
          registrarUrl,
          groupDecision,
          groupDecisionAuthor,
          updatedAt: nowIso,
          "metrics.issueSize": issueSize,
          "metrics.lotSize": lotSize,
          "metrics.minInvestment": minInvestment,
          ...(gmpPercent !== undefined ? { "metrics.gmpPercent": gmpPercent } : {}),
          ...(gmpPrice !== undefined ? { "metrics.gmpPrice": gmpPrice } : {}),
          ...(estimatedListingPrice !== undefined ? { "metrics.estimatedListingPrice": estimatedListingPrice } : {}),
          ...(gmpUpdatedOn ? { "metrics.gmpUpdatedOn": gmpUpdatedOn } : {}),
          ...(gmpSource ? { "metrics.gmpSource": gmpSource } : {}),
          ...(gmpNotes ? { "metrics.gmpNotes": gmpNotes } : {}),
          "metrics.openDate": openDate,
          "metrics.closeDate": closeDate,
          "metrics.allotmentDate": allotmentDate,
          "metrics.listingDate": listingDate,
          "metrics.fundUnblockDate": fundUnblockDate,
        },
      }
    );

    console.info(`[ORBIT][UPDATE_IPO] IPO ${id} updated by ${adminUser}`);
    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");
    return { success: true, ipoId: id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update IPO.";
    console.error("[ORBIT][UPDATE_IPO] Error:", message);
    return { success: false, error: message };
  }
}

/**
 * Conclude / Complete an IPO
 */
export async function completeIpo(id: string): Promise<IpoMutationResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection unavailable." };

    const now = new Date();
    const nowIso = now.toISOString();
    const day = String(now.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const formattedCloseDate = `${day} ${monthName} ${year}`;

    await db.collection<NexoIPORecord>("ipos").updateOne(
      { id },
      {
        $set: {
          status: "COMPLETED",
          isCompleted: true,
          completedAt: nowIso,
          completedBy: adminUser,
          updatedAt: nowIso,
          "metrics.closeDate": formattedCloseDate,
        },
      }
    );

    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");
    return { success: true, ipoId: id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to complete IPO.";
    return { success: false, error: message };
  }
}

/**
 * Delete an IPO record permanently from MongoDB (with cascading cleanup and audit logging)
 */
export async function deleteIpo(id: string): Promise<IpoMutationResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database connection unavailable." };

    // 1. Fetch IPO record to get its name for logging
    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({
      $or: [{ id }, { _id: id as any }],
    });

    const targetIpoId = ipo?.id || id;
    const targetIpoName = ipo?.name;
    const ipoName = targetIpoName || id;

    const appFilter = targetIpoName
      ? { $or: [{ ipoId: id }, { ipoId: targetIpoId }, { ipoName: targetIpoName }] }
      : { $or: [{ ipoId: id }, { ipoId: targetIpoId }] };

    const profitFilter = { $or: [{ ipoId: id }, { ipoId: targetIpoId }] };

    // 2. Permanently delete from MongoDB ipos, applications, and profit_distributions in parallel
    const [ipoDelResult, appDelResult, profitDelResult] = await Promise.all([
      db.collection("ipos").deleteMany({
        $or: [{ id }, { _id: id as any }, { id: targetIpoId }],
      }),
      db.collection("applications").deleteMany(appFilter),
      db.collection("profit_distributions").deleteMany(profitFilter),
    ]);

    console.info(
      `[ORBIT][DELETE_IPO] Deleted IPO ${id} (${ipoName}) by ${adminUser}. Removed ${ipoDelResult.deletedCount} ipo doc, ${appDelResult.deletedCount} applications, ${profitDelResult.deletedCount} profit distributions.`
    );

    // 3. Log audit event
    await logAuditEvent({
      eventType: "IPO_DELETED",
      category: "IPO",
      severity: "WARN",
      actorUsername: adminUser,
      actorRole: "ADMIN",
      targetType: "IPO",
      targetId: id,
      targetName: ipoName,
      title: `Deleted IPO ${ipoName}`,
      subtitle: `Admin deleted IPO record and removed all linked filings`,
      metadata: {
        ipoId: id,
        ipoName,
        deletedApplicationsCount: appDelResult.deletedCount,
        deletedProfitDistributionsCount: profitDelResult.deletedCount,
      },
    });

    // 4. Revalidate all dependent routes
    revalidatePath("/ad");
    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");
    revalidatePath("/ad/applications");
    revalidatePath("/ad/allotment");
    revalidatePath("/ad/profit");
    revalidatePath("/ad/distribute-profit");
    revalidatePath("/ad/performance");
    revalidatePath("/ad/health");
    revalidatePath("/ad/audit");

    return { success: true, ipoId: id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete IPO.";
    console.error("[ORBIT][DELETE_IPO] Error:", message);
    return { success: false, error: message };
  }
}

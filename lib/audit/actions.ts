"use server";

import { getDatabase } from "@/lib/db/mongodb";
import { AuditRecord, AuditMetricsSummary } from "@/types/audit";
import { generateEntityId } from "@/lib/utils";
import { Filter } from "mongodb";

export interface GetActivitiesParams {
  query?: string;
  eventType?: string;
  category?: string;
  severity?: string;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

export interface GetActivitiesResponse {
  activities: AuditRecord[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  metrics: AuditMetricsSummary;
  availableEventTypes: string[];
  availableCategories: string[];
  availableSeverities: string[];
}

export async function getActivityLogs(
  params: GetActivitiesParams = {}
): Promise<GetActivitiesResponse> {
  const db = await getDatabase();
  if (!db) {
    return {
      activities: [],
      total: 0,
      page: 1,
      totalPages: 0,
      limit: 20,
      metrics: {
        totalActivities: 0,
        securityEventsCount: 0,
        adminActionsCount: 0,
        activeActorsCount: 0,
      },
      availableEventTypes: [],
      availableCategories: [],
      availableSeverities: [],
    };
  }

  const {
    query = "",
    eventType = "ALL",
    category = "ALL",
    severity = "ALL",
    page = 1,
    limit = 20,
    sortOrder = "desc",
  } = params;

  const collection = db.collection<AuditRecord>("activities");

  // Build Query Filter first
  const filter: Filter<AuditRecord> = {};

  if (eventType && eventType !== "ALL") {
    filter.eventType = eventType;
  }

  if (category && category !== "ALL") {
    filter.category = category;
  }

  if (severity && severity !== "ALL") {
    filter.severity = severity;
  }

  if (query.trim()) {
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { actorName: { $regex: escaped, $options: "i" } },
      { actorUsername: { $regex: escaped, $options: "i" } },
      { eventType: { $regex: escaped, $options: "i" } },
      { targetName: { $regex: escaped, $options: "i" } },
      { targetId: { $regex: escaped, $options: "i" } },
      { title: { $regex: escaped, $options: "i" } },
      { id: { $regex: escaped, $options: "i" } },
    ];
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const skip = (Math.max(1, page) - 1) * limit;

  // Execute aggregated metrics, filtered total, and paginated docs in parallel
  const [metricsFacetRaw, totalFiltered, docs] = await Promise.all([
    collection
      .aggregate<{
        total: { count: number }[];
        security: { count: number }[];
        admin: { count: number }[];
        actors: { count: number }[];
      }>([
        {
          $facet: {
            total: [{ $count: "count" }],
            security: [
              { $match: { $or: [{ isSecurityEvent: true }, { category: "SECURITY" }] } },
              { $count: "count" },
            ],
            admin: [
              { $match: { actorRole: { $in: ["SUPER_ADMIN", "ADMIN"] } } },
              { $count: "count" },
            ],
            actors: [
              { $match: { actorUsername: { $exists: true, $ne: null } } },
              { $group: { _id: "$actorUsername" } },
              { $count: "count" },
            ],
          },
        },
      ])
      .maxTimeMS(8000)
      .toArray(),
    collection.countDocuments(filter, { maxTimeMS: 8000 }),
    collection
      .find(filter, {
        projection: {
          _id: 0,
          id: 1,
          eventType: 1,
          type: 1,
          category: 1,
          severity: 1,
          actorName: 1,
          actorUsername: 1,
          actorRole: 1,
          memberName: 1,
          targetType: 1,
          targetId: 1,
          targetName: 1,
          title: 1,
          subtitle: 1,
          timestamp: 1,
          createdAt: 1,
          isSecurityEvent: 1,
        },
      })
      .sort({ createdAt: sortDirection, timestamp: sortDirection })
      .skip(skip)
      .limit(limit)
      .maxTimeMS(8000)
      .toArray(),
  ]);

  const facet = metricsFacetRaw[0] || { total: [], security: [], admin: [], actors: [] };
  const totalActivities = facet.total[0]?.count || 0;
  const securityEventsCount = facet.security[0]?.count || 0;
  const adminActionsCount = facet.admin[0]?.count || 0;
  const activeActorsCount = facet.actors[0]?.count || 0;

  const distinctEventTypes = [
    "APPLICATION_SUBMITTED",
    "ALLOTMENT_UPDATED",
    "PROFIT_DISTRIBUTED",
    "USER_LOGIN",
    "ADMIN_LOGIN",
    "MEMBER_STATUS_UPDATED",
    "IPO_CREATED",
    "IPO_UPDATED",
    "SECURITY_ALERT",
  ];
  const distinctCategories = ["APPLICATION", "ALLOTMENT", "MEMBER", "IPO", "SECURITY", "AUTH", "FINANCIAL", "SYSTEM"];
  const distinctSeverities = ["INFO", "WARN", "ERROR", "CRITICAL"];

  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const metrics: AuditMetricsSummary = {
    totalActivities,
    securityEventsCount,
    adminActionsCount,
    activeActorsCount,
  };

  const activities: AuditRecord[] = docs.map((d) => ({
    ...d,
    _id: d._id?.toString(),
  }));

  return {
    activities,
    total: totalFiltered,
    page: currentPage,
    totalPages,
    limit,
    metrics,
    availableEventTypes: distinctEventTypes,
    availableCategories: distinctCategories,
    availableSeverities: distinctSeverities,
  };
}

export interface AuditDetailResponse {
  activity: AuditRecord;
  targetLink?: string;
}

export async function getActivityDetail(
  id: string
): Promise<AuditDetailResponse | null> {
  const db = await getDatabase();
  if (!db || !id) return null;

  const doc = await db.collection<AuditRecord>("activities").findOne({ id });
  if (!doc) return null;

  const activity: AuditRecord = {
    ...doc,
    _id: doc._id?.toString(),
  };

  let targetLink: string | undefined = undefined;
  if (activity.targetType === "IPO" && activity.targetId) {
    targetLink = `/ad/ipo`;
  } else if (activity.targetType === "APPLICATION" && activity.targetId) {
    targetLink = `/ad/applications/${activity.targetId}`;
  } else if (activity.targetType === "MEMBER" && activity.targetId) {
    targetLink = `/ad/members/${activity.targetId}`;
  }

  return {
    activity,
    targetLink,
  };
}

export async function logAuditEvent(params: {
  eventType: string;
  category: string;
  severity: string;
  actorUserId?: string;
  actorMemberId?: string;
  actorName?: string;
  actorUsername?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  title?: string;
  subtitle?: string;
}): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  const nowIso = new Date().toISOString();
  const id = generateEntityId("act");

  await db.collection("activities").insertOne({
    id,
    ...params,
    createdAt: nowIso,
    timestamp: nowIso,
  });
}

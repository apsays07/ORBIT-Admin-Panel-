import { getDatabase } from "@/lib/db/mongodb";
import { IpoRepository } from "@/lib/repositories/ipo.repository";
import { parsePaginationParams, calculatePaginationMeta } from "@/lib/utils/pagination";
import { NexoIPORecord } from "@/types/ipo";
import { Filter } from "mongodb";

export class IpoService {
  static async getIpos(params: {
    query?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const db = await getDatabase();
    if (!db) {
      return {
        ipos: [],
        total: 0,
        page: 1,
        totalPages: 0,
        limit: 10,
        availableStatuses: [],
      };
    }

    const {
      query = "",
      status = "ALL",
      category = "ALL",
      page = 1,
      limit = 10,
      sortField = "createdAt",
      sortOrder = "desc",
    } = params;

    const ipoRepo = new IpoRepository(db);
    const { skip, limit: safeLimit } = parsePaginationParams({ page, limit }, 10, 50);

    const filter: Filter<NexoIPORecord> = {};
    if (query.trim()) {
      filter.name = { $regex: query.trim(), $options: "i" };
    }
    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (category && category !== "ALL") {
      filter.category = category;
    }

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = {};
    if (sortField === "name") sort["name"] = sortDirection;
    else if (sortField === "closeDate") sort["metrics.closeDate"] = sortDirection;
    else if (sortField === "openDate") sort["metrics.openDate"] = sortDirection;
    else if (sortField === "status") sort["status"] = sortDirection;
    else sort["createdAt"] = sortDirection;

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

    const { statuses, facet } = await ipoRepo.findPaginatedIpos(filter, sort, skip, safeLimit);
    const total = facet.total?.[0]?.count || 0;
    const allRows = facet.rows || [];

    const sortedRows = [...allRows].sort((a, b) => {
      if (sortField === "name") {
        return sortDirection * a.name.localeCompare(b.name);
      }
      if (sortField === "recent") {
        const cA = new Date(a.createdAt || "").getTime() || 0;
        const cB = new Date(b.createdAt || "").getTime() || 0;
        return sortDirection * (cA - cB);
      }
      const tA = parseIpoDateTimestamp(a);
      const tB = parseIpoDateTimestamp(b);
      return sortDirection * (tA - tB);
    });

    const docs = sortedRows.slice(skip, skip + safeLimit);
    const meta = calculatePaginationMeta(total, page, safeLimit);

    // Scoped application counts
    const pageIpoIds = docs.map((d) => d.id).filter(Boolean);
    const appCountsRaw =
      pageIpoIds.length > 0
        ? await db
            .collection("applications")
            .aggregate<{ _id: string; count: number }>([
              { $match: { ipoId: { $in: pageIpoIds } } },
              { $group: { _id: "$ipoId", count: { $sum: { $ifNull: ["$numberOfPanCards", 1] } } } },
            ])
            .maxTimeMS(8000)
            .toArray()
        : [];

    const countMap = new Map<string, number>();
    appCountsRaw.forEach((c) => {
      if (c._id) countMap.set(c._id, c.count);
    });

    const ipos: NexoIPORecord[] = docs.map((doc) => ({
      ...doc,
      _id: doc._id?.toString(),
      applicationCount: countMap.get(doc.id) || 0,
    }));

    return {
      ipos,
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      limit: safeLimit,
      availableStatuses: statuses,
    };
  }

  static async getIpoById(id: string) {
    const db = await getDatabase();
    if (!db) return null;
    const ipoRepo = new IpoRepository(db);
    const doc = await ipoRepo.findIpoById(id);
    if (!doc) return null;
    return {
      ...doc,
      _id: doc._id ? String(doc._id) : undefined,
    };
  }
}

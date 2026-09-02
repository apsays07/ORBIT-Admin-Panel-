import { getDatabase } from "@/lib/db/mongodb";
import { AllotmentRepository } from "@/lib/repositories/allotment.repository";
import { parsePaginationParams, calculatePaginationMeta } from "@/lib/utils/pagination";
export interface AllotmentIpoOption {
  id: string;
  name: string;
  category?: string;
  count: number;
  registrarUrl?: string;
  allotmentFinalized?: boolean;
}

export interface AllotmentMetrics {
  totalApplications: number;
  totalPanCards: number;
  pendingCount: number;
  allottedCount: number;
  notAllottedCount: number;
  totalLotsApplied: number;
}

export interface GetAllotmentParams {
  ipoId?: string;
  status?: string;
  query?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface GetAllotmentResponse {
  selectedIpo: NexoIPORecord | null;
  availableIpos: AllotmentIpoOption[];
  applications: ApplicationRecord[];
  metrics: AllotmentMetrics;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}
import { ApplicationRecord } from "@/types/application";
import { NexoIPORecord } from "@/types/ipo";
import { Filter } from "mongodb";

export class AllotmentService {
  static async getAllotmentData(params: GetAllotmentParams = {}): Promise<GetAllotmentResponse> {
    const db = await getDatabase();
    if (!db) {
      return {
        selectedIpo: null,
        availableIpos: [],
        applications: [],
        metrics: {
          totalApplications: 0,
          totalPanCards: 0,
          pendingCount: 0,
          allottedCount: 0,
          notAllottedCount: 0,
          totalLotsApplied: 0,
        },
        total: 0,
        page: 1,
        totalPages: 0,
        limit: 25,
      };
    }

    const {
      ipoId,
      status = "ALL",
      query = "",
      sortField = "createdAt",
      sortOrder = "asc",
      page = 1,
      limit = 25,
    } = params;

    const startTime = Date.now();
    const repo = new AllotmentRepository(db);
    const { skip, limit: safeLimit } = parsePaginationParams({ page, limit }, 50, 500);

    const ipoStart = Date.now();
    const { ipoDocs, ipoCountsRaw } = await repo.getIposWithCounts();
    const ipoTime = Date.now() - ipoStart;

    const countMap = new Map<string, number>();
    ipoCountsRaw.forEach((c) => {
      if (c._id) countMap.set(c._id, c.count);
    });

    const availableIpos: AllotmentIpoOption[] = ipoDocs.map((ipo) => ({
      id: ipo.id,
      name: ipo.name,
      category: ipo.category || "Mainboard",
      count: countMap.get(ipo.id) || 0,
      registrarUrl: ipo.registrarUrl,
      allotmentFinalized: ipo.allotmentFinalized,
    }));

    let targetIpoId = ipoId;
    if (!targetIpoId || targetIpoId === "DEFAULT") {
      const activeIpo = availableIpos.find((i) => i.count > 0 && !i.allotmentFinalized) || availableIpos[0];
      targetIpoId = activeIpo ? activeIpo.id : "";
    }

    const selectedIpoDoc = ipoDocs.find((i) => i.id === targetIpoId) || null;
    const selectedIpo: NexoIPORecord | null = selectedIpoDoc
      ? { ...selectedIpoDoc, _id: selectedIpoDoc._id?.toString() }
      : null;

    if (!targetIpoId) {
      return {
        selectedIpo: null,
        availableIpos,
        applications: [],
        metrics: {
          totalApplications: 0,
          totalPanCards: 0,
          pendingCount: 0,
          allottedCount: 0,
          notAllottedCount: 0,
          totalLotsApplied: 0,
        },
        total: 0,
        page: 1,
        totalPages: 0,
        limit: safeLimit,
      };
    }

    const filter: Filter<ApplicationRecord> = { ipoId: targetIpoId };
    if (status === "PENDING") {
      filter.status = { $in: ["AWAITING", "PENDING"] };
    } else if (status === "ALLOTTED") {
      filter.status = "ALLOTTED";
    } else if (status === "NOT_ALLOTTED") {
      filter.$or = [{ status: "NOT_ALLOTTED" }, { status: "ALLOTTED" }];
    }

    if (query.trim()) {
      const rawQ = query.trim();
      const withoutAt = rawQ.startsWith("@") ? rawQ.slice(1) : rawQ;
      const escaped = withoutAt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { applicantName: { $regex: escaped, $options: "i" } },
        { id: { $regex: escaped, $options: "i" } },
        { memberId: { $regex: escaped, $options: "i" } },
        { panNumbers: { $regex: escaped, $options: "i" } },
        { "contributors.memberName": { $regex: escaped, $options: "i" } },
        { "contributors.memberId": { $regex: escaped, $options: "i" } },
      ];
    }

    const sortDirection = sortOrder === "desc" ? -1 : 1;
    const sortStage: Record<string, 1 | -1> = {};
    if (sortField === "applicantName") sortStage["applicantName"] = sortDirection;
    else if (sortField === "status") sortStage["status"] = sortDirection;
    else sortStage["createdAt"] = sortDirection;

    const facetResult = await repo.findPaginatedAllotmentRows(
      targetIpoId,
      filter,
      sortStage,
      skip,
      safeLimit
    );

    const m = facetResult?.metrics?.[0] || {
      totalApplications: 0,
      totalPanCards: 0,
      allottedCount: 0,
      notAllottedCount: 0,
      pendingCount: 0,
    };

    const metrics = {
      totalApplications: m.totalPanCards || m.totalApplications || 0,
      totalPanCards: m.totalPanCards || m.totalApplications || 0,
      pendingCount: m.pendingCount || 0,
      allottedCount: m.allottedCount || 0,
      notAllottedCount: m.notAllottedCount || 0,
      totalLotsApplied: m.totalPanCards || m.totalApplications || 0,
    };

    const totalFiltered = facetResult?.totalCount?.[0]?.count || 0;
    const meta = calculatePaginationMeta(totalFiltered, page, safeLimit);

    const applications: ApplicationRecord[] = (facetResult?.rows || []).map((doc) => {
      const mem = doc.memberInfo?.[0];
      const username = mem?.username || doc.applicantName;
      return {
        ...doc,
        _id: doc._id ? String(doc._id) : undefined,
        applicantUsername: username,
      };
    });

    console.log(
      `[ALLOTMENT PERF] Total: ${Date.now() - startTime}ms (IPOs: ${ipoTime}ms, Allotment Queries & Lookup: ${Date.now() - startTime - ipoTime}ms). Rows returned: ${applications.length}`
    );

    return {
      selectedIpo,
      availableIpos,
      applications,
      metrics,
      total: totalFiltered,
      page: meta.page,
      totalPages: meta.totalPages,
      limit: safeLimit,
    };
  }
}

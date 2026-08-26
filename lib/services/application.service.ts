import { getDatabase } from "@/lib/db/mongodb";
import { ApplicationRepository } from "@/lib/repositories/application.repository";
import { IpoRepository } from "@/lib/repositories/ipo.repository";
import { MemberRepository } from "@/lib/repositories/member.repository";
import { parsePaginationParams, calculatePaginationMeta } from "@/lib/utils/pagination";
import { ApplicationRecord, GetApplicationsParams, GetApplicationsResponse, IpoOption } from "@/types/application";
import { formatCombinedApplicants } from "@/lib/utils";
import { Filter } from "mongodb";

export class ApplicationService {
  static async getApplications(params: GetApplicationsParams = {}): Promise<GetApplicationsResponse> {
    const db = await getDatabase();
    if (!db) {
      return {
        applications: [],
        total: 0,
        page: 1,
        totalPages: 0,
        limit: 25,
        metrics: {
          totalApplications: 0,
          totalApplicants: 0,
          awaitingAllotment: 0,
          allottedApplications: 0,
          notAllottedApplications: 0,
          totalCapitalPooled: 0,
        },
        availableIpos: [],
        availableStatuses: ["AWAITING", "ALLOTTED", "NOT_ALLOTTED"],
      };
    }

    const {
      query = "",
      ipoId,
      memberId,
      status = "ALL",
      fundingStructure = "ALL",
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      page = 1,
      limit = 500,
      sortField = "createdAt",
      sortOrder = "desc",
    } = params;

    const ipoRepo = new IpoRepository(db);
    const appRepo = new ApplicationRepository(db);
    const { skip, limit: safeLimit } = parsePaginationParams({ page, limit }, 500, 1000);

    // 1. Fetch IPOs list to resolve selected/default IPO
    const iposList = await ipoRepo.findIposList();

    let targetIpoId = ipoId;
    if (!targetIpoId || targetIpoId === "DEFAULT" || targetIpoId === "LATEST") {
      const openIpo = iposList.find((i) => i.status === "APPLICATION_OPEN" || i.status === "OPEN");
      targetIpoId = openIpo ? openIpo.id : (iposList[0]?.id || "ALL");
    }

    const metricsFilter: Filter<ApplicationRecord> = {};
    if (targetIpoId && targetIpoId !== "ALL") {
      metricsFilter.ipoId = targetIpoId;
    }

    const andConditions: Filter<ApplicationRecord>[] = [];
    if (targetIpoId && targetIpoId !== "ALL") {
      andConditions.push({ ipoId: targetIpoId });
    }
    if (memberId && memberId !== "ALL") {
      andConditions.push({
        $or: [{ memberId }, { "contributors.memberId": memberId }],
      });
    }
    if (status && status !== "ALL") {
      andConditions.push({ status });
    }
    if (fundingStructure && fundingStructure !== "ALL") {
      andConditions.push({ fundingStructure });
    }

    if (dateFrom && dateTo) {
      andConditions.push({
        createdAt: {
          $gte: dateFrom.includes("T") ? dateFrom : `${dateFrom}T00:00:00.000Z`,
          $lte: dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z`,
        },
      });
    } else if (dateFrom) {
      andConditions.push({
        createdAt: { $gte: dateFrom.includes("T") ? dateFrom : `${dateFrom}T00:00:00.000Z` },
      });
    } else if (dateTo) {
      andConditions.push({
        createdAt: { $lte: dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z` },
      });
    }

    if (minAmount !== undefined && maxAmount !== undefined && !isNaN(minAmount) && !isNaN(maxAmount)) {
      andConditions.push({
        totalContribution: { $gte: Number(minAmount), $lte: Number(maxAmount) },
      });
    } else if (minAmount !== undefined && !isNaN(minAmount)) {
      andConditions.push({ totalContribution: { $gte: Number(minAmount) } });
    } else if (maxAmount !== undefined && !isNaN(maxAmount)) {
      andConditions.push({ totalContribution: { $lte: Number(maxAmount) } });
    }

    if (query.trim()) {
      const rawQ = query.trim();
      const withoutAt = rawQ.startsWith("@") ? rawQ.slice(1) : rawQ;
      const escaped = withoutAt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andConditions.push({
        $or: [
          { applicantName: { $regex: escaped, $options: "i" } },
          { applicantUsername: { $regex: escaped, $options: "i" } },
          { id: { $regex: escaped, $options: "i" } },
          { ipoId: { $regex: escaped, $options: "i" } },
          { ipoName: { $regex: escaped, $options: "i" } },
          { panNumbers: { $regex: escaped, $options: "i" } },
          { memberId: { $regex: escaped, $options: "i" } },
          { status: { $regex: escaped, $options: "i" } },
          { fundingStructure: { $regex: escaped, $options: "i" } },
          { "contributors.memberName": { $regex: escaped, $options: "i" } },
          { "contributors.memberId": { $regex: escaped, $options: "i" } },
        ],
      });
    }

    const filter: Filter<ApplicationRecord> = andConditions.length > 0 ? { $and: andConditions } : {};

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortStage: Record<string, 1 | -1> = {};
    if (sortField === "applicantName") sortStage["applicantName"] = sortDirection;
    else if (sortField === "totalContribution") sortStage["totalContribution"] = sortDirection;
    else if (sortField === "status") sortStage["status"] = sortDirection;
    else if (sortField === "ipoName") sortStage["ipoName"] = sortDirection;
    else if (sortField === "updatedAt") sortStage["updatedAt"] = sortDirection;
    else sortStage["createdAt"] = sortDirection;

    const { ipoGroups, facetResult } = await appRepo.findPaginatedApplications(
      metricsFilter,
      filter,
      sortStage,
      skip,
      safeLimit
    );

    const countMap = new Map<string, number>();
    ipoGroups.forEach((g) => {
      if (g._id) countMap.set(g._id, g.count);
    });

    const seenIds = new Set<string>();
    const availableIpos: IpoOption[] = [];

    iposList.forEach((ipo) => {
      if (ipo.id && !seenIds.has(ipo.id)) {
        seenIds.add(ipo.id);
        availableIpos.push({
          id: ipo.id,
          name: ipo.name,
          count: countMap.get(ipo.id) || 0,
        });
      }
    });

    const ipoNameMap = new Map<string, string>();
    availableIpos.forEach((i) => {
      if (i.id && i.name) ipoNameMap.set(i.id, i.name);
    });

    const rawM = facetResult?.metrics?.[0] || {
      totalApplications: 0,
      totalFormsCount: 0,
      awaitingAllotment: 0,
      allottedApplications: 0,
      notAllottedApplications: 0,
      totalCapitalPooled: 0,
      applicantIds: [],
    };

    const metrics = {
      totalApplications: rawM.totalApplications,
      totalFormsCount: rawM.totalFormsCount || rawM.totalApplications,
      totalApplicants: rawM.applicantIds ? rawM.applicantIds.filter(Boolean).length : 0,
      awaitingAllotment: rawM.awaitingAllotment,
      allottedApplications: rawM.allottedApplications,
      notAllottedApplications: rawM.notAllottedApplications,
      totalCapitalPooled: rawM.totalCapitalPooled,
    };

    const applications: ApplicationRecord[] = (facetResult?.rows || []).map((doc) => {
      const mem = doc.memberInfo?.[0];
      const username = mem?.username || doc.applicantName;
      return {
        ...doc,
        _id: doc._id ? String(doc._id) : undefined,
        applicantUsername: username,
        applicantName: formatCombinedApplicants({
          applicantName: doc.applicantName,
          applicantUsername: username,
          fundingStructure: doc.fundingStructure,
          contributors: doc.contributors,
        }),
        ipoName: ipoNameMap.get(doc.ipoId) || doc.ipoName || "Unknown IPO",
      };
    });

    const totalFiltered = facetResult?.totalCount?.[0]?.count || 0;
    const meta = calculatePaginationMeta(totalFiltered, page, safeLimit);
    const selectedIpoObj = availableIpos.find((i) => i.id === targetIpoId);

    return {
      applications,
      total: totalFiltered,
      page: meta.page,
      totalPages: meta.totalPages,
      limit: safeLimit,
      metrics,
      availableIpos,
      availableStatuses: ["AWAITING", "ALLOTTED", "NOT_ALLOTTED"],
      selectedIpoId: targetIpoId,
      selectedIpoName: selectedIpoObj ? selectedIpoObj.name : undefined,
    };
  }

  static async getMembersForSelection() {
    const db = await getDatabase();
    if (!db) return [];
    const memberRepo = new MemberRepository(db);
    return memberRepo.findMembersForSelection();
  }
}

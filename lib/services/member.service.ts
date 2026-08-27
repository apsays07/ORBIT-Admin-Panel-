import { getDatabase } from "@/lib/db/mongodb";
import { MemberRepository } from "@/lib/repositories/member.repository";
import { ApplicationRepository } from "@/lib/repositories/application.repository";
import { parsePaginationParams, calculatePaginationMeta } from "@/lib/utils/pagination";
import { GetMembersParams, GetMembersResponse, MemberData } from "@/types/member";
import { calculateVerifiedPercentage } from "@/lib/calculations";
import { Filter } from "mongodb";

export class MemberService {
  static async getMembers(params: GetMembersParams = {}): Promise<GetMembersResponse> {
    const db = await getDatabase();
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
      };
    }

    const {
      query = "",
      role = "ALL",
      status = "ALL",
      page = 1,
      limit = 25,
    } = params;

    const memberRepo = new MemberRepository(db);
    const appRepo = new ApplicationRepository(db);
    const { skip, limit: safeLimit } = parsePaginationParams({ page, limit }, 25, 100);

    const filter: Filter<MemberData> = {};
    if (role && role !== "ALL") {
      if (role === "SUPER_ADMIN") filter.role = { $in: ["SUPER_ADMIN", "ADMIN"] };
      else if (role === "CORE_MEMBER") filter.role = "CORE_MEMBER";
      else if (role === "MEMBERS") filter.role = { $nin: ["SUPER_ADMIN", "ADMIN"] };
      else filter.role = role;
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

    const [totalPanCards, memberFacetRaw] = await Promise.all([
      appRepo.countTotalPanCards(),
      memberRepo.findPaginatedMembers(filter, skip, safeLimit),
    ]);

    const total = memberFacetRaw?.totalCount?.[0]?.count || 0;
    const meta = calculatePaginationMeta(total, page, safeLimit);
    const rows = (memberFacetRaw?.rows || []).map((m) => ({
      ...m,
      _id: m._id?.toString(),
    }));

    const adminCount = memberFacetRaw?.adminCount?.[0]?.count || 0;
    const verifiedCount = memberFacetRaw?.verifiedCount?.[0]?.count || 0;
    const verifiedPercentage = calculateVerifiedPercentage(verifiedCount, total);

    return {
      members: rows,
      total,
      page: meta.page,
      totalPages: meta.totalPages,
      metrics: {
        totalMembers: total,
        adminCount,
        totalApplicationsSubmitted: totalPanCards,
        verifiedPercentage,
      },
    };
  }
}

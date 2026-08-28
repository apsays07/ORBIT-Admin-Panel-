import { getDatabase } from "@/lib/db/mongodb";
import { ProfitRepository } from "@/lib/repositories/profit.repository";
import { NexoIPORecord } from "@/types/ipo";
import {
  calculatePerLotProfit,
  calculateMemberPayoutProfit,
  calculateApplicationPanCount,
  calculateAllottedLotsCount,
  calculateContributorShare,
  safeAdd,
  safeMultiply,
  normalizeNumeric,
} from "@/lib/calculations";

export interface ProfitIpoOption {
  id: string;
  name: string;
  category?: string;
  issueSize?: string;
  status: string;
  isCompleted?: boolean;
  allotmentFinalized?: boolean;
  applicationsCount: number;
}

export interface CalculatedMemberRow {
  memberId: string;
  name: string;
  username?: string;
  avatar?: string;
  pan: string;
  contribution: number;
  lots: number;
  profit: number;
}

export interface ProfitDistributionViewData {
  selectedIpo: NexoIPORecord | null;
  availableIpos: ProfitIpoOption[];
  totalApplicantsCount: number;
  totalMoneyApplied: number;
  totalAppliedLots: number;
  allottedLots: number;
  realizedProfit: number;
  perLotProfit: number;
  isPublished: boolean;
  publishedAt?: string;
  publishedBy?: string;
  members: CalculatedMemberRow[];
}

export class ProfitService {
  static async getProfitDistributionData(params: {
    ipoId?: string;
    query?: string;
    realizedProfitInput?: number;
    allottedLotsInput?: number;
  }): Promise<ProfitDistributionViewData> {
    const db = await getDatabase();
    if (!db) {
      return {
        selectedIpo: null,
        availableIpos: [],
        totalApplicantsCount: 0,
        totalMoneyApplied: 0,
        totalAppliedLots: 0,
        allottedLots: 0,
        realizedProfit: 0,
        perLotProfit: 0,
        isPublished: false,
        members: [],
      };
    }

    const profitRepo = new ProfitRepository(db);

    const { ipoDocs, ipoCountsRaw } = await profitRepo.getIposWithCounts();

    const countMap = new Map<string, number>();
    ipoCountsRaw.forEach((c) => {
      if (c._id) countMap.set(c._id, c.count);
    });

    const availableIpos: ProfitIpoOption[] = ipoDocs.map((ipo) => ({
      id: ipo.id,
      name: ipo.name,
      category: ipo.category || "Mainboard",
      issueSize: ipo.metrics?.issueSize,
      status: ipo.status,
      isCompleted: ipo.isCompleted,
      allotmentFinalized: ipo.allotmentFinalized,
      applicationsCount: countMap.get(ipo.id) || 0,
    }));

    let targetIpoId = params.ipoId;
    if (!targetIpoId || targetIpoId === "DEFAULT") {
      const active = availableIpos.find((i) => i.applicationsCount > 0 && !i.isCompleted) || availableIpos[0];
      targetIpoId = active ? active.id : "";
    }

    const selectedIpoDoc = ipoDocs.find((i) => i.id === targetIpoId) || null;
    const selectedIpo: NexoIPORecord | null = selectedIpoDoc
      ? { ...selectedIpoDoc, _id: selectedIpoDoc._id?.toString() }
      : null;

    if (!selectedIpo) {
      return {
        selectedIpo: null,
        availableIpos,
        totalApplicantsCount: 0,
        totalMoneyApplied: 0,
        totalAppliedLots: 0,
        allottedLots: 0,
        realizedProfit: 0,
        perLotProfit: 0,
        isPublished: false,
        members: [],
      };
    }

    // 1. Fetch live application documents (AUTHORITATIVE SOURCE FOR LOTS & CONTRIBUTIONS)
    const appDocs = await profitRepo.findApplicationsByIpoId(selectedIpo.id);

    const memberMap = new Map<string, {
      memberId: string;
      name: string;
      pan: string;
      contribution: number;
      lots: number;
    }>();

    let allottedLotsCount = 0;
    let totalLotsApplied = 0;

    appDocs.forEach((app) => {
      const panCount = calculateApplicationPanCount(app.panNumbers, app.numberOfPanCards);
      const allottedCount = calculateAllottedLotsCount(
        app.status,
        app.allotmentStatus,
        app.allottedIndices,
        panCount
      );

      totalLotsApplied = safeAdd(totalLotsApplied, panCount);
      allottedLotsCount = safeAdd(allottedLotsCount, allottedCount);

      if (app.fundingStructure === "MULTI_FRIEND" && Array.isArray(app.contributors) && app.contributors.length > 0) {
        const totalAmount = app.contributors.reduce((sum, c) => safeAdd(sum, c.amount), 0);
        app.contributors.forEach((c) => {
          if (c.memberId) {
            const share = totalAmount > 0 ? calculateContributorShare(c.amount, totalAmount) : 0;
            const memberLots = Number((share * panCount).toFixed(2));
            const cur = memberMap.get(c.memberId) || {
              memberId: c.memberId,
              name: c.memberName || "Member",
              pan: app.panNumbers?.[0] || "—",
              contribution: 0,
              lots: 0,
            };
            cur.contribution = safeAdd(cur.contribution, c.amount);
            cur.lots = safeAdd(cur.lots, memberLots);
            memberMap.set(c.memberId, cur);
          }
        });
      } else if (app.memberId) {
        const cur = memberMap.get(app.memberId) || {
          memberId: app.memberId,
          name: app.applicantName || "Member",
          pan: Array.isArray(app.panNumbers) && app.panNumbers.length > 0 ? app.panNumbers[0] : "—",
          contribution: 0,
          lots: 0,
        };
        cur.contribution = safeAdd(cur.contribution, app.totalContribution);
        cur.lots = safeAdd(cur.lots, panCount);
        memberMap.set(app.memberId, cur);
      }
    });

    const distDoc = await profitRepo.findProfitDistributionByIpoId(selectedIpo.id);
    const isPublished = Boolean(distDoc?.isPublished || selectedIpo.profitDistribution?.isPublished || selectedIpo.profitDistribution?.publishedAt);

    const existingDist = distDoc || selectedIpo.profitDistribution;
    let rawTotalProfit = normalizeNumeric(existingDist?.totalProfit, 0);
    const rawOneLotProfit = normalizeNumeric(existingDist?.oneLotProfit, 0);

    const effectiveAllottedLots = params.allottedLotsInput !== undefined
      ? params.allottedLotsInput
      : allottedLotsCount;

    const effectiveTotalLots = totalLotsApplied;

    // Determine authoritative per-lot profit
    let perLotProfit = 0;
    if (rawOneLotProfit > 0) {
      perLotProfit = rawOneLotProfit;
    } else if (isPublished && rawTotalProfit > 0 && effectiveTotalLots > 0) {
      perLotProfit = calculatePerLotProfit(rawTotalProfit, effectiveTotalLots);
    } else if (params.realizedProfitInput !== undefined && params.realizedProfitInput > 0) {
      perLotProfit = calculatePerLotProfit(params.realizedProfitInput, effectiveTotalLots);
    }

    const realizedProfit = isPublished
      ? safeMultiply(perLotProfit, effectiveTotalLots)
      : (params.realizedProfitInput !== undefined ? params.realizedProfitInput : safeMultiply(perLotProfit, effectiveTotalLots));

    // Resolve member usernames and avatars
    const allMemberIds = Array.from(memberMap.keys()).filter(Boolean);

    const memberDocs = allMemberIds.length > 0
      ? await db.collection("members").find(
          { id: { $in: allMemberIds } },
          { projection: { _id: 0, id: 1, name: 1, username: 1 } }
        ).maxTimeMS(8000).toArray()
      : [];

    const memberProfileMap = new Map<string, { name: string; username: string }>();
    memberDocs.forEach((m: any) => {
      memberProfileMap.set(m.id, {
        name: m.name || m.username || "Member",
        username: m.username || m.name || "user",
      });
    });

    // Compute live member rows (NEVER rely on a stale snapshot array)
    const memberRows: CalculatedMemberRow[] = [];
    memberMap.forEach((val) => {
      const lots = val.lots;
      const profit = calculateMemberPayoutProfit(lots, perLotProfit);
      const prof = memberProfileMap.get(val.memberId);
      const rawUser = prof?.username || val.name;
      const formattedUser = rawUser.startsWith("@") ? rawUser : `@${rawUser}`;

      memberRows.push({
        memberId: val.memberId,
        name: prof?.name || val.name,
        username: formattedUser,
        pan: val.pan,
        contribution: val.contribution,
        lots,
        profit,
      });
    });

    let totalMoneyApplied = 0;
    memberRows.forEach((m) => {
      totalMoneyApplied = safeAdd(totalMoneyApplied, m.contribution);
    });

    let filteredRows = memberRows;
    if (params.query?.trim()) {
      const q = params.query.trim().toLowerCase();
      filteredRows = memberRows.filter(
        (m) => m.name.toLowerCase().includes(q) || m.pan.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)
      );
    }

    return {
      selectedIpo,
      availableIpos,
      totalApplicantsCount: memberMap.size,
      totalMoneyApplied,
      totalAppliedLots: effectiveTotalLots,
      allottedLots: effectiveAllottedLots,
      realizedProfit,
      perLotProfit,
      isPublished,
      publishedAt: existingDist?.publishedAt,
      publishedBy: existingDist?.publishedBy,
      members: filteredRows,
    };
  }
}

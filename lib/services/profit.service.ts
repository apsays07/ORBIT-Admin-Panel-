import { getDatabase } from "@/lib/db/mongodb";
import { ProfitRepository } from "@/lib/repositories/profit.repository";
import { MemberRepository } from "@/lib/repositories/member.repository";
import { NexoIPORecord } from "@/types/ipo";
import {
  calculatePerLotProfit,
  calculateMemberPayoutProfit,
  calculateLotsFromContribution,
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

    const appDocs = await profitRepo.findApplicationsByIpoId(selectedIpo.id);

    const memberMap = new Map<string, {
      memberId: string;
      name: string;
      pan: string;
      contribution: number;
    }>();

    let allottedLotsCount = 0;
    let totalLotsApplied = 0;

    appDocs.forEach((app) => {
      const isAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";
      const appLots = normalizeNumeric(app.numberOfPanCards, 1);
      totalLotsApplied = safeAdd(totalLotsApplied, appLots);
      if (isAllotted) {
        allottedLotsCount = safeAdd(allottedLotsCount, app.allottedIndices?.length || appLots);
      }

      if (app.fundingStructure === "MULTI_FRIEND" && Array.isArray(app.contributors)) {
        app.contributors.forEach((c) => {
          if (c.memberId) {
            const cur = memberMap.get(c.memberId) || {
              memberId: c.memberId,
              name: c.memberName || "Member",
              pan: "—",
              contribution: 0,
            };
            cur.contribution = safeAdd(cur.contribution, c.amount);
            memberMap.set(c.memberId, cur);
          }
        });
      } else if (app.memberId) {
        const cur = memberMap.get(app.memberId) || {
          memberId: app.memberId,
          name: app.applicantName || "Member",
          pan: Array.isArray(app.panNumbers) && app.panNumbers.length > 0 ? app.panNumbers[0] : "—",
          contribution: 0,
        };
        cur.contribution = safeAdd(cur.contribution, app.totalContribution);
        memberMap.set(app.memberId, cur);
      }
    });

    const distDoc = await profitRepo.findProfitDistributionByIpoId(selectedIpo.id);
    const isPublished = Boolean(distDoc?.isPublished || selectedIpo.profitDistribution?.isPublished);

    const existingDist = distDoc || selectedIpo.profitDistribution;
    let rawTotalProfit = normalizeNumeric(existingDist?.totalProfit, 0);
    const rawOneLotProfit = normalizeNumeric(existingDist?.oneLotProfit, 0);

    const minInvest = normalizeNumeric(selectedIpo.metrics?.minInvestment, 15000);
    const payoutSource = existingDist?.memberPayouts || [];

    const effectiveAllottedLots = isPublished
      ? (existingDist?.allottedLots || distDoc?.allottedLots || allottedLotsCount || totalLotsApplied)
      : (params.allottedLotsInput !== undefined ? params.allottedLotsInput : (allottedLotsCount || totalLotsApplied));

    const effectiveTotalLots = isPublished
      ? (existingDist?.totalLots || distDoc?.totalLots || totalLotsApplied)
      : totalLotsApplied;

    if (!rawTotalProfit && rawOneLotProfit > 0) {
      const lotsForCalc = effectiveTotalLots > 0 ? effectiveTotalLots : (effectiveAllottedLots || 1);
      rawTotalProfit = safeMultiply(rawOneLotProfit, lotsForCalc);
    }

    const realizedProfit = isPublished
      ? (rawTotalProfit > 0 ? rawTotalProfit : (rawOneLotProfit > 0 ? safeMultiply(rawOneLotProfit, effectiveTotalLots || 1) : 0))
      : (params.realizedProfitInput !== undefined ? params.realizedProfitInput : 0);

    const perLotProfit = isPublished && rawOneLotProfit > 0
      ? rawOneLotProfit
      : calculatePerLotProfit(realizedProfit, effectiveTotalLots);

    const allMemberIds = Array.from(
      new Set([
        ...Array.from(memberMap.keys()),
        ...payoutSource.map((p: { memberId: string }) => p.memberId),
      ])
    ).filter(Boolean);

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

    let memberRows: any[] = [];
    if (isPublished && payoutSource.length > 0) {
      memberRows = payoutSource.map((p: any) => {
        const prof = memberProfileMap.get(p.memberId);
        const rawUser = prof?.username || p.name;
        const formattedUser = rawUser.startsWith("@") ? rawUser : `@${rawUser}`;
        return {
          memberId: p.memberId,
          name: prof?.name || p.name,
          username: formattedUser,
          pan: p.pan || "—",
          contribution: p.contribution,
          lots: p.lots,
          profit: p.profit,
        };
      });
    } else {
      memberMap.forEach((val) => {
        const lots = calculateLotsFromContribution(val.contribution, minInvest);
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
    }

    let totalMoneyApplied = 0;
    memberRows.forEach((m) => {
      totalMoneyApplied = safeAdd(totalMoneyApplied, m.contribution);
    });

    if (params.query?.trim()) {
      const q = params.query.trim().toLowerCase();
      memberRows = memberRows.filter(
        (m) => m.name.toLowerCase().includes(q) || m.pan.toLowerCase().includes(q)
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
      perLotProfit: isPublished ? (existingDist?.oneLotProfit || perLotProfit) : perLotProfit,
      isPublished,
      publishedAt: existingDist?.publishedAt,
      publishedBy: existingDist?.publishedBy,
      members: memberRows,
    };
  }
}

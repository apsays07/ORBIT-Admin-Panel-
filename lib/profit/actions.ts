"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import { ApplicationRecord } from "@/types/application";
import { NexoIPORecord, ProfitDistribution, MemberPayout } from "@/types/ipo";

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

import { ProfitService } from "@/lib/services/profit.service";

export async function getProfitDistributionData(params: {
  ipoId?: string;
  query?: string;
  realizedProfitInput?: number;
  allottedLotsInput?: number;
}): Promise<ProfitDistributionViewData> {
  return ProfitService.getProfitDistributionData(params);
}

export interface PublishProfitResult {
  success: boolean;
  error?: string;
  totalProfit?: number;
  oneLotProfit?: number;
  memberCount?: number;
}

export async function publishProfitDistribution(
  ipoId: string,
  realizedProfit: number,
  allottedLots: number
): Promise<PublishProfitResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    if (!realizedProfit || realizedProfit <= 0) {
      return { success: false, error: "Realized profit must be greater than 0." };
    }

    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
    if (!ipo) return { success: false, error: "IPO offering not found." };

    // Fetch all applications for this IPO
    const appDocs = await db
      .collection<ApplicationRecord>("applications")
      .find({ ipoId })
      .toArray();

    if (appDocs.length === 0) {
      return { success: false, error: "No applications found for this IPO." };
    }

    const memberMap = new Map<string, {
      memberId: string;
      name: string;
      pan: string;
      contribution: number;
    }>();

    let totalLots = 0;
    appDocs.forEach((app) => {
      totalLots += (app.numberOfPanCards || 1);
      if (app.contributors && app.contributors.length > 0) {
        app.contributors.forEach((c) => {
          const existing = memberMap.get(c.memberId);
          const nameFormatted = c.memberName.startsWith("@") ? c.memberName : `@${c.memberName}`;
          const panNumber = app.panNumbers?.[0] || "—";
          if (existing) {
            existing.contribution += c.amount;
          } else {
            memberMap.set(c.memberId, {
              memberId: c.memberId,
              name: nameFormatted,
              pan: panNumber,
              contribution: c.amount,
            });
          }
        });
      } else {
        const memId = app.memberId || app.id;
        const existing = memberMap.get(memId);
        const nameFormatted = app.applicantName.startsWith("@") ? app.applicantName : `@${app.applicantName}`;
        const panNumber = app.panNumbers?.[0] || "—";
        if (existing) {
          existing.contribution += app.totalContribution;
        } else {
          memberMap.set(memId, {
            memberId: memId,
            name: nameFormatted,
            pan: panNumber,
            contribution: app.totalContribution,
          });
        }
      }
    });

    const minInvest = (ipo.metrics?.minInvestment && ipo.metrics.minInvestment > 0)
      ? ipo.metrics.minInvestment
      : 1;
    const oneLotProfit = totalLots > 0 ? Math.floor(realizedProfit / totalLots) : 0;

    const memberPayouts: MemberPayout[] = [];
    memberMap.forEach((val) => {
      const lots = minInvest > 0 ? (val.contribution / minInvest) : 1;
      const profit = Math.round(lots * oneLotProfit);
      memberPayouts.push({
        memberId: val.memberId,
        name: val.name,
        pan: val.pan,
        contribution: val.contribution,
        lots,
        profit,
      });
    });

    const nowIso = new Date().toISOString();

    const distributionPayload: ProfitDistribution = {
      totalProfit: realizedProfit,
      totalLots,
      allottedLots: allottedLots || totalLots,
      oneLotProfit,
      publishedAt: nowIso,
      publishedBy: adminUser,
      memberPayouts,
    };

    // 1. Insert or update profit_distributions collection
    await db.collection("profit_distributions").updateOne(
      { ipoId },
      {
        $set: {
          ipoId,
          actorMemberId: "mem_admin",
          actorUserId: "usr_mem_admin",
          memberPayouts,
          profitDistribution: distributionPayload,
          publishedAt: nowIso,
          publishedBy: adminUser,
          updatedAt: nowIso,
        },
        $setOnInsert: {
          createdAt: nowIso,
        },
      },
      { upsert: true }
    );

    // 2. Update ipos collection
    await db.collection("ipos").updateOne(
      { id: ipoId },
      {
        $set: {
          profitDistribution: distributionPayload,
          isCompleted: true,
          status: "COMPLETED",
          updatedAt: nowIso,
        },
      }
    );

    revalidatePath("/ad/profit");
    revalidatePath("/ad/distribute-profit");
    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");

    return {
      success: true,
      totalProfit: realizedProfit,
      oneLotProfit,
      memberCount: memberPayouts.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to publish profit distribution.";
    return { success: false, error: msg };
  }
}

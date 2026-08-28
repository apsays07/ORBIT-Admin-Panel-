import { Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { revalidatePath } from "next/cache";
import { ApplicationRecord } from "@/types/application";
import { NexoIPORecord, ProfitDistribution, MemberPayout } from "@/types/ipo";
import {
  calculateApplicationPanCount,
  calculateAllottedLotsCount,
  calculateContributorShare,
  calculateMemberPayoutProfit,
  calculatePerLotProfit,
  reconcileProfitDistribution,
  safeAdd,
  normalizeNumeric,
} from "@/lib/calculations";

/**
 * Synchronize and recalculate an IPO's profit distribution whenever underlying
 * application records, lot counts, contributions, or allotment statuses are modified.
 *
 * Single Source of Truth:
 * - Application collection = Authoritative source for applied lots and contributions.
 * - One Lot Profit (profit per lot) = Authoritative financial multiplier for the IPO.
 * - Member Profit = (Current Live Member Lots) * (One Lot Profit).
 * - Total IPO Profit = (Total Live IPO Lots) * (One Lot Profit).
 */
export async function syncIpoProfitDistribution(
  ipoId: string,
  customDb?: Db | null
): Promise<{ success: boolean; synced: boolean; totalLots?: number; totalProfit?: number }> {
  try {
    if (!ipoId) return { success: false, synced: false };

    const db = customDb || (await getDatabase());
    if (!db) return { success: false, synced: false };

    // 1. Fetch IPO record
    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
    if (!ipo) return { success: false, synced: false };

    // If this IPO has no profit distribution configured or published, no sync is needed
    const existingDist = ipo.profitDistribution;
    const distDoc = await db.collection("profit_distributions").findOne({ ipoId });

    const hasProfitConfig = Boolean(
      existingDist?.oneLotProfit ||
      existingDist?.totalProfit ||
      distDoc?.profitDistribution?.oneLotProfit ||
      distDoc?.profitDistribution?.totalProfit
    );

    if (!hasProfitConfig) {
      // Revalidate standard paths even if no profit distribution yet
      triggerAllPathRevalidations(ipoId);
      return { success: true, synced: false };
    }

    // 2. Fetch all current live applications for this IPO
    const applications = await db
      .collection<ApplicationRecord>("applications")
      .find({ ipoId })
      .toArray();

    // 3. Resolve member profiles for display names
    const memberIds = new Set<string>();
    applications.forEach((app) => {
      if (app.fundingStructure === "MULTI_FRIEND" && Array.isArray(app.contributors)) {
        app.contributors.forEach((c) => {
          if (c.memberId) memberIds.add(c.memberId);
        });
      } else if (app.memberId) {
        memberIds.add(app.memberId);
      }
    });

    const memberDocs = memberIds.size > 0
      ? await db
          .collection("members")
          .find({ id: { $in: Array.from(memberIds) } }, { projection: { id: 1, name: 1, username: 1 } })
          .toArray()
      : [];

    const memberProfileMap = new Map<string, { name: string; username: string }>();
    memberDocs.forEach((m: any) => {
      memberProfileMap.set(m.id, {
        name: m.name || m.username || "Member",
        username: m.username || m.name || "user",
      });
    });

    // 4. Calculate live member lots, contributions, and allotted lots
    const memberDataMap = new Map<
      string,
      {
        memberId: string;
        name: string;
        username: string;
        pan: string;
        contribution: number;
        lots: number;
      }
    >();

    let totalLots = 0;
    let totalAllottedLots = 0;

    applications.forEach((app) => {
      const panCount = calculateApplicationPanCount(app.panNumbers, app.numberOfPanCards);
      const allottedCount = calculateAllottedLotsCount(
        app.status,
        app.allotmentStatus,
        app.allottedIndices,
        panCount
      );

      totalLots = safeAdd(totalLots, panCount);
      totalAllottedLots = safeAdd(totalAllottedLots, allottedCount);

      if (app.fundingStructure === "MULTI_FRIEND" && Array.isArray(app.contributors) && app.contributors.length > 0) {
        const totalAmount = app.contributors.reduce((sum, c) => safeAdd(sum, c.amount), 0);
        app.contributors.forEach((c) => {
          if (!c.memberId) return;
          const share = totalAmount > 0 ? calculateContributorShare(c.amount, totalAmount) : 0;
          const memberLots = Number((share * panCount).toFixed(2));
          const prof = memberProfileMap.get(c.memberId);
          const rawUser = prof?.username || c.memberName || "Member";
          const formattedUser = rawUser.startsWith("@") ? rawUser : `@${rawUser}`;

          const existing = memberDataMap.get(c.memberId);
          if (existing) {
            existing.contribution = safeAdd(existing.contribution, c.amount);
            existing.lots = safeAdd(existing.lots, memberLots);
          } else {
            memberDataMap.set(c.memberId, {
              memberId: c.memberId,
              name: prof?.name || c.memberName || "Member",
              username: formattedUser,
              pan: app.panNumbers?.[0] || "—",
              contribution: normalizeNumeric(c.amount, 0),
              lots: memberLots,
            });
          }
        });
      } else {
        const memId = app.memberId || app.id;
        const prof = memberProfileMap.get(memId);
        const rawUser = prof?.username || app.applicantUsername || app.applicantName || "Member";
        const formattedUser = rawUser.startsWith("@") ? rawUser : `@${rawUser}`;

        const existing = memberDataMap.get(memId);
        if (existing) {
          existing.contribution = safeAdd(existing.contribution, app.totalContribution);
          existing.lots = safeAdd(existing.lots, panCount);
        } else {
          memberDataMap.set(memId, {
            memberId: memId,
            name: prof?.name || app.applicantName || "Member",
            username: formattedUser,
            pan: app.panNumbers?.[0] || "—",
            contribution: normalizeNumeric(app.totalContribution, 0),
            lots: panCount,
          });
        }
      }
    });

    // 5. Determine the authoritative One Lot Profit
    const rawOneLotProfit = normalizeNumeric(
      existingDist?.oneLotProfit || distDoc?.profitDistribution?.oneLotProfit,
      0
    );
    const rawTotalProfit = normalizeNumeric(
      existingDist?.totalProfit || distDoc?.profitDistribution?.totalProfit,
      0
    );

    let oneLotProfit = rawOneLotProfit;
    if (oneLotProfit <= 0 && rawTotalProfit > 0) {
      const divisor = totalLots > 0 ? totalLots : (totalAllottedLots || 1);
      oneLotProfit = calculatePerLotProfit(rawTotalProfit, divisor);
    }

    // 6. Recalculate member payouts based on current live lots
    const memberPayouts: MemberPayout[] = [];
    let recalculatedTotalProfit = 0;

    memberDataMap.forEach((m) => {
      const payoutProfit = calculateMemberPayoutProfit(m.lots, oneLotProfit);
      recalculatedTotalProfit = safeAdd(recalculatedTotalProfit, payoutProfit);

      memberPayouts.push({
        memberId: m.memberId,
        name: m.username || m.name,
        pan: m.pan,
        contribution: m.contribution,
        lots: m.lots,
        profit: payoutProfit,
      });
    });

    // 7. Validate and reconcile
    const reconciliation = reconcileProfitDistribution(recalculatedTotalProfit, memberPayouts);
    if (!reconciliation.isValid) {
      console.warn(`[SYNC PROFIT RECONCILIATION] ${reconciliation.details}`);
    }

    const nowIso = new Date().toISOString();
    const publishedAt = existingDist?.publishedAt || distDoc?.publishedAt || nowIso;
    const publishedBy = existingDist?.publishedBy || distDoc?.publishedBy || "admin";

    const updatedDistribution: ProfitDistribution = {
      totalProfit: recalculatedTotalProfit,
      totalLots,
      allottedLots: totalAllottedLots,
      oneLotProfit,
      publishedAt,
      publishedBy,
      memberPayouts,
    };

    // 8. Update ipos collection
    await db.collection("ipos").updateOne(
      { id: ipoId },
      {
        $set: {
          profitDistribution: updatedDistribution,
          updatedAt: nowIso,
        },
      }
    );

    // 9. Update profit_distributions collection
    await db.collection("profit_distributions").updateOne(
      { ipoId },
      {
        $set: {
          memberPayouts,
          profitDistribution: updatedDistribution,
          updatedAt: nowIso,
        },
      },
      { upsert: true }
    );

    // 10. Revalidate all dependent routes
    triggerAllPathRevalidations(ipoId);

    return {
      success: true,
      synced: true,
      totalLots,
      totalProfit: recalculatedTotalProfit,
    };
  } catch (error) {
    console.error(`[syncIpoProfitDistribution] Error syncing IPO ${ipoId}:`, error);
    return { success: false, synced: false };
  }
}

/**
 * Centralized cache invalidation for all affected routes
 */
export function triggerAllPathRevalidations(ipoId?: string) {
  try {
    revalidatePath("/ad/applications");
    revalidatePath("/ad/allotment");
    revalidatePath("/ad/profit");
    revalidatePath("/ad/distribute-profit");
    if (ipoId) {
      revalidatePath(`/ad/profit/${ipoId}`);
      revalidatePath(`/ad/applications/${ipoId}`);
    }
    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");
    revalidatePath("/ad/members");
    revalidatePath("/ad/performance");
    revalidatePath("/ad/audit");
  } catch {
    // Ignore in non-server action test environments
  }
}

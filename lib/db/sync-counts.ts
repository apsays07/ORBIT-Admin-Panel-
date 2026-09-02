import { Db } from "mongodb";
import { getDatabase } from "./mongodb";
import { ApplicationRecord } from "@/types/application";
import { NexoIPORecord } from "@/types/ipo";
import { MemberData } from "@/types/member";

export interface SyncCountsResult {
  success: boolean;
  iposUpdated: number;
  membersUpdated: number;
  profitDistributionsUpdated: number;
  error?: string;
}

/**
 * Authoritative synchronization service to recalculate and persist correct counts
 * across MongoDB collections:
 * 1. `ipos`: applicationCount, totalAppliedLots, participantsCount, combinedCapital
 * 2. `members`: iposAppliedCount, totalApplicationsSubmitted, totalContributed
 * 3. `profit_distributions`: totalLots, allottedLots, totalProfit, oneLotProfit
 */
export async function syncDatabaseAppliedCounts(customDb?: Db | null): Promise<SyncCountsResult> {
  try {
    const db = customDb || (await getDatabase());
    if (!db) {
      return { success: false, iposUpdated: 0, membersUpdated: 0, profitDistributionsUpdated: 0, error: "Database unavailable" };
    }

    const nowIso = new Date().toISOString();

    // ----------------------------------------------------
    // 1. SYNC IPOS COLLECTION
    // ----------------------------------------------------
    const ipos = await db.collection<NexoIPORecord>("ipos").find({}).toArray();
    let iposUpdated = 0;

    for (const ipo of ipos) {
      const apps = await db.collection<ApplicationRecord>("applications").find({ ipoId: ipo.id }).toArray();
      const applicationCount = apps.length;
      const totalAppliedLots = apps.reduce(
        (sum, a) => sum + (a.numberOfPanCards || (Array.isArray(a.panNumbers) && a.panNumbers.length > 0 ? a.panNumbers.length : 1)),
        0
      );
      const combinedCapital = apps.reduce((sum, a) => sum + Number(a.totalContribution || 0), 0);

      const participantSet = new Set<string>();
      apps.forEach((a) => {
        if (a.memberId) participantSet.add(a.memberId);
        if (Array.isArray(a.contributors)) {
          a.contributors.forEach((c) => {
            if (c.memberId) participantSet.add(c.memberId);
          });
        }
      });
      const participantsCount = participantSet.size;

      // Also clean profitDistribution totalLots if present
      const updates: Record<string, any> = {
        applicationCount,
        totalAppliedLots,
        participantsCount,
        combinedCapital,
        updatedAt: nowIso,
      };

      if (ipo.profitDistribution) {
        const cleanTotalLots = Math.round(Number(ipo.profitDistribution.totalLots || totalAppliedLots));
        const cleanAllottedLots = Math.round(Number(ipo.profitDistribution.allottedLots || 0));
        updates["profitDistribution.totalLots"] = cleanTotalLots;
        updates["profitDistribution.allottedLots"] = cleanAllottedLots;
      }

      await db.collection("ipos").updateOne({ id: ipo.id }, { $set: updates });
      iposUpdated++;
    }

    // ----------------------------------------------------
    // 2. SYNC MEMBERS COLLECTION
    // ----------------------------------------------------
    const members = await db.collection<MemberData>("members").find({}).toArray();
    let membersUpdated = 0;

    for (const member of members) {
      const soloApps = await db.collection<ApplicationRecord>("applications").find({ memberId: member.id }).toArray();
      const contribApps = await db.collection<ApplicationRecord>("applications").find({ "contributors.memberId": member.id }).toArray();

      const allAppsMap = new Map<string, ApplicationRecord>();
      soloApps.forEach((a) => allAppsMap.set(a.id, a));
      contribApps.forEach((a) => allAppsMap.set(a.id, a));

      const allApps = Array.from(allAppsMap.values());
      const uniqueIpos = new Set(allApps.map((a) => a.ipoId).filter(Boolean));
      const iposAppliedCount = uniqueIpos.size;
      const totalApplicationsSubmitted = allApps.length;

      let totalContributed = 0;
      allApps.forEach((app) => {
        if (app.fundingStructure === "MULTI_FRIEND" && Array.isArray(app.contributors)) {
          const c = app.contributors.find((x) => x.memberId === member.id);
          if (c) totalContributed += Number(c.amount || 0);
        } else if (app.memberId === member.id) {
          totalContributed += Number(app.totalContribution || 0);
        }
      });

      await db.collection("members").updateOne(
        { id: member.id },
        {
          $set: {
            iposAppliedCount,
            totalApplicationsSubmitted,
            totalContributed,
            updatedAt: nowIso,
          },
        }
      );
      membersUpdated++;
    }

    // ----------------------------------------------------
    // 3. SYNC PROFIT DISTRIBUTIONS COLLECTION
    // ----------------------------------------------------
    const profitDists = await db.collection("profit_distributions").find({}).toArray();
    let profitDistributionsUpdated = 0;

    for (const pd of profitDists) {
      const nested = pd.profitDistribution || {};
      const apps = await db.collection<ApplicationRecord>("applications").find({ ipoId: pd.ipoId }).toArray();
      const calculatedTotalLots = apps.reduce(
        (sum, a) => sum + (a.numberOfPanCards || (Array.isArray(a.panNumbers) && a.panNumbers.length > 0 ? a.panNumbers.length : 1)),
        0
      );

      const effectiveTotalLots = Math.round(Number(pd.totalLots || nested.totalLots || calculatedTotalLots));
      const effectiveAllottedLots = Math.round(Number(pd.allottedLots || nested.allottedLots || 0));
      const effectiveTotalProfit = Number(pd.totalProfit || nested.totalProfit || 0);
      const effectiveOneLotProfit = Number(pd.oneLotProfit || nested.oneLotProfit || 0);

      await db.collection("profit_distributions").updateOne(
        { _id: pd._id },
        {
          $set: {
            totalLots: effectiveTotalLots,
            allottedLots: effectiveAllottedLots,
            totalProfit: effectiveTotalProfit,
            oneLotProfit: effectiveOneLotProfit,
            "profitDistribution.totalLots": effectiveTotalLots,
            "profitDistribution.allottedLots": effectiveAllottedLots,
            "profitDistribution.totalProfit": effectiveTotalProfit,
            "profitDistribution.oneLotProfit": effectiveOneLotProfit,
            updatedAt: nowIso,
          },
        }
      );
      profitDistributionsUpdated++;
    }

    return {
      success: true,
      iposUpdated,
      membersUpdated,
      profitDistributionsUpdated,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to synchronize applied counts.";
    console.error("[syncDatabaseAppliedCounts] Error:", error);
    return {
      success: false,
      iposUpdated: 0,
      membersUpdated: 0,
      profitDistributionsUpdated: 0,
      error,
    };
  }
}

/**
 * Re-sync count metrics for a single IPO whenever applications are added, edited, or deleted.
 */
export async function syncIpoMetrics(ipoId: string, customDb?: Db | null): Promise<void> {
  const db = customDb || (await getDatabase());
  if (!db || !ipoId) return;

  const nowIso = new Date().toISOString();
  const apps = await db.collection<ApplicationRecord>("applications").find({ ipoId }).toArray();
  const applicationCount = apps.length;
  const totalAppliedLots = apps.reduce(
    (sum, a) => sum + (a.numberOfPanCards || (Array.isArray(a.panNumbers) && a.panNumbers.length > 0 ? a.panNumbers.length : 1)),
    0
  );
  const combinedCapital = apps.reduce((sum, a) => sum + Number(a.totalContribution || 0), 0);

  const participantSet = new Set<string>();
  apps.forEach((a) => {
    if (a.memberId) participantSet.add(a.memberId);
    if (Array.isArray(a.contributors)) {
      a.contributors.forEach((c) => {
        if (c.memberId) participantSet.add(c.memberId);
      });
    }
  });
  const participantsCount = participantSet.size;

  await db.collection("ipos").updateOne(
    { id: ipoId },
    {
      $set: {
        applicationCount,
        totalAppliedLots,
        participantsCount,
        combinedCapital,
        updatedAt: nowIso,
      },
    }
  );
}

/**
 * Re-sync count metrics for members whenever applications are added, edited, or deleted.
 */
export async function syncMemberMetrics(memberIds: string[], customDb?: Db | null): Promise<void> {
  const db = customDb || (await getDatabase());
  if (!db || !memberIds || memberIds.length === 0) return;

  const nowIso = new Date().toISOString();
  const uniqueMemberIds = Array.from(new Set(memberIds)).filter(Boolean);

  for (const memberId of uniqueMemberIds) {
    const soloApps = await db.collection<ApplicationRecord>("applications").find({ memberId }).toArray();
    const contribApps = await db.collection<ApplicationRecord>("applications").find({ "contributors.memberId": memberId }).toArray();

    const allAppsMap = new Map<string, ApplicationRecord>();
    soloApps.forEach((a) => allAppsMap.set(a.id, a));
    contribApps.forEach((a) => allAppsMap.set(a.id, a));

    const allApps = Array.from(allAppsMap.values());
    const uniqueIpos = new Set(allApps.map((a) => a.ipoId).filter(Boolean));
    const iposAppliedCount = uniqueIpos.size;
    const totalApplicationsSubmitted = allApps.length;

    let totalContributed = 0;
    allApps.forEach((app) => {
      if (app.fundingStructure === "MULTI_FRIEND" && Array.isArray(app.contributors)) {
        const c = app.contributors.find((x) => x.memberId === memberId);
        if (c) totalContributed += Number(c.amount || 0);
      } else if (app.memberId === memberId) {
        totalContributed += Number(app.totalContribution || 0);
      }
    });

    await db.collection("members").updateOne(
      { id: memberId },
      {
        $set: {
          iposAppliedCount,
          totalApplicationsSubmitted,
          totalContributed,
          updatedAt: nowIso,
        },
      }
    );
  }
}

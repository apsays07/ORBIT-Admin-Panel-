import { getDatabase } from "@/lib/db/mongodb";
import { MemberPerformanceCategory } from "@/types/member";

export class PerformanceService {
  static async getMemberPerformanceRecords(): Promise<MemberPerformanceCategory[]> {
    const db = await getDatabase();
    if (!db) return [];

    const [membersRaw, appsRaw, distsRaw] = await Promise.all([
      db.collection("members").find({}, { projection: { _id: 0, id: 1, name: 1, username: 1 } }).maxTimeMS(8000).toArray(),
      db.collection("applications").find({}, {
        projection: {
          id: 1,
          ipoId: 1,
          ipoName: 1,
          memberId: 1,
          applicantName: 1,
          numberOfPanCards: 1,
          panNumbers: 1,
          totalContribution: 1,
          contributors: 1,
          status: 1,
          allotmentStatus: 1,
          allottedIndices: 1,
        },
      }).maxTimeMS(8000).toArray(),
      db.collection("profit_distributions").find({}, { projection: { memberPayouts: 1 } }).maxTimeMS(8000).toArray(),
    ]);

    const memberMap = new Map<string, { id: string; name: string; username: string; avatar?: string }>();
    membersRaw.forEach((m: any) => {
      if (m.id) {
        memberMap.set(m.id, {
          id: m.id,
          name: m.name || m.username || "Member",
          username: m.username || m.name || "user",
          avatar: m.avatar,
        });
      }
    });

    const profitMap = new Map<string, number>();
    distsRaw.forEach((dist: any) => {
      (dist.memberPayouts || []).forEach((p: { memberId: string; profit: number }) => {
        if (p.memberId) {
          const cur = profitMap.get(p.memberId) || 0;
          profitMap.set(p.memberId, cur + (p.profit || 0));
        }
      });
    });

    const capitalMap = new Map<string, number>();
    const totalAppliedLotsMap = new Map<string, number>();
    const ipoAppliedLotsMap = new Map<string, Map<string, { ipoName: string; lots: number }>>();
    const allottedLotsMap = new Map<string, number>();

    appsRaw.forEach((app: any) => {
      const panCount =
        app.numberOfPanCards ||
        (Array.isArray(app.panNumbers) && app.panNumbers.length > 0 ? app.panNumbers.length : 1);
      const isSolo = !app.contributors || app.contributors.length === 0;

      let allottedCount = 0;
      if (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) {
        allottedCount = app.allottedIndices.length;
      } else if (app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED") {
        allottedCount = panCount;
      }

      if (isSolo) {
        if (app.memberId) {
          capitalMap.set(app.memberId, (capitalMap.get(app.memberId) || 0) + (app.totalContribution || 0));
          totalAppliedLotsMap.set(app.memberId, (totalAppliedLotsMap.get(app.memberId) || 0) + panCount);

          const memberIpos = ipoAppliedLotsMap.get(app.memberId) || new Map();
          const curIpoLots = memberIpos.get(app.ipoId) || { ipoName: app.ipoName || "IPO", lots: 0 };
          curIpoLots.lots += panCount;
          if (app.ipoName) curIpoLots.ipoName = app.ipoName;
          memberIpos.set(app.ipoId, curIpoLots);
          ipoAppliedLotsMap.set(app.memberId, memberIpos);

          if (allottedCount > 0) {
            allottedLotsMap.set(app.memberId, (allottedLotsMap.get(app.memberId) || 0) + allottedCount);
          }
        }
      } else {
        const totalAmount =
          app.contributors.reduce((sum: number, c: { amount?: number }) => sum + (c.amount || 0), 0) || app.totalContribution || 1;
        app.contributors.forEach((c: { memberId?: string; amount?: number; memberName?: string }) => {
          if (c.memberId) {
            const share = (c.amount || 0) / totalAmount;
            const approxLots = Math.max(1, Math.round(panCount * share));
            capitalMap.set(c.memberId, (capitalMap.get(c.memberId) || 0) + (c.amount || 0));
            totalAppliedLotsMap.set(c.memberId, (totalAppliedLotsMap.get(c.memberId) || 0) + approxLots);

            const memberIpos = ipoAppliedLotsMap.get(c.memberId) || new Map();
            const curIpoLots = memberIpos.get(app.ipoId) || { ipoName: app.ipoName || "IPO", lots: 0 };
            curIpoLots.lots += approxLots;
            if (app.ipoName) curIpoLots.ipoName = app.ipoName;
            memberIpos.set(app.ipoId, curIpoLots);
            ipoAppliedLotsMap.set(c.memberId, memberIpos);

            if (allottedCount > 0) {
              const approxAllotted = Math.max(1, Math.round(allottedCount * share));
              allottedLotsMap.set(c.memberId, (allottedLotsMap.get(c.memberId) || 0) + approxAllotted);
            }
          }
        });
      }
    });

    const highestProfitRows: any[] = [];
    const highestCapitalRows: any[] = [];
    const mostAppliedLotsRows: any[] = [];
    const highestSingleIpoRows: any[] = [];
    const mostAllottedLotsRows: any[] = [];
    const highestAllotmentRateRows: any[] = [];
    const mostOfferingsRows: any[] = [];

    memberMap.forEach((m, memId) => {
      const profit = profitMap.get(memId) || 0;
      const capital = capitalMap.get(memId) || 0;
      const appliedLots = totalAppliedLotsMap.get(memId) || 0;
      const allottedLots = allottedLotsMap.get(memId) || 0;
      const memberIpos = ipoAppliedLotsMap.get(memId) || new Map();
      const ipoCount = memberIpos.size;

      let maxSingleIpoLots = 0;
      let maxSingleIpoName = "—";
      memberIpos.forEach((val) => {
        if (val.lots > maxSingleIpoLots) {
          maxSingleIpoLots = val.lots;
          maxSingleIpoName = val.ipoName;
        }
      });

      const rate = appliedLots > 0 ? Math.round((allottedLots / appliedLots) * 100) : 0;
      const formattedUser = m.username.startsWith("@") ? m.username : `@${m.username}`;

      const baseInfo = {
        memberId: m.id,
        name: m.name,
        username: formattedUser,
        avatar: m.avatar,
      };

      if (profit > 0) {
        highestProfitRows.push({ member: baseInfo, rawValue: profit, valueDisplay: `₹${profit.toLocaleString("en-IN")}`, context: `${allottedLots} lots allotted` });
      }
      if (capital > 0) {
        highestCapitalRows.push({ member: baseInfo, rawValue: capital, valueDisplay: `₹${capital.toLocaleString("en-IN")}`, context: `${appliedLots} lots pooled` });
      }
      if (appliedLots > 0) {
        mostAppliedLotsRows.push({ member: baseInfo, rawValue: appliedLots, valueDisplay: `${appliedLots} lots`, context: `Across ${ipoCount} IPOs` });
      }
      if (maxSingleIpoLots > 0) {
        highestSingleIpoRows.push({ member: baseInfo, rawValue: maxSingleIpoLots, valueDisplay: `${maxSingleIpoLots} lots`, context: maxSingleIpoName });
      }
      if (allottedLots > 0) {
        mostAllottedLotsRows.push({ member: baseInfo, rawValue: allottedLots, valueDisplay: `${allottedLots} lots`, context: `${rate}% strike rate` });
      }
      if (appliedLots >= 1) {
        highestAllotmentRateRows.push({ member: baseInfo, rawValue: rate, valueDisplay: `${rate}%`, context: `${allottedLots} / ${appliedLots} lots` });
      }
      if (ipoCount > 0) {
        mostOfferingsRows.push({ member: baseInfo, rawValue: ipoCount, valueDisplay: `${ipoCount} IPOs`, context: `${appliedLots} total lots` });
      }
    });

    const assignRanks = (arr: any[]): any[] => {
      arr.sort((a, b) => b.rawValue - a.rawValue);
      return arr.map((item, idx) => ({ ...item, rank: idx + 1 }));
    };

    const pRows = assignRanks(highestProfitRows);
    const cRows = assignRanks(highestCapitalRows);
    const aRows = assignRanks(mostAppliedLotsRows);
    const sRows = assignRanks(highestSingleIpoRows);
    const alRows = assignRanks(mostAllottedLotsRows);
    const rRows = assignRanks(highestAllotmentRateRows);
    const oRows = assignRanks(mostOfferingsRows);

    return [
      { id: "highest_profit", metricId: "highest_profit", badgeLabel: "HIGHEST PROFIT", title: "Highest Profit", subtitle: "Lifetime distributed earnings from Nexo payouts", accentColor: "emerald", rows: pRows, isEmpty: pRows.length === 0 },
      { id: "highest_capital", metricId: "highest_capital", badgeLabel: "HIGHEST CAPITAL", title: "Capital Investment", subtitle: "Total pooled funds across solo & split applications", accentColor: "sky", rows: cRows, isEmpty: cRows.length === 0 },
      { id: "most_applied_lots", metricId: "most_applied_lots", badgeLabel: "MOST APPLIED LOTS", title: "Total Applied Lots", subtitle: "Cumulative lots submitted across all offerings", accentColor: "indigo", rows: aRows, isEmpty: aRows.length === 0 },
      { id: "highest_single_ipo", metricId: "highest_single_ipo", badgeLabel: "SINGLE IPO RECORD", title: "Single IPO Max Lots", subtitle: "Highest lot count applied for in a single offering", accentColor: "purple", rows: sRows, isEmpty: sRows.length === 0 },
      { id: "most_allotted_lots", metricId: "most_allotted_lots", badgeLabel: "MOST ALLOTTED LOTS", title: "Total Allotted Lots", subtitle: "Successfully confirmed lot allocations", accentColor: "amber", rows: alRows, isEmpty: alRows.length === 0 },
      { id: "highest_allotment_rate", metricId: "highest_allotment_rate", badgeLabel: "ALLOTMENT RATE", title: "Allotment Rate %", subtitle: "Allotted lots ÷ applied lots (min. 1 lot)", accentColor: "teal", rows: rRows, isEmpty: rRows.length === 0 },
      { id: "most_offerings", metricId: "most_offerings", badgeLabel: "SYNDICATE PARTICIPATION", title: "Most IPOs Joined", subtitle: "Distinct IPO syndicates participated in", accentColor: "rose", rows: oRows, isEmpty: oRows.length === 0 },
    ];
  }
}

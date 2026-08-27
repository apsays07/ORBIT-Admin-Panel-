import {
  normalizeNumeric,
  safeDivide,
  safeMultiply,
  safeAdd,
  calculateProfit,
  calculateReturnPercentage,
  calculateContributorShare,
  calculateLotsFromContribution,
} from "./financial";

/**
 * Calculate syndicate allotment rate (success percentage).
 * Formula: AllotmentRate % = (AllottedLots / AppliedLots) * 100
 */
export function calculateAllotmentRate(allottedLots: unknown, appliedLots: unknown): number {
  const allotted = normalizeNumeric(allottedLots, 0);
  const applied = normalizeNumeric(appliedLots, 0);
  if (allotted <= 0 || applied <= 0) return 0;
  const ratio = safeDivide(allotted, applied, 0);
  return Number(((allotted / applied) * 100).toFixed(2));
}

/**
 * Calculate member verification percentage.
 * Formula: Verified % = (VerifiedCount / TotalMembers) * 100
 */
export function calculateVerifiedPercentage(verifiedCount: unknown, totalMembers: unknown): number {
  const verified = normalizeNumeric(verifiedCount, 0);
  const total = normalizeNumeric(totalMembers, 0);
  if (total <= 0) return 100;
  const ratio = safeDivide(verified, total, 0);
  return Math.round(safeMultiply(ratio, 100));
}

/**
 * Resolve total PAN card count for an application record.
 */
export function calculateApplicationPanCount(
  panNumbers?: unknown,
  numberOfPanCards?: unknown
): number {
  if (Array.isArray(panNumbers) && panNumbers.length > 0) {
    return panNumbers.length;
  }
  const num = normalizeNumeric(numberOfPanCards, 0);
  return num > 0 ? Math.floor(num) : 1;
}

/**
 * Resolve the number of successfully allotted lots/PANs for an application.
 */
export function calculateAllottedLotsCount(
  status?: string | null,
  allotmentStatus?: string | null,
  allottedIndices?: number[] | null,
  totalPanCount: number = 1
): number {
  if (Array.isArray(allottedIndices) && allottedIndices.length > 0) {
    return allottedIndices.length;
  }
  const isAllotted = status === "ALLOTTED" || allotmentStatus === "ALLOTTED";
  if (isAllotted) {
    return totalPanCount > 0 ? totalPanCount : 1;
  }
  return 0;
}

/**
 * Calculate a member's total deployed capital from their application history.
 * Correctly accounts for solo full contributions and proportional split contributions.
 */
export function calculateMemberDeployedCapital(
  applications: Array<{
    memberId?: string | null;
    totalContribution?: number | null;
    fundingStructure?: string | null;
    contributors?: Array<{ memberId?: string | null; amount?: number | null }> | null;
  }>,
  memberId: string
): number {
  if (!Array.isArray(applications) || !memberId) return 0;

  let totalCapital = 0;
  for (const app of applications) {
    if (app.contributors && Array.isArray(app.contributors) && app.contributors.length > 0) {
      const userContrib = app.contributors.find((c) => c.memberId === memberId);
      if (userContrib) {
        totalCapital = safeAdd(totalCapital, userContrib.amount);
      }
    } else if (app.memberId === memberId) {
      totalCapital = safeAdd(totalCapital, app.totalContribution);
    }
  }

  return totalCapital;
}

/**
 * Calculate a member's total applied lots across all applications.
 */
export function calculateMemberAppliedLots(
  applications: Array<{
    memberId?: string | null;
    numberOfPanCards?: number | null;
    panNumbers?: string[] | null;
    totalContribution?: number | null;
    fundingStructure?: string | null;
    contributors?: Array<{ memberId?: string | null; amount?: number | null }> | null;
  }>,
  memberId: string
): number {
  if (!Array.isArray(applications) || !memberId) return 0;

  let totalLots = 0;
  for (const app of applications) {
    const panCount = calculateApplicationPanCount(app.panNumbers, app.numberOfPanCards);

    if (app.contributors && Array.isArray(app.contributors) && app.contributors.length > 0) {
      const totalAmount = app.contributors.reduce(
        (sum, c) => safeAdd(sum, c.amount),
        0
      ) || normalizeNumeric(app.totalContribution, 1);

      const userContrib = app.contributors.find((c) => c.memberId === memberId);
      if (userContrib) {
        const share = calculateContributorShare(userContrib.amount, totalAmount);
        const approxLots = Math.max(1, Math.round(panCount * share));
        totalLots = safeAdd(totalLots, approxLots);
      }
    } else if (app.memberId === memberId) {
      totalLots = safeAdd(totalLots, panCount);
    }
  }

  return totalLots;
}

export type TimeRangeOption = "7D" | "30D" | "3M" | "6M" | "1Y" | "ALL";
export type AggregationInterval = "DAILY" | "WEEKLY" | "MONTHLY";

export interface HistoricalIpoAnalyticsItem {
  id: string;
  name: string;
  category: string;
  status: string;
  date: string;
  timestamp: number;
  totalApplications: number;
  allottedApplications: number;
  notAllottedApplications: number;
  pendingApplications: number;
  capitalInvested: number;
  realizedProfit: number;
  returnPercentage: number;
  allotmentRate: number;
}

export interface IpoTimelinePoint {
  date: string;
  timestamp: number;
  label: string;
  appliedCount: number;
  allottedCount: number;
  notAllottedCount: number;
  pendingCount: number;
  profit: number;
  cumulativeProfit: number;
  capital: number;
  allotmentRate: number;
  returnRate: number;
  ipoNames: string[];
}

export interface HistoricalPeriodComparison {
  hasComparison: boolean;
  profitGrowthPct: number | null; // e.g. +28.9%
  appliedGrowthPct: number | null; // e.g. +14.2%
  allotmentRateDeltaPp: number | null; // e.g. +4.2 pp (percentage points)
  prevTotalProfit: number;
  prevTotalApplied: number;
  prevAllotmentRate: number;
}

export interface HistoricalInsights {
  peakApplied: { date: string; count: number; name?: string } | null;
  peakAllotted: { date: string; count: number; name?: string } | null;
  bestProfitIpo: { name: string; profit: number; date: string } | null;
  overallAllotmentRate: number;
  hasProfitData: boolean;
}

export interface IpoHistoryAnalyticsData {
  timeRange: TimeRangeOption;
  interval: AggregationInterval;
  kpis: {
    totalIposApplied: number;
    totalApplications: number;
    totalAllotted: number;
    totalNotAllotted: number;
    totalPending: number;
    allotmentRate: number;
    totalCapitalInvested: number;
    totalProfit: number;
    overallReturn: number;
  };
  comparison: HistoricalPeriodComparison;
  insights: HistoricalInsights;
  timeline: IpoTimelinePoint[];
  outcome: {
    applied: number;
    allotted: number;
    notAllotted: number;
    pending: number;
    allotmentRate: number;
    notAllottedRate: number;
    pendingRate: number;
  };
  breakdown: HistoricalIpoAnalyticsItem[];
}

/**
 * Filter an array of items by a specific time range window based on timestamp.
 */
export function filterItemsByTimeRange<T extends { timestamp: number }>(
  items: T[],
  range: TimeRangeOption,
  referenceTimestamp: number = Date.now()
): T[] {
  if (range === "ALL" || !Array.isArray(items)) return items;

  let durationMs = 0;
  switch (range) {
    case "7D":
      durationMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case "30D":
      durationMs = 30 * 24 * 60 * 60 * 1000;
      break;
    case "3M":
      durationMs = 90 * 24 * 60 * 60 * 1000;
      break;
    case "6M":
      durationMs = 180 * 24 * 60 * 60 * 1000;
      break;
    case "1Y":
      durationMs = 365 * 24 * 60 * 60 * 1000;
      break;
    default:
      return items;
  }

  const cutoff = referenceTimestamp - durationMs;
  return items.filter((item) => item.timestamp >= cutoff && item.timestamp <= referenceTimestamp);
}

/**
 * Compute previous equivalent period comparison.
 */
export function computePeriodComparison(
  allItems: HistoricalIpoAnalyticsItem[],
  range: TimeRangeOption,
  referenceTimestamp: number = Date.now()
): HistoricalPeriodComparison {
  if (range === "ALL" || !Array.isArray(allItems) || allItems.length === 0) {
    return {
      hasComparison: false,
      profitGrowthPct: null,
      appliedGrowthPct: null,
      allotmentRateDeltaPp: null,
      prevTotalProfit: 0,
      prevTotalApplied: 0,
      prevAllotmentRate: 0,
    };
  }

  let durationMs = 0;
  switch (range) {
    case "7D":
      durationMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case "30D":
      durationMs = 30 * 24 * 60 * 60 * 1000;
      break;
    case "3M":
      durationMs = 90 * 24 * 60 * 60 * 1000;
      break;
    case "6M":
      durationMs = 180 * 24 * 60 * 60 * 1000;
      break;
    case "1Y":
      durationMs = 365 * 24 * 60 * 60 * 1000;
      break;
  }

  const currentCutoff = referenceTimestamp - durationMs;
  const prevCutoff = currentCutoff - durationMs;

  const currentItems = allItems.filter(
    (item) => item.timestamp >= currentCutoff && item.timestamp <= referenceTimestamp
  );
  const prevItems = allItems.filter(
    (item) => item.timestamp >= prevCutoff && item.timestamp < currentCutoff
  );

  if (prevItems.length === 0 && currentItems.length === 0) {
    return {
      hasComparison: false,
      profitGrowthPct: null,
      appliedGrowthPct: null,
      allotmentRateDeltaPp: null,
      prevTotalProfit: 0,
      prevTotalApplied: 0,
      prevAllotmentRate: 0,
    };
  }

  let currProfit = 0;
  let currApplied = 0;
  let currAllotted = 0;
  for (const it of currentItems) {
    currProfit = safeAdd(currProfit, it.realizedProfit);
    currApplied = safeAdd(currApplied, it.totalApplications);
    currAllotted = safeAdd(currAllotted, it.allottedApplications);
  }

  let prevProfit = 0;
  let prevApplied = 0;
  let prevAllotted = 0;
  for (const it of prevItems) {
    prevProfit = safeAdd(prevProfit, it.realizedProfit);
    prevApplied = safeAdd(prevApplied, it.totalApplications);
    prevAllotted = safeAdd(prevAllotted, it.allottedApplications);
  }

  const currAllotRate = calculateAllotmentRate(currAllotted, currApplied);
  const prevAllotRate = calculateAllotmentRate(prevAllotted, prevApplied);

  const profitGrowthPct =
    prevProfit !== 0
      ? Number((((currProfit - prevProfit) / Math.abs(prevProfit)) * 100).toFixed(1))
      : currProfit > 0
      ? 100
      : null;

  const appliedGrowthPct =
    prevApplied > 0
      ? Number((((currApplied - prevApplied) / prevApplied) * 100).toFixed(1))
      : currApplied > 0
      ? 100
      : null;

  const allotmentRateDeltaPp =
    currApplied > 0 && prevApplied > 0
      ? Number((currAllotRate - prevAllotRate).toFixed(1))
      : null;

  return {
    hasComparison: prevItems.length > 0,
    profitGrowthPct,
    appliedGrowthPct,
    allotmentRateDeltaPp,
    prevTotalProfit: prevProfit,
    prevTotalApplied: prevApplied,
    prevAllotmentRate: prevAllotRate,
  };
}

/**
 * Format interval key for grouping (Daily, Weekly, Monthly).
 */
function getIntervalKey(date: Date, interval: AggregationInterval): { key: string; label: string } {
  if (interval === "MONTHLY") {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    return { key, label };
  }

  if (interval === "WEEKLY") {
    // Start of the week (Sunday/Monday)
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    const key = d.toISOString().split("T")[0];
    const label = `W/o ${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
    return { key, label };
  }

  // DAILY
  const key = date.toISOString().split("T")[0];
  const label = date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return { key, label };
}

/**
 * Aggregate raw IPO and Application records into comprehensive historical analytics.
 */
export function aggregateHistoricalIpos(
  ipos: Array<{
    id: string;
    name: string;
    category?: string;
    status?: string;
    createdAt?: string;
    metrics?: {
      closeDate?: string;
      listingDate?: string;
      openDate?: string;
    };
    profitDistribution?: {
      totalProfit?: number;
      oneLotProfit?: number;
      totalLots?: number;
      allottedLots?: number;
      publishedAt?: string;
    };
  }>,
  applications: Array<{
    id: string;
    ipoId?: string;
    numberOfPanCards?: number;
    panNumbers?: string[];
    totalContribution?: number;
    status?: string;
    allotmentStatus?: string;
    allottedIndices?: number[];
    createdAt?: string;
  }>,
  range: TimeRangeOption = "ALL",
  interval: AggregationInterval = "DAILY",
  referenceTimestamp: number = Date.now()
): IpoHistoryAnalyticsData {
  if (!Array.isArray(ipos) || ipos.length === 0) {
    return {
      timeRange: range,
      interval,
      kpis: {
        totalIposApplied: 0,
        totalApplications: 0,
        totalAllotted: 0,
        totalNotAllotted: 0,
        totalPending: 0,
        allotmentRate: 0,
        totalCapitalInvested: 0,
        totalProfit: 0,
        overallReturn: 0,
      },
      comparison: {
        hasComparison: false,
        profitGrowthPct: null,
        appliedGrowthPct: null,
        allotmentRateDeltaPp: null,
        prevTotalProfit: 0,
        prevTotalApplied: 0,
        prevAllotmentRate: 0,
      },
      insights: {
        peakApplied: null,
        peakAllotted: null,
        bestProfitIpo: null,
        overallAllotmentRate: 0,
        hasProfitData: false,
      },
      timeline: [],
      outcome: {
        applied: 0,
        allotted: 0,
        notAllotted: 0,
        pending: 0,
        allotmentRate: 0,
        notAllottedRate: 0,
        pendingRate: 0,
      },
      breakdown: [],
    };
  }

  // 1. Group applications by IPO
  const appMap = new Map<
    string,
    {
      totalApps: number;
      allottedApps: number;
      pendingApps: number;
      capital: number;
    }
  >();

  if (Array.isArray(applications)) {
    for (const app of applications) {
      if (!app.ipoId) continue;
      const panCount = calculateApplicationPanCount(app.panNumbers, app.numberOfPanCards);
      const allottedCount = calculateAllottedLotsCount(
        app.status,
        app.allotmentStatus,
        app.allottedIndices,
        panCount
      );

      const isPending =
        app.status === "AWAITING" ||
        app.status === "SUBMITTED" ||
        app.allotmentStatus === "AWAITING";

      const contrib = normalizeNumeric(app.totalContribution, 0);

      const cur = appMap.get(app.ipoId) || {
        totalApps: 0,
        allottedApps: 0,
        pendingApps: 0,
        capital: 0,
      };

      cur.totalApps = safeAdd(cur.totalApps, panCount);
      cur.allottedApps = safeAdd(cur.allottedApps, allottedCount);
      if (isPending) {
        cur.pendingApps = safeAdd(cur.pendingApps, panCount);
      }
      cur.capital = safeAdd(cur.capital, contrib);
      appMap.set(app.ipoId, cur);
    }
  }

  // 2. Build IPO-level breakdown items
  const allBreakdown: HistoricalIpoAnalyticsItem[] = ipos.map((ipo) => {
    const rawDate =
      ipo.metrics?.closeDate ||
      ipo.metrics?.listingDate ||
      ipo.profitDistribution?.publishedAt ||
      ipo.metrics?.openDate ||
      ipo.createdAt ||
      "";

    let parsedTs = 0;
    if (rawDate) {
      const parsed = new Date(rawDate).getTime();
      if (!isNaN(parsed)) parsedTs = parsed;
    }

    const appStats = appMap.get(ipo.id) || {
      totalApps: 0,
      allottedApps: 0,
      pendingApps: 0,
      capital: 0,
    };

    const totalApps = appStats.totalApps;
    const allottedApps = appStats.allottedApps;
    const pendingApps = appStats.pendingApps;
    const notAllotted = Math.max(0, totalApps - allottedApps - pendingApps);
    const capital = appStats.capital;
    const profit = normalizeNumeric(ipo.profitDistribution?.totalProfit, 0);
    const retPct = calculateReturnPercentage(profit, capital);
    const allotRate = calculateAllotmentRate(allottedApps, totalApps);

    return {
      id: ipo.id,
      name: ipo.name,
      category: ipo.category || "Mainboard",
      status: ipo.status || "COMPLETED",
      date: rawDate || new Date(parsedTs).toISOString(),
      timestamp: parsedTs,
      totalApplications: totalApps,
      allottedApplications: allottedApps,
      notAllottedApplications: notAllotted,
      pendingApplications: pendingApps,
      capitalInvested: capital,
      realizedProfit: profit,
      returnPercentage: retPct,
      allotmentRate: allotRate,
    };
  });

  // Sort breakdown chronologically ascending
  allBreakdown.sort((a, b) => a.timestamp - b.timestamp);

  // 3. Filter breakdown by time range
  const filteredBreakdown = filterItemsByTimeRange(allBreakdown, range, referenceTimestamp);

  // 4. Compute comparison with previous period
  const comparison = computePeriodComparison(allBreakdown, range, referenceTimestamp);

  // 5. Build timeline points grouped by interval
  const timelineMap = new Map<string, IpoTimelinePoint>();

  for (const item of filteredBreakdown) {
    if (!item.timestamp) continue;
    const d = new Date(item.timestamp);
    const { key, label } = getIntervalKey(d, interval);

    const existing = timelineMap.get(key);
    if (existing) {
      existing.appliedCount = safeAdd(existing.appliedCount, item.totalApplications);
      existing.allottedCount = safeAdd(existing.allottedCount, item.allottedApplications);
      existing.notAllottedCount = safeAdd(existing.notAllottedCount, item.notAllottedApplications);
      existing.pendingCount = safeAdd(existing.pendingCount, item.pendingApplications);
      existing.profit = safeAdd(existing.profit, item.realizedProfit);
      existing.capital = safeAdd(existing.capital, item.capitalInvested);
      existing.allotmentRate = calculateAllotmentRate(existing.allottedCount, existing.appliedCount);
      existing.returnRate = calculateReturnPercentage(existing.profit, existing.capital);
      if (!existing.ipoNames.includes(item.name)) {
        existing.ipoNames.push(item.name);
      }
    } else {
      timelineMap.set(key, {
        date: key,
        timestamp: item.timestamp,
        label,
        appliedCount: item.totalApplications,
        allottedCount: item.allottedApplications,
        notAllottedCount: item.notAllottedApplications,
        pendingCount: item.pendingApplications,
        profit: item.realizedProfit,
        cumulativeProfit: 0,
        capital: item.capitalInvested,
        allotmentRate: item.allotmentRate,
        returnRate: item.returnPercentage,
        ipoNames: [item.name],
      });
    }
  }

  const timeline = Array.from(timelineMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Compute running cumulative profit
  let runningProfit = 0;
  for (const pt of timeline) {
    runningProfit = safeAdd(runningProfit, pt.profit);
    pt.cumulativeProfit = runningProfit;
  }

  // 6. Aggregate KPIs
  let sumApps = 0;
  let sumAllotted = 0;
  let sumPending = 0;
  let sumCapital = 0;
  let sumProfit = 0;
  let peakApplied: HistoricalInsights["peakApplied"] = null;
  let peakAllotted: HistoricalInsights["peakAllotted"] = null;
  let bestProfitIpo: HistoricalInsights["bestProfitIpo"] = null;

  for (const item of filteredBreakdown) {
    sumApps = safeAdd(sumApps, item.totalApplications);
    sumAllotted = safeAdd(sumAllotted, item.allottedApplications);
    sumPending = safeAdd(sumPending, item.pendingApplications);
    sumCapital = safeAdd(sumCapital, item.capitalInvested);
    sumProfit = safeAdd(sumProfit, item.realizedProfit);

    if (!peakApplied || item.totalApplications > peakApplied.count) {
      peakApplied = {
        date: item.date ? new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—",
        count: item.totalApplications,
        name: item.name,
      };
    }

    if (!peakAllotted || item.allottedApplications > peakAllotted.count) {
      peakAllotted = {
        date: item.date ? new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—",
        count: item.allottedApplications,
        name: item.name,
      };
    }

    if (!bestProfitIpo || item.realizedProfit > bestProfitIpo.profit) {
      bestProfitIpo = {
        name: item.name,
        profit: item.realizedProfit,
        date: item.date ? new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—",
      };
    }
  }

  const sumNotAllotted = Math.max(0, sumApps - sumAllotted - sumPending);
  const overallAllotmentRate = calculateAllotmentRate(sumAllotted, sumApps);
  const overallNotAllottedRate = calculateAllotmentRate(sumNotAllotted, sumApps);
  const overallPendingRate = calculateAllotmentRate(sumPending, sumApps);
  const overallReturn = calculateReturnPercentage(sumProfit, sumCapital);

  const insights: HistoricalInsights = {
    peakApplied: peakApplied && peakApplied.count > 0 ? peakApplied : null,
    peakAllotted: peakAllotted && peakAllotted.count > 0 ? peakAllotted : null,
    bestProfitIpo: bestProfitIpo && bestProfitIpo.profit > 0 ? bestProfitIpo : null,
    overallAllotmentRate,
    hasProfitData: filteredBreakdown.some((it) => it.realizedProfit !== 0),
  };

  return {
    timeRange: range,
    interval,
    kpis: {
      totalIposApplied: filteredBreakdown.length,
      totalApplications: sumApps,
      totalAllotted: sumAllotted,
      totalNotAllotted: sumNotAllotted,
      totalPending: sumPending,
      allotmentRate: overallAllotmentRate,
      totalCapitalInvested: sumCapital,
      totalProfit: sumProfit,
      overallReturn,
    },
    comparison,
    insights,
    timeline,
    outcome: {
      applied: sumApps,
      allotted: sumAllotted,
      notAllotted: sumNotAllotted,
      pending: sumPending,
      allotmentRate: overallAllotmentRate,
      notAllottedRate: overallNotAllottedRate,
      pendingRate: overallPendingRate,
    },
    breakdown: [...filteredBreakdown].reverse(), // most recent first for table view
  };
}

/**
 * Premium IPO Operations & Reconciliation Engine.
 * 
 * Answers:
 * 1. WHAT IS WRONG?
 * 2. WHERE IS IT WRONG?
 * 3. HOW MUCH MONEY / HOW MANY LOTS ARE AFFECTED?
 * 4. WHAT ACTION SHOULD THE ADMIN TAKE?
 * 
 * STRICT RULE: All dummy/test PANs matching XUSER...X are completely excluded.
 */

import { ApplicationRecord, MemberRecord } from "@/types/application";
import { NexoIPORecord, ProfitDistribution } from "@/types/ipo";
import { AuditRecord } from "@/types/audit";
import {
  ControlCenterDashboardData,
  ControlCenterIssue,
  ControlCenterKPIs,
  ImpactSummary,
  CapitalReconciliationSummary,
  CapitalDiscrepancyItem,
  LotReconciliationSummary,
  LotDiscrepancyItem,
  PanIntelligenceSummary,
  PanMultiMemberConflict,
  PanAuditTimelineItem,
  Member360Data,
  Application360Data,
  ReconciliationTimelineItem,
  ExplainNumberMetric,
  ExplainNumberBreakdownItem,
  ControlCenterIssueStatus,
  ControlCenterSeverity,
  ApplicationLifecycleStatus,
  IssueStatusOverrideRecord,
} from "@/types/control-center";
import {
  normalizePan,
  isValidNormalizedPan,
  isDummyXuserPan,
  detectIpoApplicantGap,
} from "./gap-detector";
import { formatCurrency, formatLots, formatNumber } from "./formatting";

/**
 * Standardize application lifecycle state
 */
export function mapApplicationLifecycleStatus(
  app: ApplicationRecord,
  ipo?: NexoIPORecord | null
): ApplicationLifecycleStatus {
  const status = (app.status || "").toUpperCase();
  const allotmentStatus = (app.allotmentStatus || "").toUpperCase();
  const isAllotmentFinalized = Boolean(ipo?.allotmentFinalized);
  const isProfitPublished = Boolean(ipo?.profitDistribution?.isPublished || ipo?.isCompleted);

  if (isProfitPublished) {
    if (status === "ALLOTTED" || allotmentStatus === "ALLOTTED") {
      return "SETTLEMENT_COMPLETE";
    }
    return "NOT_ALLOTTED";
  }

  if (status === "ALLOTTED" || allotmentStatus === "ALLOTTED") {
    return "ALLOTTED";
  }

  if (status === "NOT_ALLOTTED" || allotmentStatus === "NOT_ALLOTTED") {
    return "NOT_ALLOTTED";
  }

  if (isAllotmentFinalized) {
    return "ALLOTMENT_PENDING";
  }

  if (status === "AMOUNT_BLOCKED" || status === "MANDATE_APPROVED") {
    return "AMOUNT_BLOCKED";
  }

  if (status === "MANDATE_PENDING" || status === "UPI_MANDATE_PENDING") {
    return "UPI_MANDATE_PENDING";
  }

  if (status === "SUBMITTED") {
    return "SUBMITTED";
  }

  if (status === "AWAITING" || !status) {
    return "AMOUNT_BLOCKED";
  }

  return "APPLICATION_CREATED";
}

/**
 * Extract genuine normalized PANs from an application, strictly excluding dummy XUSER...X PANs
 */
export function extractGenuinePans(panNumbers?: string[] | null): string[] {
  if (!Array.isArray(panNumbers) || panNumbers.length === 0) return [];
  const results: string[] = [];
  for (const raw of panNumbers) {
    const clean = normalizePan(raw);
    if (clean && isValidNormalizedPan(clean) && !isDummyXuserPan(clean)) {
      results.push(clean);
    }
  }
  return Array.from(new Set(results));
}

/**
 * Main Pure Control Center Analysis Engine
 */
export function analyzeControlCenterData({
  allIpos = [],
  allApplications = [],
  allMembers = [],
  profitDistributions = [],
  auditLogs = [],
  statusOverrides = {},
  overridesRecords = [],
  selectedIpoId,
}: {
  allIpos: NexoIPORecord[];
  allApplications: ApplicationRecord[];
  allMembers: MemberRecord[];
  profitDistributions: ProfitDistribution[];
  auditLogs?: AuditRecord[];
  statusOverrides?: Record<string, ControlCenterIssueStatus>;
  overridesRecords?: IssueStatusOverrideRecord[];
  selectedIpoId?: string | null;
}): ControlCenterDashboardData {
  // 1. Resolve Available and Target IPO
  const sortedIpos = [...allIpos].sort((a, b) => {
    const timeA = new Date(a.metrics?.closeDate || a.metrics?.openDate || a.createdAt || "").getTime() || 0;
    const timeB = new Date(b.metrics?.closeDate || b.metrics?.openDate || b.createdAt || "").getTime() || 0;
    return timeB - timeA;
  });

  const availableIpos = sortedIpos.map((i) => ({
    id: i.id,
    name: i.name,
    status: i.status,
    category: i.category,
  }));

  let targetIpo = selectedIpoId ? allIpos.find((i) => i.id === selectedIpoId) || null : null;
  if (!targetIpo && sortedIpos.length > 0) {
    targetIpo = sortedIpos.find((i) => i.status === "APPLICATION_OPEN" || i.status === "OPEN") || sortedIpos[0];
  }

  const targetIpoId = targetIpo ? targetIpo.id : "";
  const targetIpoName = targetIpo ? targetIpo.name : "All IPOs";

  const targetApplications = targetIpo
    ? allApplications.filter((a) => a.ipoId === targetIpo.id)
    : allApplications;

  const memberMap = new Map<string, MemberRecord>();
  for (const m of allMembers) {
    if (m.id) memberMap.set(m.id, m);
    if (m.username) memberMap.set(m.username.toLowerCase(), m);
  }

  const profitMap = new Map<string, ProfitDistribution>();
  for (const p of profitDistributions) {
    if (p.ipoId) profitMap.set(p.ipoId, p);
  }
  if (targetIpo?.profitDistribution?.isPublished) {
    profitMap.set(targetIpo.id, targetIpo.profitDistribution);
  }

  const overrideMap = new Map<string, IssueStatusOverrideRecord>();
  for (const r of overridesRecords) {
    if (r.issueId) overrideMap.set(r.issueId, r);
  }

  // 2. Build Issues Collection
  const detectedIssues: ControlCenterIssue[] = [];

  function addIssue(issue: Omit<ControlCenterIssue, "status" | "resolutionRecord">) {
    const overrideStatus = statusOverrides[issue.id] || "OPEN";
    const resolution = overrideMap.get(issue.id);

    detectedIssues.push({
      ...issue,
      status: overrideStatus,
      resolutionRecord: resolution
        ? {
            resolvedBy: resolution.updatedBy || "admin",
            resolvedAt: resolution.updatedAt,
            actionTaken: resolution.actionTaken || `Marked as ${overrideStatus}`,
            notes: resolution.notes,
            previousValue: resolution.previousValue,
            newValue: resolution.newValue,
            isKnownException: overrideStatus === "KNOWN_EXCEPTION",
          }
        : undefined,
    });
  }

  // 3. Capital Reconciliation
  let totalExpectedCapital = 0;
  let totalAppliedCapital = 0;
  let totalBlockedCapital = 0;
  let totalReleasedCapital = 0;
  let totalAllottedCapital = 0;
  let totalRealizedAmount = 0;
  const capitalDiscrepancies: CapitalDiscrepancyItem[] = [];

  const targetProfit = targetIpo ? profitMap.get(targetIpo.id) : null;
  const minInvestment = Number(targetIpo?.metrics?.minInvestment || 0);

  for (const app of targetApplications) {
    const lots = app.numberOfPanCards || app.panNumbers?.length || 1;
    const appliedCapital = Number(app.totalContribution || 0);
    const expectedCapital = minInvestment > 0 ? lots * minInvestment : appliedCapital;

    totalExpectedCapital += expectedCapital;
    totalAppliedCapital += appliedCapital;

    const isCancelled = app.status === "CANCELLED" || app.status === "REJECTED" || app.status === "DELETED";
    const isAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";
    const isNotAllotted = app.status === "NOT_ALLOTTED" || app.allotmentStatus === "NOT_ALLOTTED";

    let blockedCapital = 0;
    let allottedCapital = 0;
    let releasedCapital = 0;
    let realizedAmount = 0;

    if (!isCancelled) {
      blockedCapital = appliedCapital;
      if (isAllotted) {
        const allottedLotCount = app.allottedIndices?.length || lots;
        allottedCapital = minInvestment > 0 ? allottedLotCount * minInvestment : appliedCapital;
        releasedCapital = appliedCapital - allottedCapital;

        if (targetProfit?.memberPayouts && Array.isArray(targetProfit.memberPayouts)) {
          const payout = targetProfit.memberPayouts.find(
            (p) => p.memberId === app.memberId || (app.panNumbers && app.panNumbers.includes(p.pan || ""))
          );
          if (payout) {
            realizedAmount = allottedCapital + Number(payout.profit || 0);
          } else {
            realizedAmount = allottedCapital;
          }
        } else {
          realizedAmount = allottedCapital;
        }
      } else if (isNotAllotted) {
        allottedCapital = 0;
        releasedCapital = appliedCapital;
        realizedAmount = 0;
      }
    }

    totalBlockedCapital += blockedCapital;
    totalAllottedCapital += allottedCapital;
    totalReleasedCapital += releasedCapital;
    totalRealizedAmount += realizedAmount;

    // Check Contributor Sum Discrepancy in multi-contributor applications
    if (app.contributors && Array.isArray(app.contributors) && app.contributors.length > 0) {
      const contributorSum = app.contributors.reduce((acc, c) => acc + Number(c.amount || 0), 0);
      if (Math.abs(contributorSum - appliedCapital) > 1) {
        const delta = Math.abs(contributorSum - appliedCapital);
        const severity: ControlCenterSeverity = delta >= 50000 ? "CRITICAL" : "HIGH";

        capitalDiscrepancies.push({
          id: `cap_contrib_${app.id}`,
          applicationId: app.id,
          ipoId: app.ipoId,
          ipoName: app.ipoName || targetIpoName,
          memberId: app.memberId,
          memberName: app.applicantName || "Member",
          memberUsername: app.applicantUsername,
          panNumbers: extractGenuinePans(app.panNumbers),
          lots,
          expectedCapital: appliedCapital,
          appliedCapital: contributorSum,
          blockedCapital,
          releasedCapital,
          allottedCapital,
          realizedAmount,
          discrepancy: delta,
          reason: `Contributor breakdown sum (₹${formatNumber(contributorSum)}) does not match registered total (₹${formatNumber(appliedCapital)})`,
        });

        addIssue({
          id: `issue_cap_contrib_${app.id}`,
          severity,
          priorityReason: `Financial delta of ₹${formatNumber(delta)} between contributor sum and total application pool in active bidding.`,
          type: "CAPITAL_MISMATCH",
          title: `Capital Breakdown Mismatch in @${app.applicantUsername || app.applicantName}`,
          exactReason: `Contributor sum is ₹${formatNumber(contributorSum)} while registered contribution is ₹${formatNumber(appliedCapital)}. Difference: ₹${formatNumber(delta)}.`,
          ipoId: app.ipoId,
          ipoName: app.ipoName || targetIpoName,
          memberId: app.memberId,
          memberName: app.applicantName,
          memberUsername: app.applicantUsername,
          applicationId: app.id,
          detectedAt: app.createdAt || new Date().toISOString(),
          affectedAmount: delta,
          expectedValue: appliedCapital,
          actualValue: contributorSum,
          discrepancyDelta: delta,
          recommendedAction: "Review contributor breakdown amounts and adjust the total contribution or individual shares.",
        });
      }
    }

    // Check Expected vs Applied Capital (if IPO has defined minInvestment)
    if (minInvestment > 0 && Math.abs(expectedCapital - appliedCapital) > 1 && !isCancelled) {
      const delta = Math.abs(expectedCapital - appliedCapital);
      const severity: ControlCenterSeverity = delta >= 50000 ? "CRITICAL" : "HIGH";

      capitalDiscrepancies.push({
        id: `cap_diff_${app.id}`,
        applicationId: app.id,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        memberId: app.memberId,
        memberName: app.applicantName || "Member",
        memberUsername: app.applicantUsername,
        panNumbers: extractGenuinePans(app.panNumbers),
        lots,
        expectedCapital,
        appliedCapital,
        blockedCapital,
        releasedCapital,
        allottedCapital,
        realizedAmount,
        discrepancy: delta,
        reason: `Applied capital (₹${formatNumber(appliedCapital)}) deviates from expected lot value (₹${formatNumber(expectedCapital)} for ${lots} lots)`,
      });

      addIssue({
        id: `issue_cap_diff_${app.id}`,
        severity,
        priorityReason: `Direct capital deviation of ₹${formatNumber(delta)} from the official issue price formula (${lots} lots × ₹${formatNumber(minInvestment)}).`,
        type: "CAPITAL_MISMATCH",
        title: `Capital Deviation in Application for @${app.applicantUsername || app.applicantName}`,
        exactReason: `Expected ₹${formatNumber(expectedCapital)} based on ${lots} lots × ₹${formatNumber(minInvestment)}, but recorded amount is ₹${formatNumber(appliedCapital)}.`,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        memberId: app.memberId,
        memberName: app.applicantName,
        memberUsername: app.applicantUsername,
        applicationId: app.id,
        detectedAt: app.createdAt || new Date().toISOString(),
        affectedAmount: delta,
        expectedValue: expectedCapital,
        actualValue: appliedCapital,
        discrepancyDelta: delta,
        recommendedAction: "Update application contribution to reflect the accurate price band or mark as known discount exception.",
      });
    }
  }

  const capitalReconciliation: CapitalReconciliationSummary = {
    expectedCapital: totalExpectedCapital,
    appliedCapital: totalAppliedCapital,
    blockedCapital: totalBlockedCapital,
    releasedCapital: totalReleasedCapital,
    allottedCapital: totalAllottedCapital,
    realizedAmount: totalRealizedAmount,
    netDiscrepancy: totalExpectedCapital - totalAppliedCapital,
    totalDiscrepantRecordsCount: capitalDiscrepancies.length,
    discrepancies: capitalDiscrepancies,
  };

  // 4. Lot Reconciliation
  let totalAppLots = 0;
  let totalConfLots = 0;
  let totalAllotLots = 0;
  let totalProfLots = 0;
  let totalSoldLots = 0;
  const lotDiscrepancies: LotDiscrepancyItem[] = [];

  for (const app of targetApplications) {
    const rawPanCount = app.numberOfPanCards || 1;
    const genuinePans = extractGenuinePans(app.panNumbers);
    const appLots = rawPanCount;

    totalAppLots += appLots;

    const isCancelled = app.status === "CANCELLED" || app.status === "REJECTED" || app.status === "DELETED";
    const isAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";

    const confLots = isCancelled ? 0 : appLots;
    const allotLots = isAllotted ? (app.allottedIndices?.length || appLots) : 0;

    let profLots = 0;
    if (targetProfit?.memberPayouts && Array.isArray(targetProfit.memberPayouts)) {
      const payout = targetProfit.memberPayouts.find(
        (p) => p.memberId === app.memberId || (genuinePans.length > 0 && genuinePans.includes(p.pan || ""))
      );
      if (payout) {
        profLots = Number(payout.lots || 0);
      }
    }

    const soldLots = (targetIpo?.profitDistribution?.isPublished || targetIpo?.isCompleted) ? profLots : 0;

    totalConfLots += confLots;
    totalAllotLots += allotLots;
    totalProfLots += profLots;
    totalSoldLots += soldLots;

    // Check 1: PAN array count mismatch with numberOfPanCards
    if (app.panNumbers && app.panNumbers.length > 0 && app.panNumbers.length !== rawPanCount) {
      const delta = Math.abs(app.panNumbers.length - rawPanCount);
      lotDiscrepancies.push({
        id: `lot_pan_count_${app.id}`,
        applicationId: app.id,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        memberId: app.memberId,
        memberName: app.applicantName || "Member",
        memberUsername: app.applicantUsername,
        panNumbers: genuinePans,
        applicationLots: rawPanCount,
        confirmedLots: confLots,
        allottedLots: allotLots,
        profitLots: profLots,
        soldLots,
        discrepancyDelta: delta,
        reason: `Registered PAN array has ${app.panNumbers.length} entries but numberOfPanCards is set to ${rawPanCount}`,
      });

      addIssue({
        id: `issue_lot_pan_count_${app.id}`,
        severity: "HIGH",
        priorityReason: `Lot count inconsistency directly affects syndicate lot calculations and allotment reconciliation.`,
        type: "LOT_MISMATCH",
        title: `PAN Count Mismatch in Application @${app.applicantUsername || app.applicantName}`,
        exactReason: `Declared lot count (${rawPanCount}) does not match the count of PAN entries attached (${app.panNumbers.length}).`,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        memberId: app.memberId,
        memberName: app.applicantName,
        memberUsername: app.applicantUsername,
        pan: genuinePans[0],
        applicationId: app.id,
        detectedAt: app.createdAt || new Date().toISOString(),
        affectedLots: delta,
        expectedValue: rawPanCount,
        actualValue: app.panNumbers.length,
        discrepancyDelta: delta,
        recommendedAction: "Ensure PAN card array contains exactly one entry per declared lot or adjust numberOfPanCards.",
      });
    }

    // Check 2: Profit lots mismatch with allotted lots
    if (isAllotted && targetProfit?.isPublished && profLots > 0 && profLots !== allotLots) {
      const delta = Math.abs(profLots - allotLots);
      lotDiscrepancies.push({
        id: `lot_profit_mismatch_${app.id}`,
        applicationId: app.id,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        memberId: app.memberId,
        memberName: app.applicantName || "Member",
        memberUsername: app.applicantUsername,
        panNumbers: genuinePans,
        applicationLots: rawPanCount,
        confirmedLots: confLots,
        allottedLots: allotLots,
        profitLots: profLots,
        soldLots,
        discrepancyDelta: delta,
        reason: `Allotment records show ${allotLots} lots allotted, but profit distribution accounted for ${profLots} lots`,
      });

      addIssue({
        id: `issue_lot_profit_mismatch_${app.id}`,
        severity: "CRITICAL",
        priorityReason: `Allotment vs Profit lot mismatch causes incorrect financial payouts to member @${app.applicantUsername || app.applicantName}.`,
        type: "LOT_MISMATCH",
        title: `Allotment vs Profit Lots Mismatch for @${app.applicantUsername || app.applicantName}`,
        exactReason: `Allotment verified ${allotLots} lots, but profit payout calculated on ${profLots} lots. Difference: ${delta} lots.`,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        memberId: app.memberId,
        memberName: app.applicantName,
        memberUsername: app.applicantUsername,
        pan: genuinePans[0],
        applicationId: app.id,
        detectedAt: app.createdAt || new Date().toISOString(),
        affectedLots: delta,
        expectedValue: allotLots,
        actualValue: profLots,
        discrepancyDelta: delta,
        recommendedAction: "Recalculate profit distribution for this member to match registrar verified allotted lots.",
      });
    }
  }

  const lotReconciliation: LotReconciliationSummary = {
    totalApplicationLots: totalAppLots,
    totalConfirmedLots: totalConfLots,
    totalAllottedLots: totalAllotLots,
    totalProfitLots: totalProfLots,
    totalSoldLots: totalSoldLots,
    lotDiscrepantRecordsCount: lotDiscrepancies.length,
    discrepancies: lotDiscrepancies,
  };

  // 5. Duplicate & Orphan & Conflict Detection
  // A. Duplicate PANs inside the target IPO
  const targetPanToApps = new Map<string, ApplicationRecord[]>();
  for (const app of targetApplications) {
    if (app.status === "CANCELLED" || app.status === "REJECTED" || app.status === "DELETED") continue;
    const genuinePans = extractGenuinePans(app.panNumbers);
    for (const pan of genuinePans) {
      const list = targetPanToApps.get(pan) || [];
      list.push(app);
      targetPanToApps.set(pan, list);
    }
  }

  let duplicateApplicationsCount = 0;
  for (const [pan, apps] of targetPanToApps.entries()) {
    if (apps.length > 1) {
      duplicateApplicationsCount += apps.length - 1;
      const usernames = Array.from(new Set(apps.map((a) => a.applicantUsername || a.applicantName || "Unknown"))).join(", ");
      const isSameMember = apps.every((a) => a.memberId === apps[0].memberId);
      const duplicateClassification = isSameMember ? "EXACT_DUPLICATE" : "POSSIBLE_DUPLICATE";
      const totalAmount = apps.reduce((sum, a) => sum + Number(a.totalContribution || 0), 0);

      addIssue({
        id: `issue_dup_pan_${pan}_${targetIpoId}`,
        severity: "CRITICAL",
        priorityReason: `Duplicate PAN submission in the same offering risks syndicate bid rejection by the registrar.`,
        type: "DUPLICATE_PAN",
        title: `Duplicate PAN ${pan} in ${targetIpoName}`,
        exactReason: `PAN card ${pan} is submitted in ${apps.length} distinct applications (${usernames}) for the same offering.`,
        ipoId: targetIpoId,
        ipoName: targetIpoName,
        pan,
        memberId: apps[0].memberId,
        memberName: apps[0].applicantName,
        memberUsername: apps[0].applicantUsername,
        applicationId: apps[0].id,
        detectedAt: apps[apps.length - 1].createdAt || new Date().toISOString(),
        affectedAmount: totalAmount,
        duplicateClassification,
        recommendedAction: "Cancel one of the duplicate applications or merge bids under a single application record.",
        details: { applicationIds: apps.map((a) => a.id), usernames },
      });
    }
  }

  // B. Duplicate Solo Member Applications in the same IPO
  const memberToApps = new Map<string, ApplicationRecord[]>();
  for (const app of targetApplications) {
    if (app.status === "CANCELLED" || app.status === "REJECTED" || app.status === "DELETED") continue;
    if (app.memberId) {
      const list = memberToApps.get(app.memberId) || [];
      list.push(app);
      memberToApps.set(app.memberId, list);
    }
  }
  for (const [memberId, apps] of memberToApps.entries()) {
    if (apps.length > 1 && apps[0].fundingStructure === "SOLO") {
      const member = memberMap.get(memberId);
      addIssue({
        id: `issue_dup_member_${memberId}_${targetIpoId}`,
        severity: "HIGH",
        priorityReason: `Multiple solo applications from the same member may lead to duplicate bidding warnings.`,
        type: "DUPLICATE_APPLICATION",
        title: `Multiple Solo Applications by @${member?.username || apps[0].applicantUsername || memberId}`,
        exactReason: `Member has submitted ${apps.length} separate solo applications for ${targetIpoName}.`,
        ipoId: targetIpoId,
        ipoName: targetIpoName,
        memberId,
        memberName: member?.name || apps[0].applicantName,
        memberUsername: member?.username || apps[0].applicantUsername,
        applicationId: apps[0].id,
        detectedAt: apps[apps.length - 1].createdAt || new Date().toISOString(),
        duplicateClassification: "EXACT_DUPLICATE",
        recommendedAction: "Consolidate multiple solo applications into a single application form.",
      });
    }
  }

  // C. PAN Multi-Member Conflict across entire system
  const panToMemberHistory = new Map<string, Map<string, { memberName: string; memberUsername?: string; count: number; lastIpo: string }>>();
  for (const app of allApplications) {
    const genuinePans = extractGenuinePans(app.panNumbers);
    const mId = app.memberId || app.applicantUsername || app.applicantName || "unknown";
    for (const pan of genuinePans) {
      let memberEntryMap = panToMemberHistory.get(pan);
      if (!memberEntryMap) {
        memberEntryMap = new Map();
        panToMemberHistory.set(pan, memberEntryMap);
      }
      const existing = memberEntryMap.get(mId) || {
        memberName: app.applicantName || "Member",
        memberUsername: app.applicantUsername,
        count: 0,
        lastIpo: app.ipoName || "IPO",
      };
      existing.count += 1;
      existing.lastIpo = app.ipoName || existing.lastIpo;
      memberEntryMap.set(mId, existing);
    }
  }

  const multiMemberConflicts: PanMultiMemberConflict[] = [];
  for (const [pan, membersMap] of panToMemberHistory.entries()) {
    if (membersMap.size > 1) {
      const membersList = Array.from(membersMap.entries()).map(([memberId, data]) => ({
        memberId,
        memberName: data.memberName,
        memberUsername: data.memberUsername,
        applicationCount: data.count,
        lastIpoName: data.lastIpo,
      }));

      multiMemberConflicts.push({
        pan,
        classification: "POSSIBLE_DUPLICATE",
        members: membersList,
      });
    }
  }

  // D. Orphan Applications
  for (const app of targetApplications) {
    if (!app.memberId && !app.applicantUsername && !app.applicantName) {
      addIssue({
        id: `issue_orphan_${app.id}`,
        severity: "HIGH",
        priorityReason: `Unlinked application prevents member notifications, allotment assignment, and profit payout.`,
        type: "ORPHAN_APPLICATION",
        title: `Orphan Application #${app.id.slice(-6)}`,
        exactReason: `Application record exists in database without a linked member profile or applicant identifiers.`,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        applicationId: app.id,
        detectedAt: app.createdAt || new Date().toISOString(),
        recommendedAction: "Link this application to a valid member account or remove invalid draft record.",
      });
    }
  }

  // E. Missing PAN in application
  for (const app of targetApplications) {
    const rawPanCount = app.numberOfPanCards || 1;
    const genuinePans = extractGenuinePans(app.panNumbers);
    if (genuinePans.length === 0 && app.status !== "CANCELLED") {
      addIssue({
        id: `issue_missing_pan_${app.id}`,
        severity: "MEDIUM",
        priorityReason: `Applications without valid PAN cards cannot be submitted for registrar verification.`,
        type: "MISSING_PAN_APPLICATION",
        title: `No Valid PAN Attached to Application @${app.applicantUsername || app.applicantName}`,
        exactReason: `Application declares ${rawPanCount} lot(s) but contains no valid genuine PAN card records.`,
        ipoId: app.ipoId,
        ipoName: app.ipoName || targetIpoName,
        memberId: app.memberId,
        memberName: app.applicantName,
        memberUsername: app.applicantUsername,
        applicationId: app.id,
        detectedAt: app.createdAt || new Date().toISOString(),
        recommendedAction: "Attach genuine 10-character PAN card records to this application.",
      });
    }
  }

  // 6. PAN Intelligence & Gap Engine
  const gapResult = detectIpoApplicantGap({
    allIpos,
    allApplications,
    selectedCurrentIpoId: targetIpoId,
  });

  for (const missing of gapResult.missingApplicants) {
    if (missing.priority === "HIGH") {
      addIssue({
        id: `issue_missing_pan_applicant_${missing.pan}_${targetIpoId}`,
        severity: "MEDIUM",
        priorityReason: `Frequent historical participant (${missing.previousIpoCount} past IPOs) has not submitted bids for active offering.`,
        type: "HISTORICAL_PAN_NOT_APPLIED",
        title: `Frequent Applicant @${missing.memberUsername || missing.memberName} Not Applied`,
        exactReason: `Historical genuine PAN ${missing.pan} participated in ${missing.previousIpoCount} previous IPOs (last: ${missing.lastAppliedIpoName}) but has not applied for ${targetIpoName}.`,
        ipoId: targetIpoId,
        ipoName: targetIpoName,
        pan: missing.pan,
        memberId: missing.memberId,
        memberName: missing.memberName,
        memberUsername: missing.memberUsername,
        detectedAt: missing.lastApplicationDate || new Date().toISOString(),
        recommendedAction: "Send syndicate reminder to member or mark as intentionally skipping this offering.",
        details: { previousIpoCount: missing.previousIpoCount, lastIpo: missing.lastAppliedIpoName },
      });
    }
  }

  const panIntelligence: PanIntelligenceSummary = {
    totalHistoricalGenuinePans: gapResult.historicalUniquePansCount,
    currentApplicantsCount: gapResult.currentIpoApplicantsCount,
    historicalApplicantsReAppliedCount: gapResult.previousPansAppliedToCurrentCount,
    missingGenuinePansCount: gapResult.missingPansCount,
    newApplicantsCount: Math.max(0, gapResult.currentIpoApplicantsCount - gapResult.previousPansAppliedToCurrentCount),
    multiMemberPanConflictsCount: multiMemberConflicts.length,
    duplicatePanApplicationsCount: duplicateApplicationsCount,
    multiMemberConflicts,
    missingGenuinePans: gapResult.missingApplicants.map((m) => ({
      pan: m.pan,
      memberId: m.memberId,
      memberName: m.memberName,
      memberUsername: m.memberUsername,
      previousIposCount: m.previousIpoCount,
      lastIpoName: m.lastAppliedIpoName,
      lastApplicationDate: m.formattedLastDate,
      appliedRecently: m.appliedRecently,
    })),
  };

  // 7. Calculate Aggregated KPIs & Impact Summary
  let pendingActionsCount = 0;
  let mandatesPending = 0;
  let allotmentPending = 0;

  for (const app of targetApplications) {
    const lifecycle = mapApplicationLifecycleStatus(app, targetIpo);
    if (lifecycle === "APPLICATION_CREATED" || lifecycle === "SUBMITTED") {
      pendingActionsCount++;
    }
    if (lifecycle === "UPI_MANDATE_PENDING") {
      mandatesPending++;
    }
    if (lifecycle === "ALLOTMENT_PENDING" || lifecycle === "AMOUNT_BLOCKED") {
      allotmentPending++;
    }
  }

  const activeIssues = detectedIssues.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING");
  const knownExceptions = detectedIssues.filter((i) => i.status === "KNOWN_EXCEPTION");
  const resolvedIssues = detectedIssues.filter((i) => i.status === "RESOLVED");

  let totalCapitalAtRisk = 0;
  const affectedAppIds = new Set<string>();
  const affectedMemberIds = new Set<string>();
  let totalLotsAffected = 0;

  for (const issue of activeIssues) {
    if (issue.affectedAmount) totalCapitalAtRisk += issue.affectedAmount;
    if (issue.applicationId) affectedAppIds.add(issue.applicationId);
    if (issue.memberId || issue.memberUsername) affectedMemberIds.add(issue.memberId || issue.memberUsername!);
    if (issue.affectedLots) totalLotsAffected += issue.affectedLots;
  }

  const criticalSeverityIssuesCount = activeIssues.filter((i) => i.severity === "CRITICAL").length;
  const highSeverityIssuesCount = activeIssues.filter((i) => i.severity === "HIGH").length;
  const mediumSeverityIssuesCount = activeIssues.filter((i) => i.severity === "MEDIUM").length;
  const lowSeverityIssuesCount = activeIssues.filter((i) => i.severity === "LOW").length;

  const impactSummary: ImpactSummary = {
    totalCapitalAtRisk,
    totalApplicationsAffected: affectedAppIds.size,
    totalMembersAffected: affectedMemberIds.size,
    totalLotsAffected,
    criticalIssuesCount: criticalSeverityIssuesCount,
    highIssuesCount: highSeverityIssuesCount,
    mediumIssuesCount: mediumSeverityIssuesCount,
    lowIssuesCount: lowSeverityIssuesCount,
    knownExceptionsCount: knownExceptions.length,
    resolvedIssuesCount: resolvedIssues.length,
  };

  const kpis: ControlCenterKPIs = {
    selectedIpoId: targetIpoId,
    selectedIpoName: targetIpoName,
    totalApplications: targetApplications.length,
    pendingActionsCount,
    capitalAtRisk: totalCapitalAtRisk,
    historicalPansNotApplied: gapResult.missingPansCount,
    duplicateRecordsCount: duplicateApplicationsCount,
    capitalMismatchesCount: capitalDiscrepancies.length,
    lotMismatchesCount: lotDiscrepancies.length,
    mandatesPending,
    allotmentPending,
    totalOpenIssuesCount: activeIssues.length,
    criticalSeverityIssuesCount,
    highSeverityIssuesCount,
    mediumSeverityIssuesCount,
    lowSeverityIssuesCount,
    knownExceptionsCount: knownExceptions.length,
  };

  // Sort issues: Status (OPEN -> INVESTIGATING -> KNOWN_EXCEPTION -> RESOLVED -> IGNORED), then Severity (CRITICAL -> HIGH -> MEDIUM -> LOW)
  const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const statusRank = { OPEN: 0, INVESTIGATING: 1, KNOWN_EXCEPTION: 2, RESOLVED: 3, IGNORED: 4 };

  detectedIssues.sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }
    if (severityRank[a.severity] !== severityRank[b.severity]) {
      return severityRank[a.severity] - severityRank[b.severity];
    }
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  // 8. Reconciliation Timeline Events
  const reconciliationTimeline = generateReconciliationTimeline({
    auditLogs: auditLogs || [],
    detectedIssues,
    selectedIpoName: targetIpoName,
  });

  return {
    kpis,
    impactSummary,
    capitalReconciliation,
    lotReconciliation,
    panIntelligence,
    issues: detectedIssues,
    reconciliationTimeline,
    availableIpos,
    selectedIpoId: targetIpoId,
    selectedIpoName: targetIpoName,
  };
}

/**
 * Build unified Reconciliation Timeline from audit activities and detected issues
 */
export function generateReconciliationTimeline({
  auditLogs = [],
  detectedIssues = [],
  selectedIpoName,
}: {
  auditLogs: AuditRecord[];
  detectedIssues: ControlCenterIssue[];
  selectedIpoName: string;
}): ReconciliationTimelineItem[] {
  const items: ReconciliationTimelineItem[] = [];

  // Convert audit logs
  for (const log of auditLogs.slice(0, 30)) {
    const timestamp = log.createdAt || log.timestamp || new Date().toISOString();
    const eventTypeStr = log.eventType || log.type || "SYSTEM_AUDIT";
    const title = log.title || eventTypeStr.replace(/_/g, " ");
    const description = log.subtitle || "Activity recorded in audit system";
    const isUpdate = eventTypeStr.includes("UPDATE") || eventTypeStr.includes("SUBMIT");

    items.push({
      id: log.id || `act_${Math.random()}`,
      timestamp,
      formattedTime: new Date(timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      title,
      description,
      category: (log.category as any) || "SYSTEM",
      type: isUpdate ? "RECORD_UPDATED" : "SYSTEM_AUDIT",
      actorUsername: log.actorUsername || "admin",
      ipoName: selectedIpoName,
      severity: "LOW",
    });
  }

  // Convert top issues into timeline events
  for (const issue of detectedIssues.slice(0, 15)) {
    items.push({
      id: `timeline_${issue.id}`,
      timestamp: issue.detectedAt,
      formattedTime: new Date(issue.detectedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      title: issue.status === "RESOLVED" ? `Resolved: ${issue.title}` : `Discrepancy: ${issue.title}`,
      description: issue.exactReason,
      category: "RECONCILIATION",
      type: issue.status === "RESOLVED" ? "ISSUE_RESOLVED" : "DISCREPANCY_DETECTED",
      memberUsername: issue.memberUsername,
      ipoName: issue.ipoName,
      severity: issue.severity,
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 25);
}

/**
 * Generate Member 360° Profile View
 */
export function generateMember360({
  memberId,
  allIpos,
  allApplications,
  allMembers,
  profitDistributions,
  detectedIssues,
  selectedIpoId,
}: {
  memberId: string;
  allIpos: NexoIPORecord[];
  allApplications: ApplicationRecord[];
  allMembers: MemberRecord[];
  profitDistributions: ProfitDistribution[];
  detectedIssues: ControlCenterIssue[];
  selectedIpoId?: string | null;
}): Member360Data | null {
  const member =
    allMembers.find((m) => m.id === memberId || m.username.toLowerCase() === memberId.toLowerCase()) || null;

  if (!member) return null;

  const memberApps = allApplications.filter(
    (a) => a.memberId === member.id || (a.applicantUsername && a.applicantUsername.toLowerCase() === member.username.toLowerCase())
  );

  const ipoMap = new Map<string, NexoIPORecord>(allIpos.map((i) => [i.id, i]));
  const currentIpoApps: Member360Data["currentIpoApplications"] = [];
  const previousIpoHistory: Member360Data["previousIpoHistory"] = [];

  let totalCapitalDeployed = 0;
  let currentBlockedCapital = 0;
  let totalAllottedLots = 0;
  let totalProfitRealized = 0;
  const participatedIpoIds = new Set<string>();

  for (const app of memberApps) {
    const ipo = ipoMap.get(app.ipoId);
    const ipoName = app.ipoName || ipo?.name || "IPO";
    const amount = Number(app.totalContribution || 0);
    const lots = app.numberOfPanCards || 1;
    const isAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";

    totalCapitalDeployed += amount;
    participatedIpoIds.add(app.ipoId);

    if (isAllotted) {
      totalAllottedLots += app.allottedIndices?.length || lots;
    }

    if (app.ipoId === selectedIpoId) {
      if (app.status !== "CANCELLED" && app.status !== "REJECTED") {
        currentBlockedCapital += amount;
      }
      currentIpoApps.push({
        id: app.id,
        ipoId: app.ipoId,
        ipoName,
        lots,
        amount,
        panNumbers: extractGenuinePans(app.panNumbers),
        status: app.status,
        allotmentStatus: app.allotmentStatus,
        createdAt: app.createdAt,
      });
    } else {
      let profit = 0;
      const profitDist = profitDistributions.find((p) => p.ipoId === app.ipoId);
      if (profitDist?.memberPayouts) {
        const payout = profitDist.memberPayouts.find((p) => p.memberId === member.id || (app.panNumbers && app.panNumbers.includes(p.pan || "")));
        if (payout) {
          profit = Number(payout.profit || 0);
          totalProfitRealized += profit;
        }
      }

      previousIpoHistory.push({
        ipoId: app.ipoId,
        ipoName,
        lots,
        amount,
        status: app.status,
        isAllotted,
        profit,
        date: app.createdAt || "",
      });
    }
  }

  // 7-step member lifecycle timeline
  const activeCurrentApp = currentIpoApps[0];
  const targetIpo = selectedIpoId ? ipoMap.get(selectedIpoId) : null;
  const lifecycleTimeline: Member360Data["lifecycleTimeline"] = [
    {
      title: "IPO Application",
      status: activeCurrentApp ? "COMPLETE" : "PENDING",
      description: activeCurrentApp
        ? `Application #${activeCurrentApp.id.slice(-6)} created with ${activeCurrentApp.lots} lot(s)`
        : "No application registered for this offering yet",
      timestamp: activeCurrentApp?.createdAt,
    },
    {
      title: "UPI / ASBA Mandate",
      status: activeCurrentApp?.status === "UPI_MANDATE_PENDING" ? "CURRENT" : activeCurrentApp ? "COMPLETE" : "PENDING",
      description: activeCurrentApp
        ? `Mandate status: ${activeCurrentApp.status}`
        : "Awaiting submission",
    },
    {
      title: "Capital Blocked",
      status: currentBlockedCapital > 0 ? "COMPLETE" : "PENDING",
      description: currentBlockedCapital > 0
        ? `₹${formatNumber(currentBlockedCapital)} secured under ASBA hold`
        : "Funds unblocked / awaiting registration",
    },
    {
      title: "Registrar Allotment",
      status: targetIpo?.allotmentFinalized
        ? activeCurrentApp?.status === "ALLOTTED" ? "COMPLETE" : "ALERT"
        : "PENDING",
      description: targetIpo?.allotmentFinalized
        ? activeCurrentApp?.status === "ALLOTTED" ? "Allotment confirmed positive" : "Not allotted"
        : "Awaiting registrar basis of allotment",
    },
    {
      title: "Shares Credited",
      status: activeCurrentApp?.status === "ALLOTTED" ? "COMPLETE" : "PENDING",
      description: activeCurrentApp?.status === "ALLOTTED"
        ? "Depository credit confirmed"
        : "Pending allotment",
    },
    {
      title: "Market Sale & Listing",
      status: targetIpo?.isCompleted ? "COMPLETE" : "PENDING",
      description: targetIpo?.isCompleted
        ? "Listing day liquidation executed"
        : "Awaiting listing day trading",
    },
    {
      title: "Syndicate Profit Settlement",
      status: targetIpo?.profitDistribution?.isPublished ? "COMPLETE" : "PENDING",
      description: targetIpo?.profitDistribution?.isPublished
        ? `Payout verified across ${totalAllottedLots} allotted lots`
        : "Awaiting profit calculation and distribution",
    },
  ];

  const activeIssues = detectedIssues.filter(
    (i) => (i.memberId === member.id || i.memberUsername === member.username) && (i.status === "OPEN" || i.status === "INVESTIGATING")
  );

  return {
    memberId: member.id,
    name: member.name,
    username: member.username,
    role: member.role,
    status: member.status,
    panMasked: member.panMasked,
    panFull: member.panFull,
    totalCapitalDeployed,
    currentBlockedCapital,
    totalAllottedLots,
    totalProfitRealized,
    totalIposParticipated: participatedIpoIds.size,
    activeIssuesCount: activeIssues.length,
    activeIssues,
    currentIpoApplications: currentIpoApps,
    previousIpoHistory: previousIpoHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    lifecycleTimeline,
  };
}

/**
 * Generate Application 360° View with 5-Point Data Consistency Checklist
 */
export function generateApplication360({
  applicationId,
  allIpos,
  allApplications,
  allMembers,
  profitDistributions,
  detectedIssues,
}: {
  applicationId: string;
  allIpos: NexoIPORecord[];
  allApplications: ApplicationRecord[];
  allMembers: MemberRecord[];
  profitDistributions: ProfitDistribution[];
  detectedIssues: ControlCenterIssue[];
}): Application360Data | null {
  const app = allApplications.find((a) => a.id === applicationId);
  if (!app) return null;

  const ipo = allIpos.find((i) => i.id === app.ipoId);
  const member = allMembers.find((m) => m.id === app.memberId || (m.username && app.applicantUsername && m.username.toLowerCase() === app.applicantUsername.toLowerCase()));
  const genuinePans = extractGenuinePans(app.panNumbers);

  const minInvestment = Number(ipo?.metrics?.minInvestment || 0);
  const lots = app.numberOfPanCards || 1;
  const expectedContribution = minInvestment > 0 ? lots * minInvestment : Number(app.totalContribution || 0);
  const actualContribution = Number(app.totalContribution || 0);

  const isAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";
  const allottedLots = isAllotted ? (app.allottedIndices?.length || lots) : 0;

  let profitLots = 0;
  let realizedProfit: number | undefined = undefined;

  const profitDist = profitDistributions.find((p) => p.ipoId === app.ipoId);
  if (profitDist?.memberPayouts) {
    const payout = profitDist.memberPayouts.find((p) => p.memberId === app.memberId || (genuinePans.length > 0 && genuinePans.includes(p.pan || "")));
    if (payout) {
      profitLots = Number(payout.lots || 0);
      realizedProfit = Number(payout.profit || 0);
    }
  }

  // 5-Point Data Consistency Checklist
  const consistencyChecklist: Application360Data["consistencyChecklist"] = [
    {
      label: "PAN Validity",
      status: genuinePans.length > 0 ? "PASS" : "FAIL",
      message: genuinePans.length > 0
        ? `${genuinePans.length} verified genuine PAN card(s) attached`
        : "No valid genuine PAN attached to application",
    },
    {
      label: "Member Linkage",
      status: member ? "PASS" : "FAIL",
      message: member
        ? `Linked to verified member profile @${member.username}`
        : "Orphan record — unlinked to valid member ID",
    },
    {
      label: "Capital Accuracy",
      status: Math.abs(expectedContribution - actualContribution) <= 1 ? "PASS" : "FAIL",
      message: Math.abs(expectedContribution - actualContribution) <= 1
        ? `Contribution (₹${formatNumber(actualContribution)}) matches lot cost formula`
        : `Deviation of ₹${formatNumber(Math.abs(expectedContribution - actualContribution))} from expected ₹${formatNumber(expectedContribution)}`,
    },
    {
      label: "Lot Consistency",
      status: app.panNumbers && app.panNumbers.length > 0 && app.panNumbers.length !== lots ? "WARN" : "PASS",
      message: app.panNumbers && app.panNumbers.length > 0 && app.panNumbers.length !== lots
        ? `Declared ${lots} lots but attached ${app.panNumbers.length} PAN entries`
        : `Consistent declared lot quantity (${lots} lots)`,
    },
    {
      label: "Offering Synchronization",
      status: ipo ? "PASS" : "FAIL",
      message: ipo ? `Synchronized with ${ipo.name}` : "IPO offering not found in database",
    },
  ];

  const relatedIssues = detectedIssues.filter((i) => i.applicationId === app.id);

  return {
    applicationId: app.id,
    ipoId: app.ipoId,
    ipoName: app.ipoName || ipo?.name || "IPO",
    memberId: app.memberId,
    applicantName: app.applicantName || member?.name || "Member",
    applicantUsername: app.applicantUsername || member?.username,
    fundingStructure: app.fundingStructure || "SOLO",
    numberOfPanCards: lots,
    panNumbers: genuinePans,
    totalContribution: actualContribution,
    expectedContribution,
    status: app.status,
    allotmentStatus: app.allotmentStatus,
    allottedLots,
    profitLots,
    realizedProfit,
    createdAt: app.createdAt,
    consistencyChecklist,
    relatedIssues,
  };
}

/**
 * Generate PAN Audit Timeline ("Why is this PAN listed?")
 */
export function generatePanAuditTimeline({
  pan,
  allIpos,
  allApplications,
  allMembers,
  selectedIpoId,
}: {
  pan: string;
  allIpos: NexoIPORecord[];
  allApplications: ApplicationRecord[];
  allMembers: MemberRecord[];
  selectedIpoId?: string | null;
}): PanAuditTimelineItem | null {
  const cleanPan = normalizePan(pan);
  if (!cleanPan || isDummyXuserPan(cleanPan)) return null;

  const ipoMap = new Map<string, NexoIPORecord>(allIpos.map((i) => [i.id, i]));
  const relevantApps = allApplications.filter((a) => {
    const pans = extractGenuinePans(a.panNumbers);
    return pans.includes(cleanPan);
  });

  const timeline: PanAuditTimelineItem["timeline"] = [];
  let isAppliedInCurrentIpo = false;
  let currentIpoStatus = "Not Applied";
  let lastDate = "";
  let memberName = "Member";
  let memberUsername: string | undefined = undefined;

  for (const app of relevantApps) {
    const ipo = ipoMap.get(app.ipoId);
    const ipoName = app.ipoName || ipo?.name || "IPO";
    const date = app.createdAt || ipo?.metrics?.closeDate || "";
    const isAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";

    if (app.applicantName && app.applicantName !== "Member") memberName = app.applicantName;
    if (app.applicantUsername) memberUsername = app.applicantUsername;

    if (app.ipoId === selectedIpoId) {
      isAppliedInCurrentIpo = true;
      currentIpoStatus = app.status;
    }

    timeline.push({
      ipoId: app.ipoId,
      ipoName,
      applicationDate: date,
      lots: app.numberOfPanCards || 1,
      status: app.status,
      isAllotted,
      totalContribution: Number(app.totalContribution || 0),
    });

    if (date > lastDate) {
      lastDate = date;
    }
  }

  timeline.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());

  return {
    pan: cleanPan,
    memberName,
    memberUsername,
    totalHistoricalIpos: new Set(relevantApps.map((a) => a.ipoId)).size,
    lastApplicationDate: lastDate,
    isAppliedInCurrentIpo,
    currentIpoStatus,
    timeline,
  };
}

/**
 * Generate "Explain This Number" dynamic itemized breakdown from real records
 */
export function generateMetricExplanation({
  metricKey,
  allIpos,
  allApplications,
  selectedIpoId,
}: {
  metricKey: string;
  allIpos: NexoIPORecord[];
  allApplications: ApplicationRecord[];
  selectedIpoId?: string | null;
}): ExplainNumberMetric {
  const targetIpo = selectedIpoId ? allIpos.find((i) => i.id === selectedIpoId) || null : allIpos[0] || null;
  const targetApps = targetIpo ? allApplications.filter((a) => a.ipoId === targetIpo.id) : allApplications;
  const ipoName = targetIpo ? targetIpo.name : "All IPOs";

  switch (metricKey) {
    case "applied_capital": {
      const items: ExplainNumberBreakdownItem[] = targetApps
        .map((app) => ({
          id: app.id,
          label: app.applicantUsername ? `@${app.applicantUsername}` : app.applicantName || "Member",
          subLabel: `${app.numberOfPanCards || 1} lot(s) • ${extractGenuinePans(app.panNumbers).join(", ") || "No PAN"}`,
          value: Number(app.totalContribution || 0),
          formattedValue: `₹${formatNumber(app.totalContribution || 0)}`,
          memberUsername: app.applicantUsername,
          pan: extractGenuinePans(app.panNumbers)[0],
          ipoName: app.ipoName || ipoName,
          statusBadge: app.status,
        }))
        .sort((a, b) => b.value - a.value);

      const total = items.reduce((sum, item) => sum + item.value, 0);
      items.forEach((item) => {
        item.percentageOfTotal = total > 0 ? (item.value / total) * 100 : 0;
      });

      return {
        metricKey,
        title: "Total Applied Capital",
        subtitle: `Calculated from ${items.length} applications in ${ipoName}`,
        totalValue: total,
        formattedTotalValue: formatCurrency(total),
        formulaDescription: "Sum of actual financial contributions (totalContribution) registered across all active applications for this offering.",
        breakdownCount: items.length,
        breakdownItems: items,
      };
    }

    case "total_applications": {
      const items: ExplainNumberBreakdownItem[] = targetApps.map((app) => ({
        id: app.id,
        label: app.applicantUsername ? `@${app.applicantUsername}` : app.applicantName || "Member",
        subLabel: `${app.fundingStructure || "SOLO"} • Created ${app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "—"}`,
        value: Number(app.numberOfPanCards || 1),
        formattedValue: `${app.numberOfPanCards || 1} lots`,
        memberUsername: app.applicantUsername,
        pan: extractGenuinePans(app.panNumbers)[0],
        ipoName: app.ipoName || ipoName,
        statusBadge: app.status,
      }));

      const totalLots = items.reduce((sum, item) => sum + item.value, 0);

      return {
        metricKey,
        title: "Total Applications",
        subtitle: `${items.length} application forms submitted (${totalLots} total lots)`,
        totalValue: items.length,
        formattedTotalValue: `${items.length} Applications`,
        formulaDescription: "Count of all distinct application records created in the database for the selected offering.",
        breakdownCount: items.length,
        breakdownItems: items,
      };
    }

    case "blocked_capital": {
      const items: ExplainNumberBreakdownItem[] = targetApps
        .filter((a) => a.status !== "CANCELLED" && a.status !== "REJECTED")
        .map((app) => ({
          id: app.id,
          label: app.applicantUsername ? `@${app.applicantUsername}` : app.applicantName || "Member",
          subLabel: `Bidding Active • ${app.numberOfPanCards || 1} lot(s)`,
          value: Number(app.totalContribution || 0),
          formattedValue: `₹${formatNumber(app.totalContribution || 0)}`,
          memberUsername: app.applicantUsername,
          pan: extractGenuinePans(app.panNumbers)[0],
          ipoName: app.ipoName || ipoName,
          statusBadge: app.status,
        }))
        .sort((a, b) => b.value - a.value);

      const total = items.reduce((sum, item) => sum + item.value, 0);

      return {
        metricKey,
        title: "Total Blocked Capital",
        subtitle: `Funds currently locked in ASBA/UPI mandate across ${items.length} applications`,
        totalValue: total,
        formattedTotalValue: formatCurrency(total),
        formulaDescription: "Sum of total contributions for non-cancelled applications currently under active bidding awaiting allotment or refund.",
        breakdownCount: items.length,
        breakdownItems: items,
      };
    }

    case "allotted_capital": {
      const items: ExplainNumberBreakdownItem[] = targetApps
        .filter((a) => a.status === "ALLOTTED" || a.allotmentStatus === "ALLOTTED")
        .map((app) => ({
          id: app.id,
          label: app.applicantUsername ? `@${app.applicantUsername}` : app.applicantName || "Member",
          subLabel: `Allotted: ${app.allottedIndices?.length || app.numberOfPanCards || 1} lot(s)`,
          value: Number(app.totalContribution || 0),
          formattedValue: `₹${formatNumber(app.totalContribution || 0)}`,
          memberUsername: app.applicantUsername,
          pan: extractGenuinePans(app.panNumbers)[0],
          ipoName: app.ipoName || ipoName,
          statusBadge: "ALLOTTED",
        }))
        .sort((a, b) => b.value - a.value);

      const total = items.reduce((sum, item) => sum + item.value, 0);

      return {
        metricKey,
        title: "Total Allotted Capital",
        subtitle: `Capital successfully converted into allotted IPO shares across ${items.length} applications`,
        totalValue: total,
        formattedTotalValue: formatCurrency(total),
        formulaDescription: "Total capital deployed in applications verified with positive allotment by the registrar.",
        breakdownCount: items.length,
        breakdownItems: items,
      };
    }

    case "missing_pans": {
      const gap = detectIpoApplicantGap({
        allIpos,
        allApplications,
        selectedCurrentIpoId: targetIpo?.id,
      });

      const items: ExplainNumberBreakdownItem[] = gap.missingApplicants.map((m) => ({
        id: m.pan,
        label: m.memberUsername ? `@${m.memberUsername}` : m.memberName,
        subLabel: `PAN: ${m.pan} • Participated in ${m.previousIpoCount} past IPOs (Last: ${m.lastAppliedIpoName})`,
        value: m.previousIpoCount,
        formattedValue: `${m.previousIpoCount} previous IPOs`,
        memberUsername: m.memberUsername,
        pan: m.pan,
        ipoName: m.lastAppliedIpoName,
        statusBadge: m.priority,
      }));

      return {
        metricKey,
        title: "Previous Applicants Not Applied",
        subtitle: `${items.length} genuine historical PAN cards have not applied for ${ipoName}`,
        totalValue: items.length,
        formattedTotalValue: `${items.length} Missing PANs`,
        formulaDescription: "Historical Unique PANs (excluding dummy XUSER...X) minus PANs already registered in this IPO = Missing Previous Applicants.",
        breakdownCount: items.length,
        breakdownItems: items,
      };
    }

    case "total_lots": {
      const items: ExplainNumberBreakdownItem[] = targetApps.map((app) => ({
        id: app.id,
        label: app.applicantUsername ? `@${app.applicantUsername}` : app.applicantName || "Member",
        subLabel: `${extractGenuinePans(app.panNumbers).join(", ") || "No PAN"}`,
        value: Number(app.numberOfPanCards || 1),
        formattedValue: `${app.numberOfPanCards || 1} lots`,
        memberUsername: app.applicantUsername,
        pan: extractGenuinePans(app.panNumbers)[0],
        ipoName: app.ipoName || ipoName,
        statusBadge: app.status,
      }));

      const totalLots = items.reduce((sum, item) => sum + item.value, 0);

      return {
        metricKey,
        title: "Total Application Lots",
        subtitle: `Total cumulative lots across ${items.length} applications in ${ipoName}`,
        totalValue: totalLots,
        formattedTotalValue: formatLots(totalLots),
        formulaDescription: "Sum of declared numberOfPanCards across all applications for this offering.",
        breakdownCount: items.length,
        breakdownItems: items,
      };
    }

    default:
      return {
        metricKey,
        title: "Metric Details",
        subtitle: `Itemized breakdown for ${ipoName}`,
        totalValue: 0,
        formattedTotalValue: "0",
        formulaDescription: "Calculated from live database records.",
        breakdownCount: 0,
        breakdownItems: [],
      };
  }
}

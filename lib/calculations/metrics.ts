import {
  normalizeNumeric,
  safeDivide,
  safeMultiply,
  safeAdd,
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
  return Math.round(safeMultiply(ratio, 100));
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

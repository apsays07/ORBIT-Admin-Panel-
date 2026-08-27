/**
 * Centralized, authoritative financial calculations for Orbit.
 * 
 * Rules:
 * 1. Never rely on raw floating-point arithmetic for financial operations.
 * 2. Never return NaN, Infinity, or undefined.
 * 3. Keep raw numeric calculations strictly separate from display formatting.
 * 4. Normalization occurs before calculation, rounding occurs only at presentation.
 */

/**
 * Safely parse any input into a valid finite number.
 * Returns `fallback` (default 0) if the value cannot be parsed or is non-finite.
 */
export function normalizeNumeric(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return fallback;
    // Strip common currency symbols, commas, and percentage signs if present in inputs
    const cleaned = trimmed.replace(/[₹$,%\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return fallback;
}

/**
 * Safe floating-point addition using fixed precision scaling (to avoid 0.1 + 0.2 issues).
 */
export function safeAdd(a: unknown, b: unknown): number {
  const numA = normalizeNumeric(a, 0);
  const numB = normalizeNumeric(b, 0);
  return Math.round((numA + numB) * 1000000) / 1000000;
}

/**
 * Safe floating-point subtraction using fixed precision scaling.
 */
export function safeSubtract(a: unknown, b: unknown): number {
  const numA = normalizeNumeric(a, 0);
  const numB = normalizeNumeric(b, 0);
  return Math.round((numA - numB) * 1000000) / 1000000;
}

/**
 * Safe floating-point multiplication using fixed precision scaling.
 */
export function safeMultiply(a: unknown, b: unknown): number {
  const numA = normalizeNumeric(a, 0);
  const numB = normalizeNumeric(b, 0);
  return Math.round((numA * numB) * 1000000) / 1000000;
}

/**
 * Safe division that guarantees 0 on divide-by-zero or non-finite results.
 */
export function safeDivide(numerator: unknown, denominator: unknown, fallback: number = 0): number {
  const num = normalizeNumeric(numerator, 0);
  const den = normalizeNumeric(denominator, 0);
  if (den === 0 || !Number.isFinite(den)) return fallback;
  const result = num / den;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Sum an array of monetary / numeric values safely.
 */
export function sumMonetaryValues(values: unknown[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce<number>((acc, curr) => safeAdd(acc, curr), 0);
}

/**
 * Calculate net profit or loss.
 * Formula: Profit = Current Value - Invested Capital
 */
export function calculateProfit(currentValue: unknown, investedCapital: unknown): number {
  return safeSubtract(currentValue, investedCapital);
}

/**
 * Calculate percentage return on investment.
 * Formula: Return % = (Profit / Invested Capital) * 100
 */
export function calculateReturnPercentage(profit: unknown, investedCapital: unknown): number {
  const p = normalizeNumeric(profit, 0);
  const c = normalizeNumeric(investedCapital, 0);
  if (c <= 0) return 0;
  const rawRatio = safeDivide(p, c, 0);
  return safeMultiply(rawRatio, 100);
}

/**
 * Calculate per-lot profit for an IPO syndicate distribution.
 * Formula: PerLotProfit = floor(RealizedProfit / TotalAppliedLots)
 * 
 * Note: integer floor is standard in syndicate allocations to ensure total distributed profit
 * never exceeds total realized profit.
 */
export function calculatePerLotProfit(realizedProfit: unknown, totalAppliedLots: unknown): number {
  const profit = normalizeNumeric(realizedProfit, 0);
  const lots = normalizeNumeric(totalAppliedLots, 0);
  if (profit <= 0 || lots <= 0) return 0;
  return Math.floor(safeDivide(profit, lots, 0));
}

/**
 * Calculate individual member payout profit based on lots held and per-lot profit rate.
 * Formula: MemberProfit = round(MemberLots * PerLotProfit)
 */
export function calculateMemberPayoutProfit(lots: unknown, perLotProfit: unknown): number {
  const numLots = normalizeNumeric(lots, 0);
  const rate = normalizeNumeric(perLotProfit, 0);
  if (numLots <= 0 || rate <= 0) return 0;
  return Math.round(safeMultiply(numLots, rate));
}

/**
 * Calculate effective lot count from monetary contribution and min investment per lot.
 * Formula: Lots = contribution / minInvestment
 */
export function calculateLotsFromContribution(contribution: unknown, minInvestmentPerLot: unknown): number {
  const contrib = normalizeNumeric(contribution, 0);
  const minInv = normalizeNumeric(minInvestmentPerLot, 15000);
  if (contrib <= 0 || minInv <= 0) return 0;
  return safeDivide(contrib, minInv, 0);
}

/**
 * Calculate a contributor's proportional share in a multi-friend application.
 * Formula: Share = ContributorAmount / TotalApplicationAmount
 */
export function calculateContributorShare(contributorAmount: unknown, totalApplicationAmount: unknown): number {
  const part = normalizeNumeric(contributorAmount, 0);
  const total = normalizeNumeric(totalApplicationAmount, 0);
  if (part <= 0 || total <= 0) return 0;
  return safeDivide(part, total, 0);
}

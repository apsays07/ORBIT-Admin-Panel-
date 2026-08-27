import { normalizeNumeric, safeAdd, safeSubtract } from "./financial";

export interface ReconciliationResult {
  isValid: boolean;
  expected: number;
  actual: number;
  difference: number;
  details?: string;
}

/**
 * Reconcile a declared total against the computed sum of individual parts.
 */
export function reconcileTotals(
  expectedTotal: unknown,
  items: unknown[],
  tolerance: number = 0.01
): ReconciliationResult {
  const expected = normalizeNumeric(expectedTotal, 0);
  let actual = 0;

  if (Array.isArray(items)) {
    for (const item of items) {
      if (typeof item === "number" || typeof item === "string") {
        actual = safeAdd(actual, item);
      } else if (item && typeof item === "object") {
        const val = (item as any).amount ?? (item as any).profit ?? (item as any).contribution ?? (item as any).value ?? 0;
        actual = safeAdd(actual, val);
      }
    }
  }

  const difference = Math.abs(safeSubtract(actual, expected));
  const isValid = difference <= tolerance;

  return {
    isValid,
    expected,
    actual,
    difference,
    details: isValid
      ? "Reconciliation passed."
      : `Reconciliation mismatch: expected ${expected}, got ${actual} (difference: ${difference}).`,
  };
}

/**
 * Reconcile profit distribution payouts against total realized syndicate profit.
 */
export function reconcileProfitDistribution(
  realizedProfit: unknown,
  memberPayouts: Array<{ profit?: number | null; memberId?: string }>
): ReconciliationResult {
  const expected = normalizeNumeric(realizedProfit, 0);
  let totalDistributed = 0;

  if (Array.isArray(memberPayouts)) {
    for (const p of memberPayouts) {
      totalDistributed = safeAdd(totalDistributed, p.profit);
    }
  }

  // Payouts might have minor integer floor rounding differences across lots
  const difference = safeSubtract(expected, totalDistributed);
  const isValid = totalDistributed <= expected && difference >= 0;

  return {
    isValid,
    expected,
    actual: totalDistributed,
    difference,
    details: isValid
      ? `Distributed ₹${totalDistributed} of ₹${expected} realized profit.`
      : `Payout overflow: distributed ₹${totalDistributed} exceeds realized profit ₹${expected}.`,
  };
}

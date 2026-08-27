import { normalizeNumeric } from "./financial";

export interface RankedItem<T> {
  rank: number;
  rawValue: number;
  item: T;
}

/**
 * Deterministically rank a collection of items based on a numeric metric.
 * 
 * Rules:
 * 1. Primary order is descending by raw numeric metric value.
 * 2. Secondary tie-breaker handles identical values deterministically (e.g. alphanumeric ID/name).
 * 3. Never produces undefined or random rank ordering.
 */
export function calculateRankings<T>(
  items: T[],
  valueExtractor: (item: T) => number | string | null | undefined,
  secondaryComparator?: (a: T, b: T) => number
): Array<T & { rank: number; rawValue: number }> {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Extract raw numeric values
  const prepared = items.map((item) => ({
    item,
    rawValue: normalizeNumeric(valueExtractor(item), 0),
  }));

  // Sort descending by value, with deterministic tie-breaker
  prepared.sort((a, b) => {
    if (b.rawValue !== a.rawValue) {
      return b.rawValue - a.rawValue;
    }
    if (secondaryComparator) {
      return secondaryComparator(a.item, b.item);
    }
    return 0;
  });

  // Assign sequential 1-based ranks
  return prepared.map((entry, index) => ({
    ...entry.item,
    rawValue: entry.rawValue,
    rank: index + 1,
  }));
}

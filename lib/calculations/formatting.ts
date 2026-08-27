import { normalizeNumeric } from "./financial";

/**
 * Format a numeric amount as Indian Rupees (INR) currency string.
 * This function ONLY formats and NEVER alters underlying numeric data.
 * 
 * Examples:
 * - 15000 -> "₹15,000"
 * - 15000.5 -> "₹15,000.50" (if decimals specified)
 * - 0 -> "₹0"
 * - null/undefined -> "₹0"
 */
export function formatCurrency(
  amount: unknown,
  options: {
    showPrefix?: boolean;
    decimals?: number;
    fallback?: string;
  } = {}
): string {
  const { showPrefix = true, decimals, fallback = "—" } = options;

  if (amount === null || amount === undefined || (typeof amount === "string" && amount.trim() === "")) {
    return fallback;
  }

  const num = normalizeNumeric(amount, 0);
  const prefix = showPrefix ? "₹" : "";

  const formatted = decimals !== undefined
    ? num.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : num.toLocaleString("en-IN");

  return `${prefix}${formatted}`;
}

/**
 * Format a numeric percentage string safely.
 * 
 * Examples:
 * - 12 -> "12%"
 * - 12.55 -> "+12.55%" (with showPlus: true)
 * - 0 -> "0%"
 */
export function formatPercentage(
  rate: unknown,
  options: {
    decimals?: number;
    showPlus?: boolean;
    fallback?: string;
  } = {}
): string {
  const { decimals, showPlus = false, fallback = "0%" } = options;

  if (rate === null || rate === undefined || (typeof rate === "string" && rate.trim() === "")) {
    return fallback;
  }

  const num = normalizeNumeric(rate, 0);
  const sign = showPlus && num > 0 ? "+" : "";

  const formatted = decimals !== undefined
    ? num.toFixed(decimals)
    : String(num);

  return `${sign}${formatted}%`;
}

/**
 * Format lot counts with singular / plural units.
 * 
 * Examples:
 * - 1 -> "1 lot"
 * - 5 -> "5 lots"
 */
export function formatLots(lots: unknown, unit: string = "lot"): string {
  const num = Math.floor(normalizeNumeric(lots, 0));
  const pluralSuffix = num === 1 ? unit : `${unit}s`;
  return `${num.toLocaleString("en-IN")} ${pluralSuffix}`;
}

/**
 * Format a generic number with locale thousands grouping.
 */
export function formatNumber(value: unknown, fallback: string = "0"): string {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return fallback;
  }
  const num = normalizeNumeric(value, 0);
  return num.toLocaleString("en-IN");
}

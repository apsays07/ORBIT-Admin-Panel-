export interface CopyableMemberRecord {
  username?: string;
  name: string;
  lots: number;
  profit: number;
}

export interface ProfitReportSummary {
  ipoName: string;
  profitDate?: string;
  totalAppliedLots: number;
  totalAllottedLots: number;
  totalProfit: number;
  perLotProfit: number;
  records: CopyableMemberRecord[];
}

/**
 * Format a date into 'DD Month YYYY' format (e.g. '02 September 2026')
 */
export function formatProfitDate(dateStr?: string | Date): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formats displayed member profit records into exact plain-text format:
 * 1. Username - Applied Lots - Profit
 * 2. Username - Applied Lots - Profit
 */
export function formatProfitCopyData(records: CopyableMemberRecord[]): string {
  if (!records || records.length === 0) return "";

  return records
    .map((record, index) => {
      const rawUser = (record.username || record.name || "Member").replace(/^@/, "").trim();
      const lotsCount = Number(record.lots) || 0;
      const formattedLots = Number.isInteger(lotsCount) ? lotsCount : lotsCount.toFixed(2);
      const lotLabel = lotsCount === 1 ? "1 Lot" : `${formattedLots} Lots`;
      const formattedProfit = `₹${Math.round(record.profit || 0).toLocaleString("en-IN")}`;

      return `${index + 1}. ${rawUser} - ${lotLabel} - ${formattedProfit}`;
    })
    .join("\n");
}

/**
 * Generates the complete, cleanly formatted IPO Profit Report matching:
 *
 * IPO Name: [IPO Name]
 * Profit Date: [Date]
 *
 * Total Applied Lots: [Total Applied Lots]
 * Total Allotted Lots: [Total Allotted Lots]
 * Total Profit: ₹[Total Profit]
 * Profit Per Lot: ₹[Profit Per Lot]
 *
 * ----------------------------------------
 * USER PROFIT DETAILS
 * ----------------------------------------
 *
 * 1. Username - Applied Lots - Profit
 * 2. Username - Applied Lots - Profit
 */
export function generateProfitReportText(summary: ProfitReportSummary): string {
  const dateText = formatProfitDate(summary.profitDate);
  const totalAppliedLotsText = Number.isInteger(summary.totalAppliedLots)
    ? String(summary.totalAppliedLots)
    : summary.totalAppliedLots.toFixed(2);
  const totalAllottedLotsText = Number.isInteger(summary.totalAllottedLots)
    ? String(summary.totalAllottedLots)
    : summary.totalAllottedLots.toFixed(2);
  const totalProfitText = `₹${Math.round(summary.totalProfit || 0).toLocaleString("en-IN")}`;
  const perLotProfitText = `₹${Math.round(summary.perLotProfit || 0).toLocaleString("en-IN")}`;

  const userLines = summary.records.map((record, index) => {
    const rawUser = (record.username || record.name || "Member").replace(/^@/, "").trim();
    const lotsCount = Number(record.lots) || 0;
    const formattedLots = Number.isInteger(lotsCount) ? lotsCount : lotsCount.toFixed(2);
    const lotLabel = lotsCount === 1 ? "1 Lot" : `${formattedLots} Lots`;
    const formattedProfit = `₹${Math.round(record.profit || 0).toLocaleString("en-IN")}`;

    return `${index + 1}. ${rawUser} - ${lotLabel} - ${formattedProfit}`;
  });

  const lines = [
    `IPO Name: ${summary.ipoName || "IPO"}`,
    `Profit Date: ${dateText}`,
    "",
    `Total Applied Lots: ${totalAppliedLotsText}`,
    `Total Allotted Lots: ${totalAllottedLotsText}`,
    `Total Profit: ${totalProfitText}`,
    `Profit Per Lot: ${perLotProfitText}`,
    "",
    "----------------------------------------",
    "USER PROFIT DETAILS",
    "----------------------------------------",
    "",
    ...userLines,
  ];

  return lines.join("\n");
}

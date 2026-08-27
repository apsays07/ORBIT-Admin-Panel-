import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeNumeric,
  safeAdd,
  safeSubtract,
  safeMultiply,
  safeDivide,
  sumMonetaryValues,
  calculateProfit,
  calculateReturnPercentage,
  calculatePerLotProfit,
  calculateMemberPayoutProfit,
  calculateLotsFromContribution,
  calculateContributorShare,
  calculateAllotmentRate,
  calculateVerifiedPercentage,
  calculateApplicationPanCount,
  calculateAllottedLotsCount,
  calculateMemberDeployedCapital,
  calculateMemberAppliedLots,
  calculateRankings,
  formatCurrency,
  formatPercentage,
  formatLots,
  formatNumber,
  reconcileTotals,
  reconcileProfitDistribution,
} from "../index";

test("Financial Arithmetic: normalizeNumeric", () => {
  assert.equal(normalizeNumeric(100), 100);
  assert.equal(normalizeNumeric("15000"), 15000);
  assert.equal(normalizeNumeric("₹ 15,000"), 15000);
  assert.equal(normalizeNumeric("$1,234.56"), 1234.56);
  assert.equal(normalizeNumeric("12.5%"), 12.5);
  assert.equal(normalizeNumeric("-500"), -500);
  assert.equal(normalizeNumeric(null, 0), 0);
  assert.equal(normalizeNumeric(undefined, 0), 0);
  assert.equal(normalizeNumeric("", 0), 0);
  assert.equal(normalizeNumeric("invalid", 42), 42);
  assert.equal(normalizeNumeric(NaN, 0), 0);
  assert.equal(normalizeNumeric(Infinity, 0), 0);
});

test("Financial Arithmetic: safeAdd avoids floating point jitter", () => {
  // Classic JavaScript 0.1 + 0.2 = 0.30000000000000004
  assert.equal(safeAdd(0.1, 0.2), 0.3);
  assert.equal(safeAdd("100", 50), 150);
  assert.equal(safeAdd(15000.5, 25000.25), 40000.75);
});

test("Financial Arithmetic: safeSubtract, safeMultiply, safeDivide", () => {
  assert.equal(safeSubtract(300, 100), 200);
  assert.equal(safeMultiply(10, 15000), 150000);
  assert.equal(safeDivide(100, 2), 50);
  assert.equal(safeDivide(100, 0), 0);
  assert.equal(safeDivide(100, 0, -1), -1);
  assert.equal(safeDivide(null, null), 0);
});

test("Financial Arithmetic: sumMonetaryValues", () => {
  assert.equal(sumMonetaryValues([100, 200, 300]), 600);
  assert.equal(sumMonetaryValues(["₹100", "200.50", 300]), 600.5);
  assert.equal(sumMonetaryValues([]), 0);
  assert.equal(sumMonetaryValues([null, undefined, 50]), 50);
});

test("Financial Formulas: Profit & Return Percentage", () => {
  assert.equal(calculateProfit(150000, 100000), 50000);
  assert.equal(calculateProfit(80000, 100000), -20000);

  // Return % = (50000 / 100000) * 100 = 50%
  assert.equal(calculateReturnPercentage(50000, 100000), 50);
  // Zero capital handles division safely
  assert.equal(calculateReturnPercentage(50000, 0), 0);
  // Negative return
  assert.equal(calculateReturnPercentage(-20000, 100000), -20);
});

test("Syndicate Calculations: Per-Lot & Member Payouts", () => {
  // ₹1,00,000 realized profit across 10 applied lots
  assert.equal(calculatePerLotProfit(100000, 10), 10000);
  // 1 lot gets 10000
  assert.equal(calculateMemberPayoutProfit(1, 10000), 10000);
  // 2.5 lots (proportional split) gets 25000
  assert.equal(calculateMemberPayoutProfit(2.5, 10000), 25000);
  // Zero lots or zero profit
  assert.equal(calculatePerLotProfit(0, 10), 0);
  assert.equal(calculatePerLotProfit(100000, 0), 0);
});

test("Multi-Friend Application Proportional Share", () => {
  // Contributor A put 5000 in a 15000 app
  assert.equal(calculateContributorShare(5000, 15000), 1 / 3);
  // Contributor B put 10000 in a 15000 app
  assert.equal(calculateContributorShare(10000, 15000), 2 / 3);
  // Lot calculation from contribution: 30000 at 15000/lot = 2 lots
  assert.equal(calculateLotsFromContribution(30000, 15000), 2);
});

test("Metrics: Allotment & Verification Rates", () => {
  // 3 allotted out of 10 applied = 30%
  assert.equal(calculateAllotmentRate(3, 10), 30);
  assert.equal(calculateAllotmentRate(0, 10), 0);
  assert.equal(calculateAllotmentRate(10, 0), 0);

  // 18 verified out of 20 members = 90%
  assert.equal(calculateVerifiedPercentage(18, 20), 90);
  assert.equal(calculateVerifiedPercentage(0, 0), 100);
});

test("Metrics: Member Deployed Capital", () => {
  const sampleApps = [
    { memberId: "mem_1", totalContribution: 15000 },
    {
      memberId: null,
      totalContribution: 30000,
      fundingStructure: "MULTI_FRIEND",
      contributors: [
        { memberId: "mem_1", amount: 10000 },
        { memberId: "mem_2", amount: 20000 },
      ],
    },
    { memberId: "mem_2", totalContribution: 15000 },
  ];

  // mem_1 deployed: 15000 (solo) + 10000 (split) = 25000
  assert.equal(calculateMemberDeployedCapital(sampleApps, "mem_1"), 25000);
  // mem_2 deployed: 20000 (split) + 15000 (solo) = 35000
  assert.equal(calculateMemberDeployedCapital(sampleApps, "mem_2"), 35000);
  // Unknown member
  assert.equal(calculateMemberDeployedCapital(sampleApps, "mem_999"), 0);
});

test("Rankings: Deterministic Order & Tie-Breaking", () => {
  const data = [
    { id: "c", name: "Charlie", profit: 20000 },
    { id: "a", name: "Alice", profit: 50000 },
    { id: "b", name: "Bob", profit: 50000 },
  ];

  const ranked = calculateRankings(
    data,
    (d) => d.profit,
    (a, b) => a.name.localeCompare(b.name)
  );

  assert.equal(ranked[0].name, "Alice");
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].name, "Bob");
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[2].name, "Charlie");
  assert.equal(ranked[2].rank, 3);
});

test("Formatting Layer: Separates Display from Numbers", () => {
  assert.equal(formatCurrency(15000), "₹15,000");
  assert.equal(formatCurrency(15000.5, { decimals: 2 }), "₹15,000.50");
  assert.equal(formatCurrency(0), "₹0");
  assert.equal(formatCurrency(null), "—");

  assert.equal(formatPercentage(12.5), "12.5%");
  assert.equal(formatPercentage(12.5, { showPlus: true }), "+12.5%");
  assert.equal(formatPercentage(0), "0%");

  assert.equal(formatLots(1), "1 lot");
  assert.equal(formatLots(5), "5 lots");
  assert.equal(formatNumber(1250000), "12,50,000");
});

test("Reconciliation: Totals and Profit Payouts", () => {
  const res1 = reconcileTotals(100, [50, 30, 20]);
  assert.equal(res1.isValid, true);
  assert.equal(res1.difference, 0);

  const res2 = reconcileTotals(100, [50, 30, 10]);
  assert.equal(res2.isValid, false);
  assert.equal(res2.difference, 10);

  const pRes1 = reconcileProfitDistribution(50000, [
    { profit: 25000, memberId: "m1" },
    { profit: 25000, memberId: "m2" },
  ]);
  assert.equal(pRes1.isValid, true);

  const pRes2 = reconcileProfitDistribution(50000, [
    { profit: 30000, memberId: "m1" },
    { profit: 25000, memberId: "m2" },
  ]);
  assert.equal(pRes2.isValid, false);
});

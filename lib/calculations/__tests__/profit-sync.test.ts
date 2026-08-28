import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMemberPayoutProfit,
  calculatePerLotProfit,
  calculateApplicationPanCount,
  calculateAllottedLotsCount,
  calculateContributorShare,
  reconcileProfitDistribution,
  safeAdd,
  safeMultiply,
} from "../index";

test("TEST A: 10 lots -> Remove 3 lots -> Profit reflects 7 lots", () => {
  const oneLotProfit = 2000;
  const initialLots = 10;
  const initialProfit = calculateMemberPayoutProfit(initialLots, oneLotProfit);
  assert.equal(initialProfit, 20000);

  // Removing 3 lots
  const updatedLots = initialLots - 3;
  assert.equal(updatedLots, 7);

  const updatedProfit = calculateMemberPayoutProfit(updatedLots, oneLotProfit);
  assert.equal(updatedProfit, 14000);
});

test("TEST B: 10 applied, 5 allotted -> Remove 3 applied -> 7 applied, 5 allotted", () => {
  const panNumbers = ["PAN1", "PAN2", "PAN3", "PAN4", "PAN5", "PAN6", "PAN7", "PAN8", "PAN9", "PAN10"];
  const allottedIndices = [0, 1, 2, 3, 4]; // 5 allotted

  const appliedCount = calculateApplicationPanCount(panNumbers, 10);
  const allottedCount = calculateAllottedLotsCount("PARTIALLY_ALLOTTED", "PARTIALLY_ALLOTTED", allottedIndices, appliedCount);

  assert.equal(appliedCount, 10);
  assert.equal(allottedCount, 5);

  // Remove 3 PANs
  const updatedPans = panNumbers.slice(0, 7);
  const updatedAppliedCount = calculateApplicationPanCount(updatedPans, 7);
  // Allotted indices remaining within valid bounds [0..4]
  const updatedAllottedCount = calculateAllottedLotsCount("PARTIALLY_ALLOTTED", "PARTIALLY_ALLOTTED", allottedIndices, updatedAppliedCount);

  assert.equal(updatedAppliedCount, 7);
  assert.equal(updatedAllottedCount, 5);
});

test("TEST C: 10 applied, 10 allotted -> Remove 5 -> 5 applied, 5 allotted, 5x profit", () => {
  const oneLotProfit = 3500;
  const initialLots = 10;
  const initialProfit = calculateMemberPayoutProfit(initialLots, oneLotProfit);
  assert.equal(initialProfit, 35000);

  const updatedLots = 5;
  const updatedProfit = calculateMemberPayoutProfit(updatedLots, oneLotProfit);
  assert.equal(updatedProfit, 17500);
});

test("TEST D: Set lots to 0 -> 0 lots and 0 profit", () => {
  const oneLotProfit = 2500;
  const zeroLots = 0;
  const zeroProfit = calculateMemberPayoutProfit(zeroLots, oneLotProfit);
  assert.equal(zeroProfit, 0);
});

test("TEST E: Multi-friend split lot reduction", () => {
  const oneLotProfit = 2000;
  const totalPans = 4; // 4 lots total = ₹60,000
  const contributors = [
    { memberId: "mem_1", amount: 30000 }, // 50% = 2 lots
    { memberId: "mem_2", amount: 30000 }, // 50% = 2 lots
  ];

  const totalAmount = contributors.reduce((s, c) => safeAdd(s, c.amount), 0);
  assert.equal(totalAmount, 60000);

  const share1 = calculateContributorShare(contributors[0].amount, totalAmount);
  const lots1 = Number((share1 * totalPans).toFixed(2));
  const profit1 = calculateMemberPayoutProfit(lots1, oneLotProfit);

  assert.equal(lots1, 2);
  assert.equal(profit1, 4000);

  // Now reduce application to 2 lots = ₹30,000 (with mem_1 having ₹15k, mem_2 having ₹15k)
  const reducedPans = 2;
  const reducedContributors = [
    { memberId: "mem_1", amount: 15000 },
    { memberId: "mem_2", amount: 15000 },
  ];
  const reducedTotal = reducedContributors.reduce((s, c) => safeAdd(s, c.amount), 0);
  const redShare1 = calculateContributorShare(reducedContributors[0].amount, reducedTotal);
  const redLots1 = Number((redShare1 * reducedPans).toFixed(2));
  const redProfit1 = calculateMemberPayoutProfit(redLots1, oneLotProfit);

  assert.equal(redLots1, 1);
  assert.equal(redProfit1, 2000);
});

test("TEST F: Profit distribution mathematical reconciliation", () => {
  const memberPayouts = [
    { memberId: "m1", name: "User 1", pan: "P1", contribution: 30000, lots: 2, profit: 4000 },
    { memberId: "m2", name: "User 2", pan: "P2", contribution: 75000, lots: 5, profit: 10000 },
  ];
  const totalProfit = 14000;
  const rec = reconcileProfitDistribution(totalProfit, memberPayouts);
  assert.equal(rec.isValid, true);
  assert.equal(rec.difference, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { formatProfitCopyData } from "../copy-formatter";
import { calculatePerLotProfit, calculateMemberPayoutProfit, reconcileProfitDistribution } from "@/lib/calculations";

test("Profit distribution calculations accurately compute per lot and individual payout", () => {
  const totalProfit = 150000;
  const totalLots = 100;
  const perLot = calculatePerLotProfit(totalProfit, totalLots);
  assert.equal(perLot, 1500);

  const memberLots = 2;
  const memberProfit = calculateMemberPayoutProfit(memberLots, perLot);
  assert.equal(memberProfit, 3000);

  const copyString = formatProfitCopyData([
    { name: "Ankit", username: "@Ankit", lots: memberLots, profit: memberProfit },
  ]);
  assert.equal(copyString, "1. Ankit - 2 Lots - ₹3,000");
});

test("Reconcile profit distribution matches correctly when all lots account for total profit", () => {
  const members = [
    { memberId: "m1", name: "Ankit", contribution: 30000, lots: 2, profit: 1500 },
    { memberId: "m2", name: "Rahul", contribution: 15000, lots: 1, profit: 750 },
    { memberId: "m3", name: "Priya", contribution: 45000, lots: 3, profit: 2250 },
  ];

  const totalProfit = 4500;
  const rec = reconcileProfitDistribution(totalProfit, members);
  assert.equal(rec.isValid, true);
  assert.equal(rec.difference, 0);

  const formatted = formatProfitCopyData(members);
  assert.equal(
    formatted,
    "1. Ankit - 2 Lots - ₹1,500\n2. Rahul - 1 Lot - ₹750\n3. Priya - 3 Lots - ₹2,250"
  );
});

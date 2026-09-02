import test from "node:test";
import assert from "node:assert/strict";
import { formatProfitCopyData, generateProfitReportText } from "../copy-formatter";

test("formatProfitCopyData: formats records matching exact user requirement", () => {
  const records = [
    { name: "Ankit", username: "@Ankit", lots: 2, profit: 1500 },
    { name: "Rahul", username: "Rahul", lots: 1, profit: 750 },
    { name: "Priya", username: "@Priya", lots: 3, profit: 2250 },
  ];

  const expected = [
    "1. Ankit - 2 Lots - ₹1,500",
    "2. Rahul - 1 Lot - ₹750",
    "3. Priya - 3 Lots - ₹2,250",
  ].join("\n");

  const actual = formatProfitCopyData(records);
  assert.equal(actual, expected);
});

test("generateProfitReportText: generates complete clean report with header and user details", () => {
  const report = generateProfitReportText({
    ipoName: "Tata Capital IPO",
    profitDate: "2026-09-02T00:00:00Z",
    totalAppliedLots: 25,
    totalAllottedLots: 10,
    totalProfit: 25000,
    perLotProfit: 2500,
    records: [
      { name: "Ankit", username: "@Ankit", lots: 2, profit: 5000 },
      { name: "Rahul", username: "Rahul", lots: 1, profit: 2500 },
      { name: "Priya", username: "@Priya", lots: 3, profit: 7500 },
    ],
  });

  const expected = [
    "IPO Name: Tata Capital IPO",
    "Profit Date: 02 September 2026",
    "",
    "Total Applied Lots: 25",
    "Total Allotted Lots: 10",
    "Total Profit: ₹25,000",
    "Profit Per Lot: ₹2,500",
    "",
    "----------------------------------------",
    "USER PROFIT DETAILS",
    "----------------------------------------",
    "",
    "1. Ankit - 2 Lots - ₹5,000",
    "2. Rahul - 1 Lot - ₹2,500",
    "3. Priya - 3 Lots - ₹7,500",
  ].join("\n");

  assert.equal(report, expected);
});

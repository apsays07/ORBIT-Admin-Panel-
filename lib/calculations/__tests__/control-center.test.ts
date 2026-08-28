import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeControlCenterData,
  generateMetricExplanation,
  generateMember360,
  generateApplication360,
  generatePanAuditTimeline,
  extractGenuinePans,
} from "../control-center";
import { NexoIPORecord, ProfitDistribution } from "@/types/ipo";
import { ApplicationRecord, MemberRecord } from "@/types/application";

describe("IPO Operations & Reconciliation Engine Tests", () => {
  // Test Data Setup
  const mockIpos: NexoIPORecord[] = [
    {
      id: "ipo_dhoot",
      name: "Dhoot Transmission",
      company: "Dhoot Transmission Ltd",
      status: "APPLICATION_OPEN",
      metrics: {
        minInvestment: 15000,
        lotSize: 100,
      },
      createdAt: "2026-08-20T10:00:00Z",
    },
    {
      id: "ipo_indo",
      name: "Indo MIM",
      company: "Indo MIM Ltd",
      status: "COMPLETED",
      isCompleted: true,
      allotmentFinalized: true,
      metrics: {
        minInvestment: 14000,
        lotSize: 50,
      },
      createdAt: "2026-08-10T10:00:00Z",
    },
  ];

  const mockMembers: MemberRecord[] = [
    {
      id: "mem_gaurav",
      name: "Gaurav L",
      username: "gaurav_l",
      role: "MEMBER",
      status: "ACTIVE",
      panMasked: "ABCDE••••F",
      panFull: "ABCDE1234F",
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "mem_shivam",
      name: "Shivam P",
      username: "shivam_p",
      role: "MEMBER",
      status: "ACTIVE",
      panMasked: "BCDEF••••G",
      panFull: "BCDEF2345G",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  const mockApplications: ApplicationRecord[] = [
    // App 1: Gaurav applied in Dhoot with Capital Mismatch (Expected ₹30,000 for 2 lots, recorded ₹15,000)
    {
      id: "app_1",
      ipoId: "ipo_dhoot",
      ipoName: "Dhoot Transmission",
      memberId: "mem_gaurav",
      applicantName: "Gaurav L",
      applicantUsername: "gaurav_l",
      fundingStructure: "SOLO",
      numberOfPanCards: 2,
      panNumbers: ["ABCDE1234F", "CDEFG3456H"],
      totalContribution: 15000, // Discrepancy of ₹15,000
      status: "AWAITING",
      createdAt: "2026-08-22T10:00:00Z",
    },
    // App 2: Shivam applied in Dhoot with genuine PAN
    {
      id: "app_2",
      ipoId: "ipo_dhoot",
      ipoName: "Dhoot Transmission",
      memberId: "mem_shivam",
      applicantName: "Shivam P",
      applicantUsername: "shivam_p",
      fundingStructure: "SOLO",
      numberOfPanCards: 1,
      panNumbers: ["BCDEF2345G"],
      totalContribution: 15000,
      status: "AWAITING",
      createdAt: "2026-08-22T11:00:00Z",
    },
    // App 3: Past application in Indo MIM with dummy XUSER PAN and historical PAN
    {
      id: "app_3",
      ipoId: "ipo_indo",
      ipoName: "Indo MIM",
      memberId: "mem_gaurav",
      applicantName: "Gaurav L",
      applicantUsername: "gaurav_l",
      fundingStructure: "SOLO",
      numberOfPanCards: 3,
      panNumbers: ["ABCDE1234F", "XUSER2532X", "KLMNO5678P"],
      totalContribution: 42000,
      status: "ALLOTTED",
      allotmentStatus: "ALLOTTED",
      createdAt: "2026-08-11T10:00:00Z",
    },
  ];

  it("1. Strictly excludes dummy XUSER...X PANs from all extractions", () => {
    const pans = ["ABCDE1234F", "XUSER2532X", "XUSER0808X", "xuser9999x", "KLMNO5678P"];
    const genuine = extractGenuinePans(pans);
    assert.deepEqual(genuine, ["ABCDE1234F", "KLMNO5678P"]);
  });

  it("2. Analyzes control center data with Impact-First aggregation", () => {
    const analysis = analyzeControlCenterData({
      allIpos: mockIpos,
      allApplications: mockApplications,
      allMembers: mockMembers,
      profitDistributions: [],
      selectedIpoId: "ipo_dhoot",
    });

    // Verify 8 KPIs
    assert.equal(analysis.kpis.totalApplications, 2);
    assert.equal(analysis.kpis.capitalMismatchesCount, 1);
    assert.equal(analysis.kpis.capitalAtRisk >= 15000, true);

    // Verify Impact Summary
    assert.equal(analysis.impactSummary.totalApplicationsAffected >= 1, true);
    assert.equal(analysis.impactSummary.totalMembersAffected >= 1, true);

    // Verify Capital Discrepancy record
    assert.equal(analysis.capitalReconciliation.discrepancies.length, 1);
    assert.equal(analysis.capitalReconciliation.discrepancies[0].discrepancy, 15000);

    // Verify dummy PAN XUSER2532X was not included in missing PAN count
    const missingPans = analysis.panIntelligence.missingGenuinePans.map((p) => p.pan);
    assert.equal(missingPans.includes("XUSER2532X"), false);
    assert.equal(missingPans.includes("KLMNO5678P"), true);
  });

  it("3. Generates Member 360° dossier with 7-step lifecycle timeline", () => {
    const analysis = analyzeControlCenterData({
      allIpos: mockIpos,
      allApplications: mockApplications,
      allMembers: mockMembers,
      profitDistributions: [],
      selectedIpoId: "ipo_dhoot",
    });

    const member360 = generateMember360({
      memberId: "mem_gaurav",
      allIpos: mockIpos,
      allApplications: mockApplications,
      allMembers: mockMembers,
      profitDistributions: [],
      detectedIssues: analysis.issues,
      selectedIpoId: "ipo_dhoot",
    });

    assert.ok(member360);
    assert.equal(member360?.username, "gaurav_l");
    assert.equal(member360?.totalCapitalDeployed, 57000); // 15k in Dhoot + 42k in Indo
    assert.equal(member360?.lifecycleTimeline.length, 7);
  });

  it("4. Generates Application 360° diagnostic with 5-point consistency checklist", () => {
    const analysis = analyzeControlCenterData({
      allIpos: mockIpos,
      allApplications: mockApplications,
      allMembers: mockMembers,
      profitDistributions: [],
      selectedIpoId: "ipo_dhoot",
    });

    const app360 = generateApplication360({
      applicationId: "app_1",
      allIpos: mockIpos,
      allApplications: mockApplications,
      allMembers: mockMembers,
      profitDistributions: [],
      detectedIssues: analysis.issues,
    });

    assert.ok(app360);
    assert.equal(app360?.applicantUsername, "gaurav_l");
    assert.equal(app360?.consistencyChecklist.length, 5);

    // Capital Accuracy check should fail due to 15k vs 30k expected
    const capitalCheck = app360?.consistencyChecklist.find((c) => c.label === "Capital Accuracy");
    assert.equal(capitalCheck?.status, "FAIL");
  });

  it("5. Generates PAN Audit Timeline (Why is this PAN listed?)", () => {
    const timeline = generatePanAuditTimeline({
      pan: "KLMNO5678P",
      allIpos: mockIpos,
      allApplications: mockApplications,
      allMembers: mockMembers,
      selectedIpoId: "ipo_dhoot",
    });

    assert.ok(timeline);
    assert.equal(timeline?.pan, "KLMNO5678P");
    assert.equal(timeline?.totalHistoricalIpos, 1);
    assert.equal(timeline?.isAppliedInCurrentIpo, false);
    assert.equal(timeline?.currentIpoStatus, "Not Applied");
  });

  it("6. Explain This Number dynamically calculates and itemizes breakdown", () => {
    const explanation = generateMetricExplanation({
      metricKey: "applied_capital",
      allIpos: mockIpos,
      allApplications: mockApplications,
      selectedIpoId: "ipo_dhoot",
    });

    assert.equal(explanation.totalValue, 30000); // 15k + 15k in Dhoot
    assert.equal(explanation.breakdownCount, 2);
  });
});

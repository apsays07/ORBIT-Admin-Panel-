import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePan,
  isValidNormalizedPan,
  isDummyXuserPan,
  detectIpoApplicantGap,
  filterAndSortGapApplicants,
  GapDetectionIpo,
  GapDetectionApplication,
} from "../index";

test("PAN Normalization and Validation", () => {
  assert.equal(normalizePan("abcde1234f"), "ABCDE1234F");
  assert.equal(normalizePan("  ABCDE1234F  "), "ABCDE1234F");
  assert.equal(normalizePan("abcde 1234 f"), "ABCDE1234F");
  assert.equal(normalizePan("abcde-1234_f"), "ABCDE1234F");
  assert.equal(normalizePan(""), "");
  assert.equal(normalizePan(null), "");
  assert.equal(normalizePan(undefined), "");

  assert.equal(isValidNormalizedPan("ABCDE1234F"), true);
  assert.equal(isValidNormalizedPan("ZZZZZ9999Z"), true);
  assert.equal(isValidNormalizedPan("INVALID"), false);
  assert.equal(isValidNormalizedPan("12345ABCDE"), false);
});

test("Gap Detector - Case 1: PAN applied in previous IPO, not current IPO -> SHOW", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-10" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F"],
      applicantUsername: "user1",
      applicantName: "User One",
      status: "ALLOTTED",
      createdAt: "2026-08-08T10:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.missingPansCount, 1);
  assert.equal(result.missingApplicants[0].pan, "ABCDE1234F");
  assert.equal(result.missingApplicants[0].previousIpoCount, 1);
  assert.equal(result.missingApplicants[0].lastAppliedIpoName, "Alpha IPO");
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Case 2: PAN applied in previous IPO and current IPO -> DO NOT SHOW", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-10" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F"],
      status: "ALLOTTED",
      createdAt: "2026-08-08T10:00:00Z",
    },
    {
      id: "app_2",
      ipoId: "ipo_2",
      panNumbers: ["ABCDE1234F"],
      status: "AWAITING",
      createdAt: "2026-08-18T10:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.missingPansCount, 0);
  assert.equal(result.historicalUniquePansCount, 1);
  assert.equal(result.previousPansAppliedToCurrentCount, 1);
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Case 3: PAN applied to multiple previous IPOs, not current -> SHOW ONCE with correct count", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO", metrics: { closeDate: "2026-08-10" } },
    { id: "ipo_3", name: "Gamma IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F"],
      status: "AWAITING",
      createdAt: "2026-08-01T10:00:00Z",
    },
    {
      id: "app_2",
      ipoId: "ipo_2",
      panNumbers: ["ABCDE1234F"],
      status: "ALLOTTED",
      createdAt: "2026-08-09T10:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_3",
  });

  assert.equal(result.missingPansCount, 1);
  assert.equal(result.missingApplicants[0].pan, "ABCDE1234F");
  assert.equal(result.missingApplicants[0].previousIpoCount, 2);
  assert.equal(result.missingApplicants[0].lastAppliedIpoName, "Beta IPO");
  assert.equal(result.missingApplicants[0].participationHistory.length, 2);
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Case 4: Same PAN appears multiple times in one previous IPO -> COUNT ONCE", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F"],
      status: "AWAITING",
      createdAt: "2026-08-01T09:00:00Z",
    },
    {
      id: "app_2",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F"],
      status: "ALLOTTED",
      createdAt: "2026-08-01T10:00:00Z",
    },
    {
      id: "app_3",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F"],
      status: "AWAITING",
      createdAt: "2026-08-01T11:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.missingPansCount, 1);
  // Deduplicated to 1 IPO
  assert.equal(result.missingApplicants[0].previousIpoCount, 1);
  // Total raw applications retained
  assert.equal(result.missingApplicants[0].totalApplicationsCount, 3);
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Case 5: Two different PANs belong to the same member -> Treat independently", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  // Member 1 applied with PAN_A and PAN_B in Alpha IPO
  // But only applied with PAN_B in Beta IPO
  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      memberId: "mem_1",
      applicantUsername: "member1",
      panNumbers: ["AAAAA1111A", "BBBBB2222B"],
      status: "AWAITING",
      createdAt: "2026-08-01T10:00:00Z",
    },
    {
      id: "app_2",
      ipoId: "ipo_2",
      memberId: "mem_1",
      applicantUsername: "member1",
      panNumbers: ["BBBBB2222B"],
      status: "AWAITING",
      createdAt: "2026-08-18T10:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  // Only PAN A should appear as missing
  assert.equal(result.missingPansCount, 1);
  assert.equal(result.missingApplicants[0].pan, "AAAAA1111A");
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Case 6: PAN exists only in current IPO -> DO NOT SHOW", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_2",
      panNumbers: ["NEWWW9999N"],
      status: "AWAITING",
      createdAt: "2026-08-18T10:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.missingPansCount, 0);
  assert.equal(result.historicalUniquePansCount, 0);
  assert.equal(result.currentIpoApplicantsCount, 1);
});

test("Gap Detector - Case 7: PAN has no historical application / invalid format -> DO NOT SHOW", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: ["INVALID_PAN_123"],
      status: "AWAITING",
      createdAt: "2026-08-01T10:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.missingPansCount, 0);
});

test("Gap Detector - Case 8: No previous IPOs -> Empty state", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_only", name: "First IPO Ever", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_only",
      panNumbers: ["ABCDE1234F"],
      status: "AWAITING",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_only",
  });

  assert.equal(result.missingPansCount, 0);
  assert.equal(result.totalHistoricalIposConsidered, 0);
});

test("Gap Detector - Case 9: No current IPO selected / found -> Safe default/unselected state", () => {
  const result = detectIpoApplicantGap({
    allIpos: [],
    allApplications: [],
    selectedCurrentIpoId: "non_existent_id",
  });

  assert.equal(result.isCurrentIpoSelected, false);
  assert.equal(result.missingPansCount, 0);
});

test("Gap Detector - Case 10: Current IPO has zero applications -> All valid historical PANs qualify", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO", metrics: { closeDate: "2026-08-10" } },
    { id: "ipo_3", name: "Gamma IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    { id: "app_1", ipoId: "ipo_1", panNumbers: ["PANAA1111A"], status: "AWAITING", createdAt: "2026-08-01" },
    { id: "app_2", ipoId: "ipo_2", panNumbers: ["PANBB2222B"], status: "ALLOTTED", createdAt: "2026-08-10" },
    { id: "app_3", ipoId: "ipo_2", panNumbers: ["PANCC3333C"], status: "AWAITING", createdAt: "2026-08-10" },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_3",
  });

  assert.equal(result.currentIpoApplicantsCount, 0);
  assert.equal(result.historicalUniquePansCount, 3);
  assert.equal(result.missingPansCount, 3);
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Case 11: All historical PANs applied to current IPO -> Show zero-state", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    { id: "app_1", ipoId: "ipo_1", panNumbers: ["PANAA1111A", "PANBB2222B"], status: "ALLOTTED" },
    { id: "app_2", ipoId: "ipo_2", panNumbers: ["PANAA1111A"], status: "AWAITING" },
    { id: "app_3", ipoId: "ipo_2", panNumbers: ["PANBB2222B"], status: "AWAITING" },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.historicalUniquePansCount, 2);
  assert.equal(result.currentIpoApplicantsCount, 2);
  assert.equal(result.previousPansAppliedToCurrentCount, 2);
  assert.equal(result.missingPansCount, 0);
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Case 12: PAN casing and whitespace differences -> Treat as identical", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const apps: GapDetectionApplication[] = [
    { id: "app_1", ipoId: "ipo_1", panNumbers: ["  abcde1234f  "], status: "ALLOTTED" },
    { id: "app_2", ipoId: "ipo_2", panNumbers: ["ABCDE1234F"], status: "AWAITING" },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.missingPansCount, 0);
  assert.equal(result.previousPansAppliedToCurrentCount, 1);
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Filtering and Sorting", () => {
  const items = [
    {
      pan: "PANAA1111A",
      formattedPan: "PANAA1111A",
      memberName: "Alpha Member",
      memberUsername: "alpha",
      displayMember: "@alpha",
      previousIpoCount: 1,
      totalApplicationsCount: 1,
      lastAppliedIpoId: "ipo_1",
      lastAppliedIpoName: "Alpha IPO",
      lastApplicationDate: "2026-01-01",
      formattedLastDate: "01 Jan 2026",
      priority: "LOW" as const,
      priorityReason: "1 IPO",
      appliedRecently: false,
      participationHistory: [],
    },
    {
      pan: "PANBB2222B",
      formattedPan: "PANBB2222B",
      memberName: "Beta Member",
      memberUsername: "beta",
      displayMember: "@beta",
      previousIpoCount: 4,
      totalApplicationsCount: 4,
      lastAppliedIpoId: "ipo_4",
      lastAppliedIpoName: "Delta IPO",
      lastApplicationDate: "2026-08-15",
      formattedLastDate: "15 Aug 2026",
      priority: "HIGH" as const,
      priorityReason: "4 IPOs",
      appliedRecently: true,
      participationHistory: [],
    },
    {
      pan: "PANCC3333C",
      formattedPan: "PANCC3333C",
      memberName: "Charlie Member",
      memberUsername: "charlie",
      displayMember: "@charlie",
      previousIpoCount: 2,
      totalApplicationsCount: 2,
      lastAppliedIpoId: "ipo_2",
      lastAppliedIpoName: "Beta IPO",
      lastApplicationDate: "2026-05-01",
      formattedLastDate: "01 May 2026",
      priority: "MEDIUM" as const,
      priorityReason: "2 IPOs",
      appliedRecently: false,
      participationHistory: [],
    },
  ];

  // Filter 3+ IPOs
  const filtered3Plus = filterAndSortGapApplicants({ items, filter: "3_PLUS" });
  assert.equal(filtered3Plus.length, 1);
  assert.equal(filtered3Plus[0].pan, "PANBB2222B");

  // Filter 2+ IPOs
  const filtered2Plus = filterAndSortGapApplicants({ items, filter: "2_PLUS" });
  assert.equal(filtered2Plus.length, 2);

  // Search by username
  const searched = filterAndSortGapApplicants({ items, searchQuery: "charlie" });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].pan, "PANCC3333C");

  // Search by PAN
  const searchedPan = filterAndSortGapApplicants({ items, searchQuery: "panaa" });
  assert.equal(searchedPan.length, 1);
  assert.equal(searchedPan[0].pan, "PANAA1111A");
});

test("Dummy PAN Detection - isDummyXuserPan pattern matcher", () => {
  // Matches: Starts with XUSER (case-insensitive)
  assert.equal(isDummyXuserPan("XUSER2532X"), true);
  assert.equal(isDummyXuserPan("XUSER0808X"), true);
  assert.equal(isDummyXuserPan("xuser1234x"), true);
  assert.equal(isDummyXuserPan("  XUSER9999X  "), true);
  assert.equal(isDummyXuserPan("XUSER0000X"), true);
  assert.equal(isDummyXuserPan("XUSER12345"), true);
  assert.equal(isDummyXuserPan("XUSERANKIT"), true);
  assert.equal(isDummyXuserPan("XUSER00001"), true);
  assert.equal(isDummyXuserPan("xuser123"), true);
  assert.equal(isDummyXuserPan("XUSER1234Y"), true);

  // Non-dummy / genuine PANs:
  assert.equal(isDummyXuserPan("ABCDE1234F"), false);
  assert.equal(isDummyXuserPan("AUSER1234X"), false); // does not start with XUSER
  assert.equal(isDummyXuserPan(""), false);
  assert.equal(isDummyXuserPan(null), false);
  assert.equal(isDummyXuserPan(undefined), false);
});

test("Gap Detector - Exclude dummy XUSER...X PANs from historical calculation", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  // 1 genuine PAN + 2 dummy XUSER...X PANs in previous IPO
  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F", "XUSER2532X", "XUSER0808X"],
      applicantUsername: "user1",
      status: "ALLOTTED",
      createdAt: "2026-08-01T10:00:00Z",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  // Only genuine PAN ABCDE1234F should be counted
  assert.equal(result.historicalUniquePansCount, 1);
  assert.equal(result.missingPansCount, 1);
  assert.equal(result.missingApplicants.length, 1);
  assert.equal(result.missingApplicants[0].pan, "ABCDE1234F");
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Exclude dummy XUSER...X PANs from current IPO and reconcile", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  // 1 genuine historical PAN + 1 dummy historical PAN
  // Current IPO has 1 dummy PAN + 1 genuine other PAN
  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: ["ABCDE1234F", "XUSER2532X"],
      status: "ALLOTTED",
    },
    {
      id: "app_2",
      ipoId: "ipo_2",
      panNumbers: ["XUSER2532X", "ZZZZZ9999Z"],
      status: "AWAITING",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.historicalUniquePansCount, 1); // only ABCDE1234F
  assert.equal(result.currentIpoApplicantsCount, 1); // only ZZZZZ9999Z
  assert.equal(result.previousPansAppliedToCurrentCount, 0);
  assert.equal(result.missingPansCount, 1);
  assert.equal(result.missingApplicants[0].pan, "ABCDE1234F");
  assert.equal(result.isReconciled, true);
});

test("Gap Detector - Example scenario: 107 historical PANs with 10 dummy PANs -> 97 considered", () => {
  const ipos: GapDetectionIpo[] = [
    { id: "ipo_1", name: "Alpha IPO", metrics: { closeDate: "2026-08-01" } },
    { id: "ipo_2", name: "Beta IPO (Current)", metrics: { closeDate: "2026-08-20" } },
  ];

  const genuinePans = Array.from({ length: 97 }, (_, i) => `GENUI${String(i).padStart(4, "0")}A`);
  const dummyPans = Array.from({ length: 10 }, (_, i) => `XUSER${String(i).padStart(4, "0")}X`);

  const apps: GapDetectionApplication[] = [
    {
      id: "app_1",
      ipoId: "ipo_1",
      panNumbers: [...genuinePans, ...dummyPans],
      status: "ALLOTTED",
    },
  ];

  const result = detectIpoApplicantGap({
    allIpos: ipos,
    allApplications: apps,
    selectedCurrentIpoId: "ipo_2",
  });

  assert.equal(result.historicalUniquePansCount, 97);
  assert.equal(result.missingPansCount, 97);
  assert.equal(result.isReconciled, true);
  assert.equal(result.missingApplicants.every((item) => !item.pan.startsWith("XUSER")), true);
});


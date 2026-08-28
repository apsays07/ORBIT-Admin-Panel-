/**
 * Pure, deterministic calculation engine for IPO applicant gap detection.
 * 
 * Compares historical applicant PANs (from IPOs prior to/other than the current IPO)
 * against applicant PANs already used in the currently selected IPO.
 * 
 * Formula:
 * Previous IPO Applicant PANs − Current IPO Applicant PANs = Missing Previous Applicants
 */

export interface GapDetectionIpo {
  id: string;
  name: string;
  category?: string;
  status?: string;
  isCompleted?: boolean;
  allotmentFinalized?: boolean;
  metrics?: {
    openDate?: string;
    closeDate?: string;
    listingDate?: string;
    minInvestment?: number;
    lotSize?: number;
  };
  createdAt?: string;
}

export interface GapDetectionApplication {
  id?: string;
  ipoId: string;
  ipoName?: string;
  memberId?: string;
  applicantName?: string;
  applicantUsername?: string;
  panNumbers?: string[];
  numberOfPanCards?: number;
  totalContribution?: number;
  status?: string;
  allotmentStatus?: string;
  allottedIndices?: number[];
  fundingStructure?: string;
  contributors?: Array<{
    memberId?: string;
    memberName?: string;
    username?: string;
    name?: string;
    amount?: number;
    percentage?: number;
  }>;
  createdAt?: string;
}

export interface PreviousIpoParticipationRecord {
  ipoId: string;
  ipoName: string;
  category?: string;
  applicationId?: string;
  applicationDate: string;
  status: string;
  allotmentStatus?: string;
  isAllotted: boolean;
  lotsCount: number;
  totalContribution: number;
  createdAt: string;
}

export type ApplicantGapPriority = "HIGH" | "MEDIUM" | "LOW";

export interface MissingApplicantPanItem {
  pan: string;
  formattedPan: string;
  memberId?: string;
  memberName: string;
  memberUsername?: string;
  displayMember: string;
  previousIpoCount: number;
  totalApplicationsCount: number;
  lastAppliedIpoId: string;
  lastAppliedIpoName: string;
  lastApplicationDate: string;
  formattedLastDate: string;
  priority: ApplicantGapPriority;
  priorityReason: string;
  appliedRecently: boolean;
  participationHistory: PreviousIpoParticipationRecord[];
}

export interface IpoApplicantGapResult {
  isCurrentIpoSelected: boolean;
  selectedIpoId: string | null;
  selectedIpoName: string | null;
  totalHistoricalIposConsidered: number;
  historicalUniquePansCount: number;
  currentIpoApplicantsCount: number;
  previousPansAppliedToCurrentCount: number;
  missingPansCount: number;
  isReconciled: boolean;
  missingApplicants: MissingApplicantPanItem[];
  availableIpos: Array<{ id: string; name: string; status?: string; category?: string; count?: number }>;
}

export type GapParticipationFilter = "ALL" | "RECENT" | "2_PLUS" | "3_PLUS";
export type GapSortOption = "most_previous" | "most_recent" | "pan_asc" | "member_asc" | "date_desc";

/**
 * Standardize and clean PAN string:
 * - Upper case
 * - Strips whitespace, spaces, hyphens
 */
export function normalizePan(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/[\s\-_]+/g, "");
}

/**
 * Validate standard Indian PAN format: 5 uppercase letters, 4 digits, 1 uppercase letter.
 */
export function isValidNormalizedPan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

/**
 * Detect dummy / test PAN cards that match the XUSER pattern:
 * Starts with "XUSER" and ends with "X" (e.g. "XUSER2532X", "XUSER0808X", etc.).
 */
export function isDummyXuserPan(pan?: string | null): boolean {
  if (!pan || typeof pan !== "string") return false;
  const clean = normalizePan(pan);
  return clean.startsWith("XUSER") && clean.endsWith("X");
}

/**
 * Resolve chronological timestamp for an IPO.
 */
export function getIpoTimestamp(ipo: GapDetectionIpo): number {
  if (ipo.metrics?.closeDate) {
    const t = new Date(ipo.metrics.closeDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (ipo.metrics?.openDate) {
    const t = new Date(ipo.metrics.openDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (ipo.createdAt) {
    const t = new Date(ipo.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

/**
 * Resolve application timestamp.
 */
function getAppTimestamp(app: GapDetectionApplication, ipoFallbackTime: number): number {
  if (app.createdAt) {
    const t = new Date(app.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return ipoFallbackTime;
}

/**
 * Extract all valid normalized PAN cards from an application record.
 * Automatically excludes dummy/test PANs following the XUSER...X pattern.
 */
export function extractValidPansFromApplication(app: GapDetectionApplication): string[] {
  const pans: string[] = [];
  if (Array.isArray(app.panNumbers) && app.panNumbers.length > 0) {
    for (const raw of app.panNumbers) {
      const clean = normalizePan(raw);
      if (clean && isValidNormalizedPan(clean) && !isDummyXuserPan(clean)) {
        pans.push(clean);
      }
    }
  }
  return Array.from(new Set(pans));
}

/**
 * Determine if an application record represents a valid, non-cancelled participation.
 */
export function isValidApplicationRecord(app: GapDetectionApplication): boolean {
  if (!app || !app.ipoId) return false;
  const status = (app.status || "").toUpperCase();
  if (status === "CANCELLED" || status === "DELETED" || status === "REJECTED") {
    return false;
  }
  return true;
}

/**
 * Format date nicely for table display: e.g. "27 Aug 2026"
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format member username / display label: e.g. "@shree"
 */
export function formatMemberHandle(app?: GapDetectionApplication | null): { memberName: string; memberUsername?: string; displayMember: string } {
  if (!app) return { memberName: "Member", displayMember: "Member" };

  if (app.contributors && Array.isArray(app.contributors) && app.contributors.length > 0) {
    const rawNames = app.contributors
      .map((c) => (c.username || c.memberName || c.name || "").trim())
      .filter(Boolean)
      .map((n) => (n.startsWith("@") ? n : `@${n}`));
    const unique = Array.from(new Set(rawNames));
    if (unique.length > 0) {
      return {
        memberName: app.applicantName || unique[0].replace("@", ""),
        memberUsername: unique[0].replace("@", ""),
        displayMember: unique.length === 1 ? unique[0] : unique.join(", "),
      };
    }
  }

  const username = app.applicantUsername?.trim();
  const name = app.applicantName?.trim() || "Member";
  const display = username ? (username.startsWith("@") ? username : `@${username}`) : name;

  return {
    memberName: name,
    memberUsername: username ? username.replace("@", "") : undefined,
    displayMember: display,
  };
}

/**
 * Main Pure Gap Detection Engine
 */
export function detectIpoApplicantGap({
  allIpos,
  allApplications,
  selectedCurrentIpoId,
}: {
  allIpos: GapDetectionIpo[];
  allApplications: GapDetectionApplication[];
  selectedCurrentIpoId?: string | null;
}): IpoApplicantGapResult {
  // Sort IPOs chronologically descending
  const sortedIpos = [...allIpos].sort((a, b) => getIpoTimestamp(b) - getIpoTimestamp(a));

  const availableIpos = sortedIpos.map((ipo) => ({
    id: ipo.id,
    name: ipo.name,
    status: ipo.status,
    category: ipo.category,
  }));

  // Resolve current IPO target
  let currentIpo = selectedCurrentIpoId
    ? allIpos.find((i) => i.id === selectedCurrentIpoId) || null
    : null;

  if (!currentIpo && sortedIpos.length > 0) {
    // Default to active open IPO, or first in list
    const openIpo = sortedIpos.find((i) => i.status === "APPLICATION_OPEN" || i.status === "OPEN");
    currentIpo = openIpo || sortedIpos[0];
  }

  if (!currentIpo) {
    return {
      isCurrentIpoSelected: false,
      selectedIpoId: null,
      selectedIpoName: null,
      totalHistoricalIposConsidered: 0,
      historicalUniquePansCount: 0,
      currentIpoApplicantsCount: 0,
      previousPansAppliedToCurrentCount: 0,
      missingPansCount: 0,
      isReconciled: true,
      missingApplicants: [],
      availableIpos: [],
    };
  }

  const currentIpoTimestamp = getIpoTimestamp(currentIpo);
  const ipoMap = new Map<string, GapDetectionIpo>(allIpos.map((i) => [i.id, i]));

  // Previous IPOs: Any IPO distinct from current IPO that closed/opened before or is an archived/historical IPO
  const previousIpos = allIpos.filter((ipo) => {
    if (ipo.id === currentIpo!.id) return false;
    const t = getIpoTimestamp(ipo);
    if (t > 0 && currentIpoTimestamp > 0) {
      return t <= currentIpoTimestamp;
    }
    // If timestamp is not set, treat other completed/closed IPOs as previous
    return true;
  });

  const previousIpoIds = new Set<string>(previousIpos.map((i) => i.id));

  // 1. Identify all applicant PANs in Current IPO
  const currentIpoPanSet = new Set<string>();
  for (const app of allApplications) {
    if (app.ipoId === currentIpo.id && isValidApplicationRecord(app)) {
      const pans = extractValidPansFromApplication(app);
      for (const pan of pans) {
        currentIpoPanSet.add(pan);
      }
    }
  }

  // 2. Aggregate historical participation for all PANs from previous IPOs
  interface PanAccumulator {
    pan: string;
    memberId?: string;
    memberName: string;
    memberUsername?: string;
    displayMember: string;
    ipoParticipations: Map<string, PreviousIpoParticipationRecord>;
    allApplicationRecords: PreviousIpoParticipationRecord[];
    latestTimestamp: number;
    latestApplicationDate: string;
    latestIpoId: string;
    latestIpoName: string;
  }

  const panHistoryMap = new Map<string, PanAccumulator>();

  for (const app of allApplications) {
    if (!previousIpoIds.has(app.ipoId) || !isValidApplicationRecord(app)) {
      continue;
    }

    const ipo = ipoMap.get(app.ipoId);
    const ipoName = app.ipoName || ipo?.name || "IPO";
    const ipoTime = ipo ? getIpoTimestamp(ipo) : 0;
    const appTime = getAppTimestamp(app, ipoTime);
    const appDate = app.createdAt || (ipo?.metrics?.closeDate ?? "");
    const isAllotted = app.status === "ALLOTTED" || app.allotmentStatus === "ALLOTTED";
    const pans = extractValidPansFromApplication(app);

    const { memberName, memberUsername, displayMember } = formatMemberHandle(app);

    for (const pan of pans) {
      let acc = panHistoryMap.get(pan);
      if (!acc) {
        acc = {
          pan,
          memberId: app.memberId,
          memberName,
          memberUsername,
          displayMember,
          ipoParticipations: new Map(),
          allApplicationRecords: [],
          latestTimestamp: 0,
          latestApplicationDate: "",
          latestIpoId: "",
          latestIpoName: "",
        };
        panHistoryMap.set(pan, acc);
      }

      // Update member info if missing
      if (!acc.memberUsername && memberUsername) {
        acc.memberUsername = memberUsername;
        acc.displayMember = displayMember;
      }
      if (acc.memberName === "Member" && memberName !== "Member") {
        acc.memberName = memberName;
      }

      const participationRecord: PreviousIpoParticipationRecord = {
        ipoId: app.ipoId,
        ipoName,
        category: ipo?.category || "Mainboard",
        applicationId: app.id,
        applicationDate: appDate,
        status: app.status || "AWAITING",
        allotmentStatus: app.allotmentStatus || app.status,
        isAllotted,
        lotsCount: app.numberOfPanCards || 1,
        totalContribution: app.totalContribution || 0,
        createdAt: app.createdAt || appDate,
      };

      acc.allApplicationRecords.push(participationRecord);

      // Deduplicate multiple applications for the same previous IPO into 1 IPO participation
      const existingIpoEntry = acc.ipoParticipations.get(app.ipoId);
      if (!existingIpoEntry) {
        acc.ipoParticipations.set(app.ipoId, participationRecord);
      } else {
        // If one application was allotted, preserve allotted status
        if (isAllotted) {
          existingIpoEntry.isAllotted = true;
          existingIpoEntry.status = "ALLOTTED";
        }
      }

      // Track newest participation date
      if (appTime >= acc.latestTimestamp) {
        acc.latestTimestamp = appTime;
        acc.latestApplicationDate = appDate;
        acc.latestIpoId = app.ipoId;
        acc.latestIpoName = ipoName;
      }
    }
  }

  // 3. Mathematical Reconciliation
  const historicalUniquePansCount = panHistoryMap.size;
  const currentIpoApplicantsCount = currentIpoPanSet.size;

  let previousPansAppliedToCurrentCount = 0;
  for (const pan of panHistoryMap.keys()) {
    if (currentIpoPanSet.has(pan)) {
      previousPansAppliedToCurrentCount++;
    }
  }

  // 4. Extract Missing PAN items (Previous PANs - Current IPO PANs)
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const nowTime = Date.now();

  const missingApplicants: MissingApplicantPanItem[] = [];

  for (const [pan, acc] of panHistoryMap.entries()) {
    // CRITICAL EXCLUSION: If PAN has already applied to Current IPO, DO NOT SHOW
    if (currentIpoPanSet.has(pan)) {
      continue;
    }

    const previousIpoCount = acc.ipoParticipations.size;
    if (previousIpoCount <= 0) {
      continue;
    }

    const appliedRecently = acc.latestTimestamp > 0 && nowTime - acc.latestTimestamp <= sixtyDaysMs;

    // Deterministic Priority Classification:
    // HIGH: Participated in 3+ previous IPOs OR applied within last 60 days
    // MEDIUM: Participated in 2 previous IPOs
    // LOW: Participated in 1 previous IPO
    let priority: ApplicantGapPriority = "LOW";
    let priorityReason = "Participated in 1 previous IPO";

    if (previousIpoCount >= 3) {
      priority = "HIGH";
      priorityReason = `Frequent applicant across ${previousIpoCount} previous IPOs`;
    } else if (appliedRecently) {
      priority = "HIGH";
      priorityReason = "Active applicant within the last 60 days";
    } else if (previousIpoCount === 2) {
      priority = "MEDIUM";
      priorityReason = "Participated in 2 previous IPOs";
    }

    // Sort participation history chronologically descending
    const participationHistory = Array.from(acc.ipoParticipations.values()).sort(
      (a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
    );

    missingApplicants.push({
      pan,
      formattedPan: pan,
      memberId: acc.memberId,
      memberName: acc.memberName,
      memberUsername: acc.memberUsername,
      displayMember: acc.displayMember,
      previousIpoCount,
      totalApplicationsCount: acc.allApplicationRecords.length,
      lastAppliedIpoId: acc.latestIpoId,
      lastAppliedIpoName: acc.latestIpoName,
      lastApplicationDate: acc.latestApplicationDate,
      formattedLastDate: formatDisplayDate(acc.latestApplicationDate),
      priority,
      priorityReason,
      appliedRecently,
      participationHistory,
    });
  }

  // Default Sort: Most previous IPO participation descending, then most recent date
  missingApplicants.sort((a, b) => {
    if (b.previousIpoCount !== a.previousIpoCount) {
      return b.previousIpoCount - a.previousIpoCount;
    }
    const tA = new Date(a.lastApplicationDate).getTime() || 0;
    const tB = new Date(b.lastApplicationDate).getTime() || 0;
    return tB - tA;
  });

  const missingPansCount = missingApplicants.length;
  const isReconciled = historicalUniquePansCount - previousPansAppliedToCurrentCount === missingPansCount;

  return {
    isCurrentIpoSelected: true,
    selectedIpoId: currentIpo.id,
    selectedIpoName: currentIpo.name,
    totalHistoricalIposConsidered: previousIpos.length,
    historicalUniquePansCount,
    currentIpoApplicantsCount,
    previousPansAppliedToCurrentCount,
    missingPansCount,
    isReconciled,
    missingApplicants,
    availableIpos,
  };
}

/**
 * Filter and search helper for missing applicants
 */
export function filterAndSortGapApplicants({
  items,
  filter = "ALL",
  searchQuery = "",
  sortOption = "most_previous",
}: {
  items: MissingApplicantPanItem[];
  filter?: GapParticipationFilter;
  searchQuery?: string;
  sortOption?: GapSortOption;
}): MissingApplicantPanItem[] {
  let result = [...items];

  // 1. Filter
  if (filter === "RECENT") {
    result = result.filter((item) => item.appliedRecently);
  } else if (filter === "2_PLUS") {
    result = result.filter((item) => item.previousIpoCount >= 2);
  } else if (filter === "3_PLUS") {
    result = result.filter((item) => item.previousIpoCount >= 3);
  }

  // 2. Search
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    const cleanPanQuery = normalizePan(searchQuery);

    result = result.filter((item) => {
      if (cleanPanQuery && item.pan.includes(cleanPanQuery)) return true;
      if (item.pan.toLowerCase().includes(q)) return true;
      if (item.memberName.toLowerCase().includes(q)) return true;
      if (item.memberUsername && item.memberUsername.toLowerCase().includes(q)) return true;
      if (item.displayMember.toLowerCase().includes(q)) return true;
      if (item.lastAppliedIpoName.toLowerCase().includes(q)) return true;
      if (item.participationHistory.some((p) => p.ipoName.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  // 3. Sort
  result.sort((a, b) => {
    if (sortOption === "most_previous") {
      if (b.previousIpoCount !== a.previousIpoCount) {
        return b.previousIpoCount - a.previousIpoCount;
      }
      const tA = new Date(a.lastApplicationDate).getTime() || 0;
      const tB = new Date(b.lastApplicationDate).getTime() || 0;
      return tB - tA;
    }
    if (sortOption === "most_recent" || sortOption === "date_desc") {
      const tA = new Date(a.lastApplicationDate).getTime() || 0;
      const tB = new Date(b.lastApplicationDate).getTime() || 0;
      return tB - tA;
    }
    if (sortOption === "pan_asc") {
      return a.pan.localeCompare(b.pan);
    }
    if (sortOption === "member_asc") {
      return (a.memberUsername || a.memberName).localeCompare(b.memberUsername || b.memberName);
    }
    return 0;
  });

  return result;
}

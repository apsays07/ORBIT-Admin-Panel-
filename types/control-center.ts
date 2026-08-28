export type ControlCenterSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ControlCenterIssueStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "RESOLVED"
  | "IGNORED"
  | "KNOWN_EXCEPTION";

export type ControlCenterIssueType =
  | "DUPLICATE_PAN"
  | "DUPLICATE_APPLICATION"
  | "CAPITAL_MISMATCH"
  | "LOT_MISMATCH"
  | "PAN_MULTI_MEMBER"
  | "ORPHAN_APPLICATION"
  | "MISSING_PAN_APPLICATION"
  | "MANDATE_PENDING"
  | "MISSING_ALLOTMENT"
  | "INCOMPLETE_DATA"
  | "STATUS_CONFLICT"
  | "HISTORICAL_PAN_NOT_APPLIED"
  | "MEMBER_NOT_APPLIED";

export type DuplicateClassification = "EXACT_DUPLICATE" | "POSSIBLE_DUPLICATE";

export type ApplicationLifecycleStatus =
  | "NOT_APPLIED"
  | "APPLICATION_CREATED"
  | "SUBMITTED"
  | "UPI_MANDATE_PENDING"
  | "MANDATE_APPROVED"
  | "AMOUNT_BLOCKED"
  | "ALLOTMENT_PENDING"
  | "ALLOTTED"
  | "NOT_ALLOTTED"
  | "SHARES_CREDITED"
  | "SOLD"
  | "SETTLEMENT_COMPLETE";

export interface IssueResolutionRecord {
  resolvedBy: string;
  resolvedAt: string;
  actionTaken: string;
  notes?: string;
  previousValue?: string | number;
  newValue?: string | number;
  isKnownException?: boolean;
}

export interface ControlCenterIssue {
  id: string;
  severity: ControlCenterSeverity;
  priorityReason: string;
  type: ControlCenterIssueType;
  title: string;
  exactReason: string;
  ipoId: string;
  ipoName: string;
  memberId?: string;
  memberName?: string;
  memberUsername?: string;
  pan?: string;
  applicationId?: string;
  detectedAt: string;
  status: ControlCenterIssueStatus;
  affectedAmount?: number;
  affectedLots?: number;
  expectedValue?: string | number;
  actualValue?: string | number;
  discrepancyDelta?: string | number;
  duplicateClassification?: DuplicateClassification;
  recommendedAction?: string;
  resolutionRecord?: IssueResolutionRecord;
  details?: Record<string, unknown>;
}

export interface ImpactSummary {
  totalCapitalAtRisk: number;
  totalApplicationsAffected: number;
  totalMembersAffected: number;
  totalLotsAffected: number;
  criticalIssuesCount: number;
  highIssuesCount: number;
  mediumIssuesCount: number;
  lowIssuesCount: number;
  knownExceptionsCount: number;
  resolvedIssuesCount: number;
}

export interface CapitalDiscrepancyItem {
  id: string;
  applicationId?: string;
  ipoId: string;
  ipoName: string;
  memberId?: string;
  memberName: string;
  memberUsername?: string;
  panNumbers: string[];
  lots: number;
  expectedCapital: number;
  appliedCapital: number;
  blockedCapital: number;
  releasedCapital: number;
  allottedCapital: number;
  realizedAmount: number;
  discrepancy: number;
  reason: string;
}

export interface CapitalReconciliationSummary {
  expectedCapital: number;
  appliedCapital: number;
  blockedCapital: number;
  releasedCapital: number;
  allottedCapital: number;
  realizedAmount: number;
  netDiscrepancy: number;
  totalDiscrepantRecordsCount: number;
  discrepancies: CapitalDiscrepancyItem[];
}

export interface LotDiscrepancyItem {
  id: string;
  applicationId?: string;
  ipoId: string;
  ipoName: string;
  memberId?: string;
  memberName: string;
  memberUsername?: string;
  panNumbers: string[];
  applicationLots: number;
  confirmedLots: number;
  allottedLots: number;
  profitLots: number;
  soldLots: number;
  discrepancyDelta: number;
  reason: string;
}

export interface LotReconciliationSummary {
  totalApplicationLots: number;
  totalConfirmedLots: number;
  totalAllottedLots: number;
  totalProfitLots: number;
  totalSoldLots: number;
  lotDiscrepantRecordsCount: number;
  discrepancies: LotDiscrepancyItem[];
}

export interface PanMultiMemberConflict {
  pan: string;
  classification: DuplicateClassification;
  members: Array<{
    memberId: string;
    memberName: string;
    memberUsername?: string;
    applicationCount: number;
    lastIpoName: string;
  }>;
}

export interface PanIntelligenceSummary {
  totalHistoricalGenuinePans: number;
  currentApplicantsCount: number;
  historicalApplicantsReAppliedCount: number;
  missingGenuinePansCount: number;
  newApplicantsCount: number;
  multiMemberPanConflictsCount: number;
  duplicatePanApplicationsCount: number;
  multiMemberConflicts: PanMultiMemberConflict[];
  missingGenuinePans: Array<{
    pan: string;
    memberId?: string;
    memberName: string;
    memberUsername?: string;
    previousIposCount: number;
    lastIpoName: string;
    lastApplicationDate: string;
    appliedRecently: boolean;
  }>;
}

export interface PanAuditTimelineItem {
  pan: string;
  memberName: string;
  memberUsername?: string;
  totalHistoricalIpos: number;
  lastApplicationDate: string;
  isAppliedInCurrentIpo: boolean;
  currentIpoStatus: string;
  timeline: Array<{
    ipoId: string;
    ipoName: string;
    applicationDate: string;
    lots: number;
    status: string;
    isAllotted: boolean;
    totalContribution: number;
  }>;
}

export interface MemberLifecycleStep {
  title: string;
  status: "COMPLETE" | "CURRENT" | "PENDING" | "ALERT";
  description: string;
  timestamp?: string;
}

export interface Member360Data {
  memberId: string;
  name: string;
  username: string;
  role: string;
  status: string;
  panMasked?: string;
  panFull?: string;
  totalCapitalDeployed: number;
  currentBlockedCapital: number;
  totalAllottedLots: number;
  totalProfitRealized: number;
  totalIposParticipated: number;
  activeIssuesCount: number;
  activeIssues: ControlCenterIssue[];
  currentIpoApplications: Array<{
    id: string;
    ipoId: string;
    ipoName: string;
    lots: number;
    amount: number;
    panNumbers: string[];
    status: string;
    allotmentStatus?: string;
    createdAt: string;
  }>;
  previousIpoHistory: Array<{
    ipoId: string;
    ipoName: string;
    lots: number;
    amount: number;
    status: string;
    isAllotted: boolean;
    profit?: number;
    date: string;
  }>;
  lifecycleTimeline: MemberLifecycleStep[];
}

export interface ConsistencyCheckItem {
  label: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
}

export interface Application360Data {
  applicationId: string;
  ipoId: string;
  ipoName: string;
  memberId?: string;
  applicantName: string;
  applicantUsername?: string;
  fundingStructure: string;
  numberOfPanCards: number;
  panNumbers: string[];
  totalContribution: number;
  expectedContribution: number;
  status: string;
  allotmentStatus?: string;
  allottedLots: number;
  profitLots: number;
  realizedProfit?: number;
  createdAt: string;
  consistencyChecklist: ConsistencyCheckItem[];
  relatedIssues: ControlCenterIssue[];
}

export interface ReconciliationTimelineItem {
  id: string;
  timestamp: string;
  formattedTime: string;
  title: string;
  description: string;
  category: "APPLICATION" | "RECONCILIATION" | "ALLOTMENT" | "PROFIT" | "SECURITY" | "MEMBER" | "SYSTEM";
  type: "DISCREPANCY_DETECTED" | "ISSUE_RESOLVED" | "RECORD_UPDATED" | "SYSTEM_AUDIT";
  actorUsername?: string;
  memberUsername?: string;
  ipoName?: string;
  severity?: ControlCenterSeverity;
  metadata?: Record<string, unknown>;
}

export interface ExplainNumberBreakdownItem {
  id: string;
  label: string;
  subLabel?: string;
  value: number;
  formattedValue: string;
  percentageOfTotal?: number;
  pan?: string;
  memberUsername?: string;
  ipoName?: string;
  statusBadge?: string;
}

export interface ExplainNumberMetric {
  metricKey: string;
  title: string;
  subtitle: string;
  totalValue: number;
  formattedTotalValue: string;
  formulaDescription: string;
  breakdownCount: number;
  breakdownItems: ExplainNumberBreakdownItem[];
}

export interface ControlCenterKPIs {
  selectedIpoId: string;
  selectedIpoName: string;
  totalApplications: number;
  pendingActionsCount: number;
  capitalAtRisk: number;
  historicalPansNotApplied: number;
  duplicateRecordsCount: number;
  capitalMismatchesCount: number;
  lotMismatchesCount: number;
  mandatesPending: number;
  allotmentPending: number;
  totalOpenIssuesCount: number;
  criticalSeverityIssuesCount: number;
  highSeverityIssuesCount: number;
  mediumSeverityIssuesCount: number;
  lowSeverityIssuesCount: number;
  knownExceptionsCount: number;
}

export interface ControlCenterDashboardData {
  kpis: ControlCenterKPIs;
  impactSummary: ImpactSummary;
  capitalReconciliation: CapitalReconciliationSummary;
  lotReconciliation: LotReconciliationSummary;
  panIntelligence: PanIntelligenceSummary;
  issues: ControlCenterIssue[];
  reconciliationTimeline: ReconciliationTimelineItem[];
  availableIpos: Array<{ id: string; name: string; status?: string; category?: string; count?: number }>;
  selectedIpoId: string;
  selectedIpoName: string;
}

export interface IssueStatusOverrideRecord {
  _id?: string;
  issueId: string;
  status: ControlCenterIssueStatus;
  notes?: string;
  actionTaken?: string;
  previousValue?: string | number;
  newValue?: string | number;
  updatedAt: string;
  updatedBy?: string;
}

export type IssueSeverity = "CRITICAL" | "WARNING" | "INFO";

export type IssueCategory =
  | "ORPHAN"
  | "DUPLICATE"
  | "MISMATCH"
  | "MISSING_FIELD"
  | "INVALID_RELATION"
  | "FORMAT_ERROR";

export interface DatabaseIntegrityIssue {
  id: string;
  issueType: IssueCategory;
  severity: IssueSeverity;
  entity: "MEMBER" | "APPLICATION" | "CONTRIBUTOR" | "IPO" | "PROFIT_DISTRIBUTION" | "SESSION" | "ACTIVITY";
  recordId: string;
  title: string;
  problem: string;
  suggestedAction?: "REPAIR_RECONCILE" | "REVIEW" | "DEACTIVATE_ORPHAN" | "MANUAL_FIX";
  repairable: boolean;
  metadata?: Record<string, any>;
  detectedAt: string;
}

export interface CollectionHealthMetric {
  name: string;
  documentCount: number;
  indexesCount: number;
  status: "HEALTHY" | "ATTENTION" | "DEGRADED";
  issuesCount: number;
}

export interface DatabaseHealthReport {
  status: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  pingLatencyMs: number;
  checkedAt: string;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  orphanedRecordsCount: number;
  duplicateRecordsCount: number;
  consistencyErrorsCount: number;
  collections: CollectionHealthMetric[];
  issues: DatabaseIntegrityIssue[];
  dbName?: string;
}

export interface SafeRepairResult {
  success: boolean;
  error?: string;
  message?: string;
  repairedRecordId?: string;
}

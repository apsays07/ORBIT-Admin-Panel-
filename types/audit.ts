export type AuditSeverity = "SUCCESS" | "INFO" | "WARNING" | "ERROR" | string;
export type AuditCategory = "APPLICATION" | "PRODUCT" | "USER" | "SECURITY" | "ALLOTMENT" | "PROFIT" | string;

export interface AuditRecord {
  _id?: unknown;
  id: string;
  eventType?: string;
  type?: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  actorUserId?: string;
  actorMemberId?: string;
  actorName?: string;
  actorUsername?: string;
  actorRole?: string;
  memberName?: string | null;
  userId?: string | null;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  ipoId?: string;
  memberId?: string;
  applicationId?: string;
  metadata?: Record<string, unknown>;
  title?: string | null;
  subtitle?: string | null;
  timestamp?: string;
  createdAt?: string;
  isSecurityEvent?: boolean;
  loginContext?: string | null;
  sessionId?: string | null;
}

export interface AuditMetricsSummary {
  totalActivities: number;
  securityEventsCount: number;
  adminActionsCount: number;
  activeActorsCount: number;
}

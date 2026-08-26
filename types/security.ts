import { AuditRecord } from "./audit";

export interface SessionRecord {
  _id?: unknown;
  id: string;
  userId: string;
  sessionTokenHash?: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt: string;
  lastActiveAt?: string;
  revokedAt?: string | null;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  deviceName?: string;
  ipAddress?: string;
  isActive?: boolean;
}

export interface SecurityOverviewData {
  metrics: {
    activeSessionsCount: number;
    totalSessionsCount: number;
    superAdminsCount: number;
    securityEventsCount: number;
  };
  sessions: SessionRecord[];
  recentSecurityEvents: AuditRecord[];
}

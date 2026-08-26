import { MemberPermissions } from "./member";
import { SessionRecord } from "./security";
import { AuditRecord } from "./audit";

export interface AdminPreferences {
  theme?: "dark" | "system" | "light";
  compactView?: boolean;
  defaultLandingPage?: string;
  notifyOnNewApplication?: boolean;
  notifyOnSecurityAlert?: boolean;
  notifyOnMemberJoin?: boolean;
  notifyOnProfitDistribution?: boolean;
}

export interface AdminProfileData {
  member: {
    id: string;
    name: string;
    displayName?: string;
    username: string;
    email?: string;
    phone?: string;
    avatar?: string;
    role: string;
    status: string;
    joinedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    panMasked?: string;
    panFull?: string;
    permissions?: MemberPermissions;
    preferences?: AdminPreferences;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    lastLoginAt?: string;
  };
  metrics: {
    completionPercentage: number;
    completedFields: string[];
    missingFields: string[];
    activeSessionsCount: number;
    securityEventsCount: number;
    auditActionsCount: number;
  };
  sessions: SessionRecord[];
  recentActivities: AuditRecord[];
  currentSessionId?: string;
}

export interface PasswordChangeResult {
  success: boolean;
  error?: string;
}

export interface ProfileUpdateResult {
  success: boolean;
  error?: string;
  updatedField?: string;
  newValue?: unknown;
  newUsername?: string;
}

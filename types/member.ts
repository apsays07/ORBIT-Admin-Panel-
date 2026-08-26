export interface MemberPermissions {
  canSubmitApplications?: boolean;
  canDistributeProfit?: boolean;
  canEditIpos?: boolean;
  canAccessAdminConsole?: boolean;
  canManageMembers?: boolean;
}

export interface MemberData {
  _id?: unknown;
  id: string; // immutable stable ID e.g. "mem_..."
  name: string; // display name
  username: string; // unique username handle
  email?: string;
  phone?: string;
  avatar?: string;
  role: "SUPER_ADMIN" | "CORE_MEMBER" | "MEMBER" | string;
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED" | string;
  
  // Financial & KYC
  panMasked?: string;
  panFull?: string;
  defaultContribution?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;

  // Contact & Address
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;

  // Metadata & Timestamps
  joinedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lastPasswordResetAt?: string;

  // Security (protected on server, optional for client)
  passwordHash?: string;
  salt?: string;

  // Granular Permissions
  permissions?: MemberPermissions;

  // Calculated Metrics
  iposAppliedCount?: number;
  totalContributed?: number;
  totalProfitEarned?: number;
}

export interface CreateMemberInput {
  name: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: string;
  password?: string;
  panFull?: string;
  defaultContribution?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  permissions?: MemberPermissions;
}

export interface UpdateMemberInput {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: string;
  panFull?: string;
  defaultContribution?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  permissions?: MemberPermissions;
  lastKnownUpdatedAt?: string;
}

export interface MemberRosterMetrics {
  totalMembers: number;
  adminCount: number;
  totalApplicationsSubmitted: number;
  verifiedPercentage: number;
}

export interface MemberLeaderboardRow {
  rank: number;
  member: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  rawValue: number;
  valueDisplay: string;
  context?: string;
}

export interface MemberPerformanceCategory {
  id: string;
  metricId: string;
  badgeLabel: string;
  title: string;
  subtitle: string;
  accentColor: "emerald" | "indigo" | "amber" | "sky" | "purple" | "rose" | "teal";
  rows: MemberLeaderboardRow[];
  isEmpty?: boolean;
}

export interface GetMembersParams {
  query?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GetMembersResponse {
  members: MemberData[];
  total: number;
  page: number;
  totalPages: number;
  metrics: MemberRosterMetrics;
  currentUserUsername?: string;
}


export type ApplicationStatus = "AWAITING" | "ALLOTTED" | "NOT_ALLOTTED" | string;
export type FundingStructure = "SOLO" | "MULTI_FRIEND" | string;

export interface IpoOption {
  id: string;
  name: string;
  count: number;
}

export interface ApplicationContributor {
  memberId: string;
  memberName: string;
  amount: number;
  percentage: number;
}

export interface ApplicationRecord {
  _id?: string;
  id: string;
  ipoId: string;
  ipoName: string;
  memberId: string;
  applicantName: string;
  applicantUsername?: string;
  memberAvatar?: string;
  fundingStructure: FundingStructure;
  numberOfPanCards: number;
  panNumbers: string[];
  totalContribution: number;
  status: ApplicationStatus;
  allotmentStatus?: ApplicationStatus;
  allottedIndices?: number[];
  contributors?: ApplicationContributor[];
  createdAt: string;
  updatedAt?: string;
}

export interface MemberRecord {
  _id?: string;
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: string;
  status: string;
  panMasked?: string;
  panFull?: string;
  defaultContribution?: number;
  joinedAt?: string;
  createdAt?: string;
}

export interface ApplicationMetricsSummary {
  totalApplications: number;
  totalFormsCount?: number;
  totalApplicants: number;
  awaitingAllotment: number;
  allottedApplications: number;
  notAllottedApplications: number;
  totalCapitalPooled: number;
}

export interface GetApplicationsParams {
  query?: string;
  ipoId?: string;
  memberId?: string;
  status?: string;
  fundingStructure?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetApplicationsResponse {
  applications: ApplicationRecord[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  metrics: ApplicationMetricsSummary;
  availableIpos: IpoOption[];
  availableStatuses: string[];
  selectedIpoId?: string;
  selectedIpoName?: string;
}


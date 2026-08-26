
export type NexoIPOStatus =
  | "APPLICATION_OPEN"
  | "ALLOTMENT_OUT"
  | "UPCOMING"
  | "CLOSED"
  | "COMPLETED"
  | "OPEN"
  | "LISTED";

export interface IPOMetrics {
  issueSize?: string;
  priceBand?: {
    min: number;
    max: number;
  };
  lotSize?: number;
  minInvestment?: number;
  gmpPercent?: number;
  gmpPrice?: number;
  estimatedListingPrice?: number;
  gmpUpdatedOn?: string;
  gmpSource?: string;
  gmpNotes?: string;
  openDate?: string;
  closeDate?: string;
  allotmentDate?: string;
  listingDate?: string;
  fundUnblockDate?: string;
}

export interface MemberPayout {
  memberId: string;
  name: string;
  pan?: string;
  contribution: number;
  lots: number;
  profit: number;
}

export interface ProfitDistribution {
  ipoId?: string;
  isPublished?: boolean;
  totalProfit?: number;
  totalLots?: number;
  allottedLots?: number;
  oneLotProfit?: number;
  publishedAt?: string;
  publishedBy?: string;
  memberPayouts?: MemberPayout[];
}

export interface NexoIPORecord {
  _id?: string;
  id: string;
  name: string;
  nameNormalized?: string;
  company: string;
  category?: "Mainboard" | "SME" | string;
  status: NexoIPOStatus | string;
  recommendation?: "APPLY" | "MAY AVOID" | "AVOID" | "NEUTRAL" | string;
  thesis?: string;
  logo?: string;
  isHidden?: boolean;
  metrics?: IPOMetrics;
  participantsCount?: number;
  combinedCapital?: number;
  applications?: unknown[];
  registrarUrl?: string;
  allotmentFinalized?: boolean;
  allotmentFinalizedAt?: string;
  allotmentFinalizedBy?: string;
  isCompleted?: boolean;
  completedAt?: string;
  completedBy?: string;
  createdAt?: string;
  addedAt?: string;
  updatedAt?: string;
  createdBy?: string;
  applicationCount?: number;
  groupDecision?: string;
  groupDecisionAuthor?: string;
  biddingDecision?: string;
  profitDistribution?: ProfitDistribution;
}

// Alias for Orbit
export type IPO = NexoIPORecord;

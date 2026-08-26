export interface GMPData {
  ipoId: string;
  symbol?: string;
  companyName?: string;
  value: number;
  percentage?: number;
  issuePrice?: number;
  estimatedListingPrice?: number;
  estimatedListingGainPercent?: number;
  /** Issue size in Crores from InvestorGain */
  issueSizeCr?: number;
  updatedAt: string;
  fetchedAt: string;
  source: string;
  sourceUrl?: string;
  isOfficial: false;
  confidence?: "LOW" | "MEDIUM" | "HIGH";
}

export interface GMPHistoryPoint {
  ipoId: string;
  value: number;
  percentage?: number;
  timestamp: string;
  source: string;
  sourceUrl?: string;
}

export interface GMPSourceValue {
  source: string;
  value: number;
  percentage?: number;
  updatedAt: string;
}

export interface CompanyLogo {
  url: string;
  source: string;
  companyName: string;
  domain?: string;
  type: "icon" | "symbol" | "logo";
  format: "svg" | "png" | "webp" | "jpg";
  fetchedAt: string;
}

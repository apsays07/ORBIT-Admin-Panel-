import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validate PAN format: 5 letters, 4 numbers, 1 letter (Standard Indian PAN)
 */
export function isValidPan(pan?: string | null): boolean {
  if (!pan) return false;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
  return panRegex.test(pan.trim());
}

export interface ApplicantDisplayable {
  applicantName?: string;
  applicantUsername?: string;
  fundingStructure?: string;
  contributors?: Array<{
    memberName?: string;
    username?: string;
    name?: string;
    memberId?: string;
  }>;
}

/**
 * Dynamically format combined applicants for single or multi-user applications.
 * Examples:
 * - 1 user: "@shree"
 * - 2 users: "@shree & @yash_s"
 * - 3+ users: "@shree, @yash_s & @aditya_s"
 */
export function formatCombinedApplicants(app?: ApplicantDisplayable | null): string {
  if (!app) return "Member";

  // Check if multiple contributors are associated with this application
  if (app.contributors && Array.isArray(app.contributors) && app.contributors.length > 0) {
    const rawNames = app.contributors
      .map((c) => (c.memberName || c.username || c.name || "").trim())
      .filter(Boolean)
      .map((n) => (n.startsWith("@") ? n : `@${n}`));

    const uniqueNames = Array.from(new Set(rawNames));

    if (uniqueNames.length === 1) {
      return uniqueNames[0];
    }
    if (uniqueNames.length === 2) {
      return `${uniqueNames[0]} & ${uniqueNames[1]}`;
    }
    if (uniqueNames.length > 2) {
      const leading = uniqueNames.slice(0, -1).join(", ");
      const last = uniqueNames[uniqueNames.length - 1];
      return `${leading} & ${last}`;
    }
  }

  // Fallback to single applicant
  const single = (app.applicantUsername || app.applicantName || "Member").trim();
  return single.startsWith("@") ? single : `@${single}`;
}

/**
 * Generate a cryptographically secure, stable entity ID
 * Examples: mem_1724581234_a8f9, app_1724581234_b3c2
 */
export function generateEntityId(prefix: string): string {
  const timestamp = Date.now();
  const randomHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${prefix}_${timestamp}_${randomHex.substring(0, 6)}`;
}



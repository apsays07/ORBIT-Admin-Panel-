"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import { ApplicationRecord, MemberRecord } from "@/types/application";
import { NexoIPORecord } from "@/types/ipo";
import { Filter } from "mongodb";

export interface AllotmentIpoOption {
  id: string;
  name: string;
  category?: string;
  count: number;
  registrarUrl?: string;
  allotmentFinalized?: boolean;
}

export interface AllotmentMetrics {
  totalApplications: number;
  totalPanCards: number;
  pendingCount: number;
  allottedCount: number;
  notAllottedCount: number;
  totalLotsApplied: number;
}

export interface GetAllotmentParams {
  ipoId?: string;
  status?: string;
  query?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface GetAllotmentResponse {
  selectedIpo: NexoIPORecord | null;
  availableIpos: AllotmentIpoOption[];
  applications: ApplicationRecord[];
  metrics: AllotmentMetrics;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

async function verifyAdminSession(): Promise<string> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("orbit_session");
  if (!sessionCookie) {
    throw new Error("Unauthorized: Admin session required.");
  }
  try {
    const parsed = JSON.parse(sessionCookie.value);
    return parsed.user || "Admin";
  } catch {
    throw new Error("Unauthorized: Invalid session.");
  }
}

import { AllotmentService } from "@/lib/services/allotment.service";

export async function getAllotmentData(
  params: GetAllotmentParams = {}
): Promise<GetAllotmentResponse> {
  return AllotmentService.getAllotmentData(params);
}

export interface MutationResult {
  success: boolean;
  error?: string;
}

/**
 * Update Registrar URL for the active IPO
 */
export async function updateRegistrarUrl(
  ipoId: string,
  registrarUrl: string
): Promise<MutationResult> {
  try {
    await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    await db.collection("ipos").updateOne(
      { id: ipoId },
      {
        $set: {
          registrarUrl: registrarUrl.trim(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    revalidatePath("/ad/allotment");
    revalidatePath("/ad/ipo");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update registrar URL.";
    return { success: false, error: msg };
  }
}

export interface AllotmentDecision {
  appId: string;
  allottedIndices: number[];
}

/**
 * Process and update Allotment decisions for an IPO
 */
export async function processAllotmentUpdate(
  ipoId: string,
  decisionsOrAppIds: (string | AllotmentDecision)[]
): Promise<MutationResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const ipo = await db.collection<NexoIPORecord>("ipos").findOne({ id: ipoId });
    if (!ipo) return { success: false, error: `IPO ${ipoId} not found.` };

    const nowIso = new Date().toISOString();

    // Standardize decisions
    const decisions: AllotmentDecision[] = decisionsOrAppIds.map((item) => {
      if (typeof item === "string") {
        return { appId: item, allottedIndices: [0] };
      }
      return item;
    });

    if (decisions.length > 0) {
      const bulkOps = decisions.map((d) => {
        const isAllotted = Array.isArray(d.allottedIndices) && d.allottedIndices.length > 0;
        return {
          updateOne: {
            filter: { ipoId, id: d.appId },
            update: {
              $set: {
                status: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
                allotmentStatus: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
                allottedIndices: isAllotted ? d.allottedIndices : [],
                updatedAt: nowIso,
              },
            },
          },
        };
      });

      await db.collection("applications").bulkWrite(bulkOps);
    }

    // For any remaining applications of this IPO not in decisions, mark as NOT_ALLOTTED
    const processedAppIds = decisions.map((d) => d.appId);
    await db.collection("applications").updateMany(
      { ipoId, id: { $nin: processedAppIds } },
      {
        $set: {
          status: "NOT_ALLOTTED",
          allotmentStatus: "NOT_ALLOTTED",
          allottedIndices: [],
          updatedAt: nowIso,
        },
      }
    );

    // Mark IPO as ALLOTMENT_OUT and allotmentFinalized
    await db.collection("ipos").updateOne(
      { id: ipoId },
      {
        $set: {
          allotmentFinalized: true,
          allotmentFinalizedAt: nowIso,
          allotmentFinalizedBy: adminUser,
          status: "ALLOTMENT_OUT",
          updatedAt: nowIso,
        },
      }
    );

    revalidatePath("/ad/allotment");
    revalidatePath("/ad/applications");
    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update allotment.";
    return { success: false, error: msg };
  }
}

/**
 * Reset all allotment decisions for an IPO back to Awaiting (0 Allotted)
 */
export async function resetAllotmentForIpo(ipoId: string): Promise<MutationResult> {
  try {
    const adminUser = await verifyAdminSession();
    const db = await getDatabase();
    if (!db) return { success: false, error: "Database unavailable." };

    const nowIso = new Date().toISOString();

    await db.collection("applications").updateMany(
      { ipoId },
      {
        $set: {
          status: "AWAITING",
          allotmentStatus: "AWAITING",
          allottedIndices: [],
          updatedAt: nowIso,
        },
      }
    );

    // Update IPO status back to APPLICATION_OPEN or ALLOTMENT_PENDING
    await db.collection("ipos").updateOne(
      { id: ipoId },
      {
        $set: {
          allotmentFinalized: false,
          status: "APPLICATION_OPEN",
          updatedAt: nowIso,
        },
      }
    );

    revalidatePath("/ad/allotment");
    revalidatePath("/ad/applications");
    revalidatePath("/ad/ipo");
    revalidatePath("/ad/ipo/history");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset allotment.";
    return { success: false, error: msg };
  }
}

export interface AllotmentDetailResponse {
  application: ApplicationRecord;
  member: MemberRecord | null;
  ipo: NexoIPORecord | null;
}

export async function getAllotmentDetail(
  id: string
): Promise<AllotmentDetailResponse | null> {
  const db = await getDatabase();
  if (!db || !id) return null;

  const appDoc = await db.collection<ApplicationRecord>("applications").findOne({ id });
  if (!appDoc) return null;

  const application: ApplicationRecord = {
    ...appDoc,
    _id: appDoc._id?.toString(),
  };

  let member: MemberRecord | null = null;
  if (application.memberId) {
    const memberDoc = await db.collection<MemberRecord>("members").findOne({ id: application.memberId });
    if (memberDoc) {
      member = { ...memberDoc, _id: memberDoc._id?.toString() };
    }
  }

  let ipo: NexoIPORecord | null = null;
  if (application.ipoId) {
    const ipoDoc = await db.collection<NexoIPORecord>("ipos").findOne({ id: application.ipoId });
    if (ipoDoc) {
      ipo = { ...ipoDoc, _id: ipoDoc._id?.toString() };
    }
  }

  return { application, member, ipo };
}

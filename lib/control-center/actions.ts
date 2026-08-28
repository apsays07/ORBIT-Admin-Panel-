"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db/mongodb";
import { verifyAdminSession } from "@/lib/auth/session";
import { ControlCenterRepository } from "@/lib/repositories/control-center.repository";
import {
  analyzeControlCenterData,
  generateMetricExplanation,
  generateMember360,
  generateApplication360,
  generatePanAuditTimeline,
} from "@/lib/calculations/control-center";
import {
  ControlCenterDashboardData,
  ControlCenterIssueStatus,
  ExplainNumberMetric,
  Member360Data,
  Application360Data,
  PanAuditTimelineItem,
} from "@/types/control-center";
import { logAuditEvent } from "@/lib/audit/actions";

/**
 * Fetch authoritative, dynamic Control Center reconciliation data
 */
export async function getControlCenterData(params?: {
  selectedIpoId?: string;
}): Promise<ControlCenterDashboardData> {
  const db = await getDatabase();
  if (!db) {
    throw new Error("Database connection unavailable");
  }

  const repo = new ControlCenterRepository(db);
  const rawData = await repo.getControlCenterRawData();

  return analyzeControlCenterData({
    allIpos: rawData.allIpos,
    allApplications: rawData.allApplications,
    allMembers: rawData.allMembers,
    profitDistributions: rawData.profitDistributions,
    auditLogs: rawData.auditLogs,
    statusOverrides: rawData.statusOverrides,
    overridesRecords: rawData.overridesDocs,
    selectedIpoId: params?.selectedIpoId,
  });
}

/**
 * Update an issue's status non-destructively
 */
export async function updateControlCenterIssueStatus(params: {
  issueId: string;
  status: ControlCenterIssueStatus;
  notes?: string;
  actionTaken?: string;
  previousValue?: string | number;
  newValue?: string | number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    if (!adminUser) {
      return { success: false, error: "Unauthorized access" };
    }

    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    const repo = new ControlCenterRepository(db);
    const success = await repo.saveIssueStatusOverride({
      issueId: params.issueId,
      status: params.status,
      notes: params.notes,
      actionTaken: params.actionTaken,
      previousValue: params.previousValue,
      newValue: params.newValue,
      updatedBy: adminUser,
    });

    if (success) {
      await logAuditEvent({
        eventType: "CONTROL_CENTER_ISSUE_STATUS_UPDATE",
        category: "SYSTEM",
        severity: "INFO",
        actorUsername: adminUser,
        title: `Issue Status Updated to ${params.status}`,
        subtitle: `Issue ${params.issueId} marked as ${params.status}`,
        metadata: {
          issueId: params.issueId,
          status: params.status,
          notes: params.notes,
          actionTaken: params.actionTaken,
        },
      });

      revalidatePath("/ad/control-center");
      return { success: true };
    }

    return { success: false, error: "Failed to persist issue status override" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Perform safe bulk action on multiple issues
 */
export async function performBulkIssueAction(params: {
  issueIds: string[];
  status: ControlCenterIssueStatus;
  notes?: string;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const adminUser = await verifyAdminSession();
    if (!adminUser) {
      return { success: false, error: "Unauthorized access" };
    }

    const db = await getDatabase();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    const repo = new ControlCenterRepository(db);
    const success = await repo.bulkUpdateIssueStatus({
      issueIds: params.issueIds,
      status: params.status,
      notes: params.notes,
      updatedBy: adminUser,
    });

    if (success) {
      await logAuditEvent({
        eventType: "CONTROL_CENTER_BULK_ACTION",
        category: "SYSTEM",
        severity: "INFO",
        actorUsername: adminUser,
        title: `Bulk Status Update: ${params.status}`,
        subtitle: `Updated ${params.issueIds.length} issues to ${params.status}`,
        metadata: { issueIds: params.issueIds, status: params.status },
      });

      revalidatePath("/ad/control-center");
      return { success: true, count: params.issueIds.length };
    }

    return { success: false, error: "Failed to execute bulk update" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Get dynamic explanation breakdown for any metric
 */
export async function getMetricExplanationData(params: {
  metricKey: string;
  selectedIpoId?: string;
}): Promise<ExplainNumberMetric> {
  const db = await getDatabase();
  if (!db) {
    throw new Error("Database connection unavailable");
  }

  const repo = new ControlCenterRepository(db);
  const rawData = await repo.getControlCenterRawData();

  return generateMetricExplanation({
    metricKey: params.metricKey,
    allIpos: rawData.allIpos,
    allApplications: rawData.allApplications,
    selectedIpoId: params.selectedIpoId,
  });
}

/**
 * Fetch Member 360° Profile
 */
export async function getMember360Data(params: {
  memberId: string;
  selectedIpoId?: string;
}): Promise<Member360Data | null> {
  const db = await getDatabase();
  if (!db) return null;

  const repo = new ControlCenterRepository(db);
  const rawData = await repo.getControlCenterRawData();

  const analysis = analyzeControlCenterData({
    allIpos: rawData.allIpos,
    allApplications: rawData.allApplications,
    allMembers: rawData.allMembers,
    profitDistributions: rawData.profitDistributions,
    auditLogs: rawData.auditLogs,
    statusOverrides: rawData.statusOverrides,
    selectedIpoId: params.selectedIpoId,
  });

  return generateMember360({
    memberId: params.memberId,
    allIpos: rawData.allIpos,
    allApplications: rawData.allApplications,
    allMembers: rawData.allMembers,
    profitDistributions: rawData.profitDistributions,
    detectedIssues: analysis.issues,
    selectedIpoId: params.selectedIpoId,
  });
}

/**
 * Fetch Application 360° Details & Checklist
 */
export async function getApplication360Data(params: {
  applicationId: string;
}): Promise<Application360Data | null> {
  const db = await getDatabase();
  if (!db) return null;

  const repo = new ControlCenterRepository(db);
  const rawData = await repo.getControlCenterRawData();

  const analysis = analyzeControlCenterData({
    allIpos: rawData.allIpos,
    allApplications: rawData.allApplications,
    allMembers: rawData.allMembers,
    profitDistributions: rawData.profitDistributions,
    auditLogs: rawData.auditLogs,
    statusOverrides: rawData.statusOverrides,
  });

  return generateApplication360({
    applicationId: params.applicationId,
    allIpos: rawData.allIpos,
    allApplications: rawData.allApplications,
    allMembers: rawData.allMembers,
    profitDistributions: rawData.profitDistributions,
    detectedIssues: analysis.issues,
  });
}

/**
 * Fetch PAN Audit Timeline ("Why is this PAN listed?")
 */
export async function getPanAuditTimelineData(params: {
  pan: string;
  selectedIpoId?: string;
}): Promise<PanAuditTimelineItem | null> {
  const db = await getDatabase();
  if (!db) return null;

  const repo = new ControlCenterRepository(db);
  const rawData = await repo.getControlCenterRawData();

  return generatePanAuditTimeline({
    pan: params.pan,
    allIpos: rawData.allIpos,
    allApplications: rawData.allApplications,
    allMembers: rawData.allMembers,
    selectedIpoId: params.selectedIpoId,
  });
}

import { Db } from "mongodb";
import { NexoIPORecord, ProfitDistribution } from "@/types/ipo";
import { ApplicationRecord, MemberRecord } from "@/types/application";
import { AuditRecord } from "@/types/audit";
import { ControlCenterIssueStatus, IssueStatusOverrideRecord } from "@/types/control-center";

export class ControlCenterRepository {
  constructor(private db: Db) {}

  private get ipoCollection() {
    return this.db.collection<NexoIPORecord>("ipos");
  }

  private get appCollection() {
    return this.db.collection<ApplicationRecord>("applications");
  }

  private get memberCollection() {
    return this.db.collection<MemberRecord>("members");
  }

  private get profitCollection() {
    return this.db.collection<ProfitDistribution>("profit_distributions");
  }

  private get overridesCollection() {
    return this.db.collection<IssueStatusOverrideRecord>("control_center_overrides");
  }

  private get activitiesCollection() {
    return this.db.collection<AuditRecord>("activities");
  }

  /**
   * Fetch all raw records required for comprehensive real-time reconciliation in parallel.
   */
  async getControlCenterRawData() {
    const [
      allIpos,
      allApplications,
      allMembers,
      profitDistributions,
      overridesDocs,
      auditLogs,
    ] = await Promise.all([
      this.ipoCollection
        .find(
          {},
          {
            projection: {
              id: 1,
              name: 1,
              category: 1,
              status: 1,
              isCompleted: 1,
              allotmentFinalized: 1,
              metrics: 1,
              profitDistribution: 1,
              createdAt: 1,
            },
          }
        )
        .maxTimeMS(8000)
        .toArray(),

      this.appCollection
        .find(
          {},
          {
            projection: {
              id: 1,
              ipoId: 1,
              ipoName: 1,
              memberId: 1,
              applicantName: 1,
              applicantUsername: 1,
              fundingStructure: 1,
              numberOfPanCards: 1,
              panNumbers: 1,
              totalContribution: 1,
              status: 1,
              allotmentStatus: 1,
              allottedIndices: 1,
              contributors: 1,
              createdAt: 1,
            },
          }
        )
        .maxTimeMS(8000)
        .toArray(),

      this.memberCollection
        .find(
          {},
          {
            projection: {
              id: 1,
              name: 1,
              username: 1,
              role: 1,
              status: 1,
              panMasked: 1,
              panFull: 1,
              defaultContribution: 1,
              createdAt: 1,
            },
          }
        )
        .maxTimeMS(8000)
        .toArray(),

      this.profitCollection.find({}).maxTimeMS(8000).toArray(),

      this.overridesCollection.find({}).maxTimeMS(8000).toArray(),

      this.activitiesCollection
        .find({})
        .sort({ createdAt: -1, timestamp: -1 })
        .limit(30)
        .maxTimeMS(8000)
        .toArray(),
    ]);

    const statusOverrides: Record<string, ControlCenterIssueStatus> = {};
    for (const doc of overridesDocs) {
      if (doc.issueId && doc.status) {
        statusOverrides[doc.issueId] = doc.status;
      }
    }

    return {
      allIpos,
      allApplications,
      allMembers,
      profitDistributions,
      statusOverrides,
      overridesDocs,
      auditLogs,
    };
  }

  /**
   * Persist user's issue status override non-destructively
   */
  async saveIssueStatusOverride(params: {
    issueId: string;
    status: ControlCenterIssueStatus;
    notes?: string;
    actionTaken?: string;
    previousValue?: string | number;
    newValue?: string | number;
    updatedBy?: string;
  }): Promise<boolean> {
    try {
      await this.overridesCollection.updateOne(
        { issueId: params.issueId },
        {
          $set: {
            issueId: params.issueId,
            status: params.status,
            notes: params.notes || "",
            actionTaken: params.actionTaken || `Marked as ${params.status}`,
            previousValue: params.previousValue,
            newValue: params.newValue,
            updatedAt: new Date().toISOString(),
            updatedBy: params.updatedBy || "admin",
          },
        },
        { upsert: true }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Bulk update status for multiple issues safely
   */
  async bulkUpdateIssueStatus(params: {
    issueIds: string[];
    status: ControlCenterIssueStatus;
    notes?: string;
    updatedBy?: string;
  }): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const operations = params.issueIds.map((issueId) => ({
        updateOne: {
          filter: { issueId },
          update: {
            $set: {
              issueId,
              status: params.status,
              notes: params.notes || `Bulk updated to ${params.status}`,
              actionTaken: `Bulk action: ${params.status}`,
              updatedAt: now,
              updatedBy: params.updatedBy || "admin",
            },
          },
          upsert: true,
        },
      }));

      await this.overridesCollection.bulkWrite(operations);
      return true;
    } catch {
      return false;
    }
  }
}

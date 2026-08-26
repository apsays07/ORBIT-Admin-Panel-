import { Db, Filter } from "mongodb";
import { AuditRecord } from "@/types/audit";

export class AuditRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<AuditRecord>("activities");
  }

  async insertLog(log: AuditRecord): Promise<void> {
    await this.collection.insertOne(log as any);
  }

  async findPaginatedLogs(
    filter: Filter<AuditRecord>,
    skip: number,
    limit: number
  ) {
    const [eventTypes, categories, severities, [facetResult]] = await Promise.all([
      this.collection.distinct("eventType"),
      this.collection.distinct("category"),
      this.collection.distinct("severity"),
      this.collection
        .aggregate<{
          totalCount: { count: number }[];
          rows: AuditRecord[];
          securityCount: { count: number }[];
          warningCount: { count: number }[];
          criticalCount: { count: number }[];
        }>([
          {
            $facet: {
              totalCount: [{ $match: filter }, { $count: "count" }],
              rows: [
                { $match: filter },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
              ],
              securityCount: [
                { $match: { category: "SECURITY" } },
                { $count: "count" },
              ],
              warningCount: [
                { $match: { severity: "WARN" } },
                { $count: "count" },
              ],
              criticalCount: [
                { $match: { severity: "CRITICAL" } },
                { $count: "count" },
              ],
            },
          },
        ])
        .maxTimeMS(8000)
        .toArray(),
    ]);

    return {
      eventTypes: eventTypes.filter(Boolean).map(String),
      categories: categories.filter(Boolean).map(String),
      severities: severities.filter(Boolean).map(String),
      facetResult: facetResult || {
        totalCount: [],
        rows: [],
        securityCount: [],
        warningCount: [],
        criticalCount: [],
      },
    };
  }

  async findRecentLogs(limit = 20): Promise<AuditRecord[]> {
    return this.collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .maxTimeMS(8000)
      .toArray();
  }

  async countTotalLogs(): Promise<number> {
    return this.collection.countDocuments({});
  }
}

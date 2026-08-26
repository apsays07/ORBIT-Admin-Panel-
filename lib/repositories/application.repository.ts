import { Db, Filter } from "mongodb";
import { ApplicationRecord } from "@/types/application";

export class ApplicationRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<ApplicationRecord>("applications");
  }

  async findApplicationById(id: string): Promise<ApplicationRecord | null> {
    return this.collection.findOne({ id }, { maxTimeMS: 8000 });
  }

  async getIpoApplicationCounts() {
    return this.collection
      .aggregate<{ _id: string; name: string; count: number }>([
        {
          $group: {
            _id: "$ipoId",
            name: { $first: "$ipoName" },
            count: { $sum: { $ifNull: ["$numberOfPanCards", 1] } },
          },
        },
      ])
      .maxTimeMS(8000)
      .toArray();
  }

  async findPaginatedApplications(
    metricsFilter: Filter<ApplicationRecord>,
    filter: Filter<ApplicationRecord>,
    sortStage: Record<string, 1 | -1>,
    skip: number,
    limit: number
  ) {
    const [ipoGroups, metricsRaw, totalCount, rows] = await Promise.all([
      this.getIpoApplicationCounts(),
      this.collection
        .aggregate<{
          totalApplications: number;
          totalFormsCount: number;
          awaitingAllotment: number;
          allottedApplications: number;
          notAllottedApplications: number;
          totalCapitalPooled: number;
          applicantIds: string[];
        }>([
          { $match: metricsFilter },
          {
            $project: {
              totalPans: { $ifNull: ["$numberOfPanCards", 1] },
              totalContribution: {
                $convert: {
                  input: "$totalContribution",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
              memberId: 1,
              allottedPans: {
                $cond: [
                  { $eq: ["$status", "ALLOTTED"] },
                  {
                    $let: {
                      vars: {
                        arr: {
                          $cond: [{ $isArray: "$allottedIndices" }, "$allottedIndices", []],
                        },
                      },
                      in: {
                        $cond: [{ $gt: [{ $size: "$$arr" }, 0] }, { $size: "$$arr" }, 1],
                      },
                    },
                  },
                  0,
                ],
              },
              pendingPans: {
                $cond: [
                  { $in: ["$status", ["AWAITING", "PENDING", null]] },
                  { $ifNull: ["$numberOfPanCards", 1] },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              totalPans: 1,
              totalContribution: 1,
              memberId: 1,
              allottedPans: 1,
              pendingPans: 1,
              notAllottedPans: {
                $max: [0, { $subtract: ["$totalPans", { $add: ["$allottedPans", "$pendingPans"] }] }],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalApplications: { $sum: "$totalPans" },
              totalFormsCount: { $sum: "$totalPans" },
              awaitingAllotment: { $sum: "$pendingPans" },
              allottedApplications: { $sum: "$allottedPans" },
              notAllottedApplications: { $sum: "$notAllottedPans" },
              totalCapitalPooled: { $sum: "$totalContribution" },
              applicantIds: { $addToSet: "$memberId" },
            },
          },
        ])
        .maxTimeMS(8000)
        .toArray(),
      this.collection.countDocuments(filter, { maxTimeMS: 8000 }),
      this.collection
        .find(filter, {
          projection: {
            _id: 0,
            id: 1,
            ipoId: 1,
            ipoName: 1,
            memberId: 1,
            applicantName: 1,
            panNumbers: 1,
            numberOfPanCards: 1,
            totalContribution: 1,
            fundingStructure: 1,
            contributors: 1,
            status: 1,
            allotmentStatus: 1,
            allottedIndices: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        })
        .sort(sortStage)
        .skip(skip)
        .limit(limit)
        .maxTimeMS(8000)
        .toArray(),
    ]);

    // Batch lookup member names without large base64 avatar payload
    const memberIds = Array.from(new Set(rows.map((r) => r.memberId).filter(Boolean)));
    const memberDocs =
      memberIds.length > 0
        ? await this.db
            .collection("members")
            .find(
              { id: { $in: memberIds } },
              { projection: { _id: 0, id: 1, username: 1, name: 1, role: 1, status: 1 } }
            )
            .maxTimeMS(8000)
            .toArray()
        : [];

    const memberMap = new Map<string, { username?: string; name?: string; role?: string; status?: string }>();
    memberDocs.forEach((m: any) => memberMap.set(m.id, { username: m.username, name: m.name, role: m.role, status: m.status }));

    const enrichedRows = rows.map((r) => {
      const mem = memberMap.get(r.memberId);
      return {
        ...r,
        memberInfo: mem ? [mem] : [],
      };
    });

    return {
      ipoGroups,
      facetResult: {
        metrics: metricsRaw,
        totalCount: [{ count: totalCount }],
        rows: enrichedRows,
      },
    };
  }

  async insertApplication(doc: ApplicationRecord): Promise<void> {
    await this.collection.insertOne(doc);
  }

  async updateApplication(id: string, updates: Partial<ApplicationRecord>): Promise<boolean> {
    const res = await this.collection.updateOne({ id }, { $set: updates });
    return res.matchedCount > 0;
  }

  async deleteApplication(id: string): Promise<boolean> {
    const res = await this.collection.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async deleteApplications(ids: string[]): Promise<number> {
    const res = await this.collection.deleteMany({ id: { $in: ids } });
    return res.deletedCount;
  }

  async countTotalPanCards(): Promise<number> {
    const res = await this.collection
      .aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: { $ifNull: ["$numberOfPanCards", 1] } } } },
      ])
      .toArray();
    return res[0]?.total || 0;
  }
}

import { Db, Filter } from "mongodb";
import { ApplicationRecord } from "@/types/application";
import { NexoIPORecord } from "@/types/ipo";

export class AllotmentRepository {
  constructor(private db: Db) {}

  private get appCollection() {
    return this.db.collection<ApplicationRecord>("applications");
  }

  private get ipoCollection() {
    return this.db.collection<NexoIPORecord>("ipos");
  }

  async getIposWithCounts() {
    const [ipoDocs, ipoCountsRaw] = await Promise.all([
      this.ipoCollection
        .find({}, { projection: { id: 1, name: 1, category: 1, registrarUrl: 1, allotmentFinalized: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .maxTimeMS(8000)
        .toArray(),
      this.appCollection
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$ipoId", count: { $sum: { $ifNull: ["$numberOfPanCards", 1] } } } },
        ])
        .maxTimeMS(8000)
        .toArray(),
    ]);

    return { ipoDocs, ipoCountsRaw };
  }

  async findPaginatedAllotmentRows(
    targetIpoId: string,
    filter: Filter<ApplicationRecord>,
    sortStage: Record<string, 1 | -1>,
    skip: number,
    limit: number
  ) {
    const [metricsRaw, totalCount, rows] = await Promise.all([
      // 1. Target IPO allotment metrics
      this.appCollection
        .aggregate<{
          totalApplications: number;
          totalPanCards: number;
          allottedCount: number;
          notAllottedCount: number;
          pendingCount: number;
        }>([
          { $match: { ipoId: targetIpoId } },
          {
            $project: {
              totalPans: { $ifNull: ["$numberOfPanCards", 1] },
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
              totalPanCards: { $sum: "$totalPans" },
              allottedCount: { $sum: "$allottedPans" },
              notAllottedCount: { $sum: "$notAllottedPans" },
              pendingCount: { $sum: "$pendingPans" },
            },
          },
        ])
        .maxTimeMS(8000)
        .toArray(),

      // 2. Total filtered count
      this.appCollection.countDocuments(filter, { maxTimeMS: 8000 }),

      // 3. Paginated rows with lean projection
      this.appCollection
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
            status: 1,
            allotmentStatus: 1,
            allottedIndices: 1,
            fundingStructure: 1,
            contributors: 1,
            totalContribution: 1,
            createdAt: 1,
          },
        })
        .sort(sortStage)
        .skip(skip)
        .limit(limit)
        .maxTimeMS(8000)
        .toArray(),
    ]);

    // 4. Batch lookup member names without large base64 avatar payload
    const memberIds = Array.from(new Set(rows.map((r) => r.memberId).filter(Boolean)));
    const memberDocs =
      memberIds.length > 0
        ? await this.db
            .collection("members")
            .find(
              { id: { $in: memberIds } },
              { projection: { _id: 0, id: 1, username: 1, name: 1 } }
            )
            .maxTimeMS(8000)
            .toArray()
        : [];

    const memberMap = new Map<string, { username?: string; name?: string }>();
    memberDocs.forEach((m: any) => memberMap.set(m.id, { username: m.username, name: m.name }));

    const enrichedRows = rows.map((r) => {
      const mem = memberMap.get(r.memberId);
      return {
        ...r,
        memberInfo: mem ? [mem] : [],
      };
    });

    return {
      metrics: metricsRaw,
      totalCount: [{ count: totalCount }],
      rows: enrichedRows,
    };
  }
}

import { Db } from "mongodb";
import { ProfitDistribution, NexoIPORecord } from "@/types/ipo";
import { ApplicationRecord } from "@/types/application";

export class ProfitRepository {
  constructor(private db: Db) {}

  private get profitCollection() {
    return this.db.collection<ProfitDistribution>("profit_distributions");
  }

  private get ipoCollection() {
    return this.db.collection<NexoIPORecord>("ipos");
  }

  private get appCollection() {
    return this.db.collection<ApplicationRecord>("applications");
  }

  async getIposWithCounts() {
    const [ipoDocs, ipoCountsRaw] = await Promise.all([
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

  async findProfitDistributionByIpoId(ipoId: string): Promise<ProfitDistribution | null> {
    return this.profitCollection.findOne({ ipoId }, { maxTimeMS: 8000 });
  }

  async findApplicationsByIpoId(ipoId: string): Promise<ApplicationRecord[]> {
    return this.appCollection.find({ ipoId }).maxTimeMS(8000).toArray();
  }

  async saveProfitDistribution(distribution: ProfitDistribution): Promise<void> {
    await this.profitCollection.updateOne(
      { ipoId: distribution.ipoId },
      { $set: distribution },
      { upsert: true }
    );
  }
}

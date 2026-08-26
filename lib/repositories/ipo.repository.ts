import { Db, Filter } from "mongodb";
import { NexoIPORecord } from "@/types/ipo";

export class IpoRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<NexoIPORecord>("ipos");
  }

  async findIposList(projection?: Record<string, 1 | 0>): Promise<NexoIPORecord[]> {
    const docs = await this.collection
      .find({}, { projection: projection || { id: 1, name: 1, status: 1, isCompleted: 1, metrics: 1, createdAt: 1 } })
      .maxTimeMS(8000)
      .toArray();

    return docs.sort((a, b) => {
      const timeA = new Date(a.metrics?.closeDate || a.metrics?.openDate || a.createdAt || "").getTime() || 0;
      const timeB = new Date(b.metrics?.closeDate || b.metrics?.openDate || b.createdAt || "").getTime() || 0;
      return timeB - timeA;
    });
  }

  async findIpoById(id: string): Promise<NexoIPORecord | null> {
    return this.collection.findOne({ id }, { maxTimeMS: 8000 });
  }

  async findPaginatedIpos(
    filter: Filter<NexoIPORecord>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
  ) {
    const [distinctStatusesRaw, [ipoFacetRaw]] = await Promise.all([
      this.collection.distinct("status"),
      this.collection
        .aggregate<{
          total: { count: number }[];
          active: { count: number }[];
          upcoming: { count: number }[];
          closed: { count: number }[];
          rows: NexoIPORecord[];
        }>([
          {
            $facet: {
              total: [{ $match: filter }, { $count: "count" }],
              active: [{ $match: { status: { $in: ["APPLICATION_OPEN", "OPEN"] } } }, { $count: "count" }],
              upcoming: [{ $match: { status: "UPCOMING" } }, { $count: "count" }],
              closed: [{ $match: { status: { $in: ["CLOSED", "COMPLETED", "ALLOTMENT_OUT"] } } }, { $count: "count" }],
              rows: [
                { $match: filter },
              ],
            },
          },
        ])
        .maxTimeMS(8000)
        .toArray(),
    ]);

    return {
      statuses: distinctStatusesRaw.filter(Boolean).map(String),
      facet: ipoFacetRaw || { total: [], active: [], upcoming: [], closed: [], rows: [] },
    };
  }

  async insertIpo(doc: NexoIPORecord): Promise<void> {
    await this.collection.insertOne(doc);
  }

  async updateIpo(id: string, updates: Partial<NexoIPORecord>): Promise<boolean> {
    const res = await this.collection.updateOne({ id }, { $set: updates });
    return res.matchedCount > 0;
  }

  async deleteIpo(id: string): Promise<boolean> {
    const res = await this.collection.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async countOpenIpos(): Promise<number> {
    return this.collection.countDocuments({
      status: { $in: ["APPLICATION_OPEN", "OPEN"] },
      isCompleted: { $ne: true },
    });
  }

  async countCompletedIpos(): Promise<number> {
    return this.collection.countDocuments({
      $or: [{ status: "COMPLETED" }, { isCompleted: true }],
    });
  }
}

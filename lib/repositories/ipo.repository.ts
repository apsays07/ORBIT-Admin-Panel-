import { Db, Filter } from "mongodb";
import { NexoIPORecord } from "@/types/ipo";

let _cachedIposList: NexoIPORecord[] | null = null;
let _lastIposListFetch = 0;
const IPOS_CACHE_TTL_MS = 25000;

export function invalidateIposCache() {
  _cachedIposList = null;
  _lastIposListFetch = 0;
}

export class IpoRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<NexoIPORecord>("ipos");
  }

  async findIposList(projection?: Record<string, 1 | 0>): Promise<NexoIPORecord[]> {
    const now = Date.now();
    if (!projection && _cachedIposList && now - _lastIposListFetch < IPOS_CACHE_TTL_MS) {
      return _cachedIposList;
    }

    const docs = await this.collection
      .find({}, { projection: projection || { id: 1, name: 1, status: 1, isCompleted: 1, metrics: 1, createdAt: 1 } })
      .maxTimeMS(8000)
      .toArray();

    const sorted = docs.sort((a, b) => {
      const timeA = new Date(a.metrics?.closeDate || a.metrics?.openDate || a.createdAt || "").getTime() || 0;
      const timeB = new Date(b.metrics?.closeDate || b.metrics?.openDate || b.createdAt || "").getTime() || 0;
      return timeB - timeA;
    });

    if (!projection) {
      _cachedIposList = sorted;
      _lastIposListFetch = now;
    }

    return sorted;
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
                { $sort: Object.keys(sort).length > 0 ? sort : { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
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
    invalidateIposCache();
  }

  async updateIpo(id: string, updates: Partial<NexoIPORecord>): Promise<boolean> {
    const res = await this.collection.updateOne({ id }, { $set: updates });
    invalidateIposCache();
    return res.matchedCount > 0;
  }

  async deleteIpo(id: string): Promise<boolean> {
    const res = await this.collection.deleteOne({ id });
    invalidateIposCache();
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

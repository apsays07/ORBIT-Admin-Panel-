import { Db, Filter } from "mongodb";
import { MemberData } from "@/types/member";

let _cachedMembersForSelection: any[] | null = null;
let _lastMembersForSelectionFetch = 0;
const MEMBERS_SELECTION_CACHE_TTL_MS = 30000;

export function invalidateMembersCache() {
  _cachedMembersForSelection = null;
  _lastMembersForSelectionFetch = 0;
}

export class MemberRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<MemberData>("members");
  }

  async findMemberById(id: string): Promise<MemberData | null> {
    return this.collection.findOne({ id }, { maxTimeMS: 8000 });
  }

  async findMemberByUsername(username: string): Promise<MemberData | null> {
    return this.collection.findOne(
      { username: { $regex: `^${username}$`, $options: "i" } },
      { maxTimeMS: 8000 }
    );
  }

  async findMembersForSelection() {
    const now = Date.now();
    if (_cachedMembersForSelection && now - _lastMembersForSelectionFetch < MEMBERS_SELECTION_CACHE_TTL_MS) {
      return _cachedMembersForSelection;
    }

    const docs = await this.collection
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            username: 1,
            panFull: 1,
            panMasked: 1,
            defaultContribution: 1,
            role: 1,
            status: 1,
          },
        }
      )
      .sort({ username: 1 })
      .maxTimeMS(8000)
      .toArray();

    const mapped = docs.map((d: any) => ({
      ...d,
      _id: d._id ? d._id.toString() : undefined,
    }));

    _cachedMembersForSelection = mapped;
    _lastMembersForSelectionFetch = now;
    return mapped;
  }

  async findPaginatedMembers(
    filter: Filter<MemberData>,
    skip: number,
    limit: number
  ) {
    const [memberFacetRaw] = await this.collection
      .aggregate<{
        totalCount: { count: number }[];
        rows: MemberData[];
        adminCount: { count: number }[];
        verifiedCount: { count: number }[];
      }>([
        {
          $facet: {
            totalCount: [{ $match: filter }, { $count: "count" }],
            rows: [
              { $match: filter },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  passwordHash: 0,
                  salt: 0,
                },
              },
            ],
            adminCount: [
              { $match: { role: { $in: ["SUPER_ADMIN", "ADMIN"] } } },
              { $count: "count" },
            ],
            verifiedCount: [
              { $match: { panFull: { $exists: true, $ne: "" } } },
              { $count: "count" },
            ],
          },
        },
      ])
      .maxTimeMS(8000)
      .toArray();

    return memberFacetRaw;
  }

  async insertMember(doc: MemberData): Promise<void> {
    await this.collection.insertOne(doc as any);
    invalidateMembersCache();
  }

  async updateMember(id: string, updates: Partial<MemberData>): Promise<boolean> {
    const res = await this.collection.updateOne({ id }, { $set: updates });
    invalidateMembersCache();
    return res.matchedCount > 0;
  }

  async deleteMember(id: string): Promise<boolean> {
    const res = await this.collection.deleteOne({ id });
    invalidateMembersCache();
    return res.deletedCount > 0;
  }

  async deleteMembers(ids: string[]): Promise<number> {
    const res = await this.collection.deleteMany({ id: { $in: ids } });
    invalidateMembersCache();
    return res.deletedCount;
  }

  async countTotalMembers(): Promise<number> {
    return this.collection.countDocuments({});
  }
}

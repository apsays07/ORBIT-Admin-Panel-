import { Db } from "mongodb";
import { SessionRecord } from "@/types/security";

export class SessionRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<SessionRecord>("sessions");
  }

  async countActiveSessions(): Promise<number> {
    return this.collection.countDocuments({
      expiresAt: { $gt: new Date().toISOString() },
    });
  }

  async countTotalSessions(): Promise<number> {
    return this.collection.countDocuments({});
  }

  async findSessionsByUserId(userId: string): Promise<SessionRecord[]> {
    return this.collection.find({ userId }).sort({ createdAt: -1 }).maxTimeMS(8000).toArray();
  }

  async findRecentSessions(limit = 50): Promise<SessionRecord[]> {
    return this.collection.find({}).sort({ lastActiveAt: -1 }).limit(limit).maxTimeMS(8000).toArray();
  }

  async revokeSession(id: string): Promise<boolean> {
    const res = await this.collection.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async revokeAllOtherSessions(keepSessionId: string): Promise<number> {
    const res = await this.collection.deleteMany({ id: { $ne: keepSessionId } });
    return res.deletedCount;
  }
}

import { getDatabase } from "@/lib/db/mongodb";
import { IpoRepository } from "@/lib/repositories/ipo.repository";
import { ApplicationRepository } from "@/lib/repositories/application.repository";
import { MemberRepository } from "@/lib/repositories/member.repository";

export class DashboardService {
  static async getDashboardMetrics() {
    const db = await getDatabase();
    if (!db) {
      return {
        openIpos: 0,
        completedIpos: 0,
        totalMembers: 0,
        totalPanCards: 0,
        totalCapital: 0,
      };
    }

    const ipoRepo = new IpoRepository(db);
    const appRepo = new ApplicationRepository(db);
    const memberRepo = new MemberRepository(db);

    const [openIpos, completedIpos, totalMembers, totalPanCards, capitalRes] = await Promise.all([
      ipoRepo.countOpenIpos(),
      ipoRepo.countCompletedIpos(),
      memberRepo.countTotalMembers(),
      appRepo.countTotalPanCards(),
      db.collection("applications").aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: { $ifNull: ["$totalContribution", 0] } } } },
      ]).maxTimeMS(8000).toArray(),
    ]);

    return {
      openIpos,
      completedIpos,
      totalMembers,
      totalPanCards,
      totalCapital: capitalRes[0]?.total || 0,
    };
  }
}

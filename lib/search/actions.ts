"use server";

import { getDatabase } from "@/lib/db/mongodb";

export interface GlobalSearchMemberItem {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  pan?: string;
  status: string;
  role?: string;
}

export interface GlobalSearchApplicationItem {
  id: string;
  applicantName: string;
  ipoName: string;
  pan?: string;
  amount?: number;
  status: string;
  createdAt: string;
}

export interface GlobalSearchIpoItem {
  id: string;
  name: string;
  company?: string;
  status: string;
  category?: string;
}

export interface GlobalSearchActivityResultItem {
  id: string;
  title: string;
  actorUsername: string;
  timestamp: string;
}

export interface GlobalSearchResults {
  members: GlobalSearchMemberItem[];
  applications: GlobalSearchApplicationItem[];
  ipos: GlobalSearchIpoItem[];
  activities: GlobalSearchActivityResultItem[];
  totalCount: number;
}

/**
 * High-performance global search across all Orbit entities with lean projections
 */
export async function globalAdminSearch(query: string): Promise<GlobalSearchResults> {
  const q = query.trim();
  const emptyResult: GlobalSearchResults = {
    members: [],
    applications: [],
    ipos: [],
    activities: [],
    totalCount: 0,
  };

  if (!q || q.length < 1) {
    return emptyResult;
  }

  const db = await getDatabase();
  if (!db) return emptyResult;

  const withoutAt = q.startsWith("@") ? q.slice(1) : q;
  const escaped = withoutAt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = { $regex: escaped, $options: "i" };

  try {
    const [memberDocs, appDocs, ipoDocs, actDocs] = await Promise.all([
      // 1. Members Search
      db
        .collection("members")
        .find(
          {
            $or: [
              { username: regex },
              { name: regex },
              { panFull: regex },
              { panMasked: regex },
              { email: regex },
              { phone: regex },
              { id: regex },
            ],
          },
          {
            projection: {
              _id: 0,
              id: 1,
              name: 1,
              username: 1,
              avatar: 1,
              panFull: 1,
              panMasked: 1,
              status: 1,
              role: 1,
            },
          }
        )
        .limit(6)
        .toArray(),

      // 2. Applications Search
      db
        .collection("applications")
        .find(
          {
            $or: [
              { id: regex },
              { applicantName: regex },
              { applicantUsername: regex },
              { ipoName: regex },
              { panNumbers: regex },
              { "contributors.memberName": regex },
            ],
          },
          {
            projection: {
              _id: 0,
              id: 1,
              applicantName: 1,
              ipoName: 1,
              panNumbers: 1,
              totalContribution: 1,
              status: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray(),

      // 3. IPOs Search
      db
        .collection("ipos")
        .find(
          {
            $or: [
              { name: regex },
              { company: regex },
              { id: regex },
              { status: regex },
            ],
          },
          {
            projection: {
              _id: 0,
              id: 1,
              name: 1,
              company: 1,
              status: 1,
              category: 1,
            },
          }
        )
        .limit(6)
        .toArray(),

      // 4. Audit Activities Search
      db
        .collection("activities")
        .find(
          {
            $or: [
              { title: regex },
              { actorUsername: regex },
              { targetName: regex },
              { eventType: regex },
            ],
          },
          {
            projection: {
              _id: 0,
              id: 1,
              title: 1,
              eventType: 1,
              targetName: 1,
              actorUsername: 1,
              timestamp: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(4)
        .toArray(),
    ]);

    const members: GlobalSearchMemberItem[] = memberDocs.map((m) => ({
      id: m.id || "unknown",
      name: m.name || m.username || "Member",
      username: m.username || m.name || "user",
      avatar: m.avatar,
      pan: m.panFull || m.panMasked || undefined,
      status: m.status || "ACTIVE",
      role: m.role,
    }));

    const applications: GlobalSearchApplicationItem[] = appDocs.map((a) => ({
      id: a.id || "unknown",
      applicantName: a.applicantName || "Application",
      ipoName: a.ipoName || "IPO",
      pan: Array.isArray(a.panNumbers) && a.panNumbers.length > 0 ? a.panNumbers[0] : undefined,
      amount: a.totalContribution,
      status: a.status || "AWAITING",
      createdAt: a.createdAt || new Date().toISOString(),
    }));

    const ipos: GlobalSearchIpoItem[] = ipoDocs.map((i) => ({
      id: i.id || "unknown",
      name: i.name || "IPO",
      company: i.company,
      status: i.status || "APPLICATION_OPEN",
      category: i.category,
    }));

    const activities: GlobalSearchActivityResultItem[] = actDocs.map((act) => ({
      id: act.id || "act_unknown",
      title: act.title || act.targetName || act.eventType?.replace(/_/g, " ") || "Activity Log",
      actorUsername: act.actorUsername || "Admin",
      timestamp: act.timestamp || act.createdAt || new Date().toISOString(),
    }));

    const totalCount = members.length + applications.length + ipos.length + activities.length;

    return {
      members,
      applications,
      ipos,
      activities,
      totalCount,
    };
  } catch (err) {
    console.error("[ORBIT][GLOBAL_SEARCH] Error:", err);
    return emptyResult;
  }
}

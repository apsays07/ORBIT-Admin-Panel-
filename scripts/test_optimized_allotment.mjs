import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function testOptimized() {
  const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db("nexo");

  const ipoId = "ipo_1787115611029";
  const start = Date.now();

  // Test approach 1: Pre-filtered aggregate with Promise.all
  const [metricsRaw, totalCount, rows] = await Promise.all([
    // 1. Metrics for this specific IPO
    db.collection("applications").aggregate([
      { $match: { ipoId } },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: { $ifNull: ["$numberOfPanCards", 1] } },
          allottedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "ALLOTTED"] },
                {
                  $cond: [
                    { $gt: [{ $size: { $ifNull: ["$allottedIndices", []] } }, 0] },
                    { $size: { $ifNull: ["$allottedIndices", []] } },
                    { $ifNull: ["$numberOfPanCards", 1] },
                  ],
                },
                0,
              ],
            },
          },
          notAllottedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "NOT_ALLOTTED"] },
                { $ifNull: ["$numberOfPanCards", 1] },
                0,
              ],
            },
          },
          pendingCount: {
            $sum: {
              $cond: [
                { $in: ["$status", ["AWAITING", "PENDING", null]] },
                { $ifNull: ["$numberOfPanCards", 1] },
                0,
              ],
            },
          },
        },
      },
    ]).maxTimeMS(8000).toArray(),

    // 2. Total count for this IPO
    db.collection("applications").countDocuments({ ipoId }),

    // 3. Paginated rows (lean projection)
    db.collection("applications")
      .find(
        { ipoId },
        {
          projection: {
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
        }
      )
      .sort({ createdAt: 1 })
      .skip(0)
      .limit(25)
      .maxTimeMS(8000)
      .toArray(),
  ]);

  const queryTime = Date.now() - start;
  console.log(`[PERF] 3 Parallel Direct Queries: ${queryTime}ms`);

  // 4. Batch lookup members for the 25 rows
  const memberLookupStart = Date.now();
  const memberIds = Array.from(new Set(rows.map((r) => r.memberId).filter(Boolean)));
  const memberDocs = memberIds.length > 0
    ? await db.collection("members").find(
        { id: { $in: memberIds } },
        { projection: { _id: 0, id: 1, username: 1, name: 1, avatar: 1 } }
      ).toArray()
    : [];

  const memberMap = new Map();
  memberDocs.forEach((m) => memberMap.set(m.id, m));

  const enrichedRows = rows.map((r) => ({
    ...r,
    applicantUsername: memberMap.get(r.memberId)?.username || r.applicantName,
    memberAvatar: memberMap.get(r.memberId)?.avatar,
  }));

  console.log(`[PERF] Member enrichment: ${Date.now() - memberLookupStart}ms`);
  console.log(`[PERF] TOTAL OPTIMIZED TIME: ${Date.now() - start}ms`);
  console.log(`Metrics:`, metricsRaw[0]);
  console.log(`Total count:`, totalCount);
  console.log(`Enriched rows:`, enrichedRows.length);

  await client.close();
}

testOptimized().catch(console.error);

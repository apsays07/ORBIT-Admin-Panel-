import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function benchmarkAllotmentWithoutAvatar() {
  const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db("nexo");

  const ipoId = "ipo_1787115611029";
  const start = Date.now();

  const [ipos, ipoCounts, metricsRaw, totalCount, rows] = await Promise.all([
    // 1. IPO dropdown list
    db.collection("ipos")
      .find({}, { projection: { id: 1, name: 1, category: 1, registrarUrl: 1, allotmentFinalized: 1 } })
      .sort({ createdAt: -1 })
      .toArray(),

    // 2. IPO counts
    db.collection("applications")
      .aggregate([
        { $group: { _id: "$ipoId", count: { $sum: { $ifNull: ["$numberOfPanCards", 1] } } } },
      ])
      .toArray(),

    // 3. Metrics for target IPO
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
    ]).toArray(),

    // 4. Count for target IPO
    db.collection("applications").countDocuments({ ipoId }),

    // 5. Paginated rows (lean projection)
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
      .limit(500)
      .toArray(),
  ]);

  console.log(`[PERF] 5 parallel queries took: ${Date.now() - start}ms`);

  // 6. Fast member lookup without 2.3MB avatar
  const memberStart = Date.now();
  const memberIds = Array.from(new Set(rows.map((r) => r.memberId).filter(Boolean)));
  const memberDocs = memberIds.length > 0
    ? await db.collection("members").find(
        { id: { $in: memberIds } },
        { projection: { _id: 0, id: 1, username: 1, name: 1 } }
      ).toArray()
    : [];

  const memberMap = new Map();
  memberDocs.forEach((m) => memberMap.set(m.id, m));

  const enrichedRows = rows.map((r) => ({
    ...r,
    applicantUsername: memberMap.get(r.memberId)?.username || r.applicantName,
  }));

  console.log(`[PERF] Member lookup took: ${Date.now() - memberStart}ms`);
  console.log(`[PERF] TOTAL END-TO-END LOAD TIME: ${Date.now() - start}ms`);
  console.log(`Loaded ${enrichedRows.length} application rows for ${ipoId}`);

  await client.close();
}

benchmarkAllotmentWithoutAvatar().catch(console.error);

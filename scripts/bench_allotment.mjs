import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function testAllotmentLoad() {
  console.log("Starting Allotment Load Benchmark...");
  const totalStart = Date.now();

  const connectStart = Date.now();
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const db = client.db("nexo");
  console.log(`[PERF] Mongo Connected in ${Date.now() - connectStart}ms`);

  const ipoId = "ipo_1787115611029";

  // Step 1: getIposWithCounts
  const step1Start = Date.now();
  const [ipoDocs, ipoCountsRaw] = await Promise.all([
    db.collection("ipos")
      .find({}, { projection: { id: 1, name: 1, category: 1, registrarUrl: 1, allotmentFinalized: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .maxTimeMS(8000)
      .toArray(),
    db.collection("applications")
      .aggregate([
        { $group: { _id: "$ipoId", count: { $sum: { $ifNull: ["$numberOfPanCards", 1] } } } },
      ])
      .maxTimeMS(8000)
      .toArray(),
  ]);
  console.log(`[PERF] Step 1 (IPOs + Application Counts): ${Date.now() - step1Start}ms. IPOs: ${ipoDocs.length}, Counts: ${ipoCountsRaw.length}`);

  // Step 2: Facet query for specific IPO
  const step2Start = Date.now();
  const [facetResult] = await db.collection("applications")
    .aggregate([
      {
        $facet: {
          metrics: [
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
          ],
          totalCount: [
            { $match: { ipoId } },
            { $count: "count" },
          ],
          rows: [
            { $match: { ipoId } },
            { $sort: { createdAt: 1 } },
            { $skip: 0 },
            { $limit: 25 },
            {
              $lookup: {
                from: "members",
                localField: "memberId",
                foreignField: "id",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      id: 1,
                      username: 1,
                      name: 1,
                      avatar: 1,
                    },
                  },
                ],
                as: "memberInfo",
              },
            },
          ],
        },
      },
    ])
    .maxTimeMS(8000)
    .toArray();

  console.log(`[PERF] Step 2 (Facet Query): ${Date.now() - step2Start}ms. Rows: ${facetResult?.rows?.length || 0}`);
  console.log(`[PERF] Total Pipeline Time: ${Date.now() - totalStart}ms`);

  await client.close();
}

testAllotmentLoad().catch(console.error);

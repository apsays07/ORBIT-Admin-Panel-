import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function testAvailableIpos() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const [iposList, ipoGroups] = await Promise.all([
    db.collection("ipos")
      .find({}, { projection: { id: 1, name: 1, status: 1, isCompleted: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection("applications")
      .aggregate([
        {
          $group: {
            _id: "$ipoId",
            name: { $first: "$ipoName" },
            count: { $sum: { $ifNull: ["$numberOfPanCards", 1] } },
          },
        },
      ])
      .toArray(),
  ]);

  const countMap = new Map();
  ipoGroups.forEach((g) => {
    if (g._id) countMap.set(g._id, g.count);
  });

  const seenIds = new Set();
  const availableIpos = [];

  iposList.forEach((ipo) => {
    if (ipo.id && !seenIds.has(ipo.id)) {
      seenIds.add(ipo.id);
      availableIpos.push({
        id: ipo.id,
        name: ipo.name,
        count: countMap.get(ipo.id) || 0,
      });
    }
  });

  ipoGroups.forEach((g) => {
    if (g._id && !seenIds.has(g._id)) {
      seenIds.add(g._id);
      availableIpos.push({
        id: g._id,
        name: g.name || g._id,
        count: g.count,
      });
    }
  });

  console.log("Total IPOs found in database:", iposList.length);
  console.log("IPOs in Available dropdown list:", availableIpos);

  await client.close();
}

testAvailableIpos().catch(console.error);

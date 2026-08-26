import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const ipos = await db.collection("ipos").find({}, { projection: { id: 1, name: 1 } }).toArray();
  console.log("VALID IPOS in db.ipos:", ipos);

  const ipoIds = new Set(ipos.map(i => i.id));

  const appIpos = await db.collection("applications").aggregate([
    { $group: { _id: { ipoId: "$ipoId", ipoName: "$ipoName" }, count: { $sum: 1 } } }
  ]).toArray();
  console.log("\nUnique IPOs in db.applications:", JSON.stringify(appIpos, null, 2));

  const orphaned = appIpos.filter(g => !ipoIds.has(g._id.ipoId));
  console.log("\nORPHANED applications to remove:", JSON.stringify(orphaned, null, 2));

  const orphanedIds = orphaned.map(o => o._id.ipoId).filter(Boolean);
  if (orphanedIds.length > 0) {
    const deleteRes = await db.collection("applications").deleteMany({
      $or: [
        { ipoId: { $in: orphanedIds } },
        { ipoId: { $nin: Array.from(ipoIds) } },
        { ipoName: { $regex: /symbiote/i } }
      ]
    });
    console.log(`\nDeleted ${deleteRes.deletedCount} orphaned applications.`);

    const profitDel = await db.collection("profit_distributions").deleteMany({
      $or: [
        { ipoId: { $in: orphanedIds } },
        { ipoId: { $nin: Array.from(ipoIds) } }
      ]
    });
    console.log(`Deleted ${profitDel.deletedCount} orphaned profit distributions.`);
  }

  await client.close();
}

run().catch(console.error);

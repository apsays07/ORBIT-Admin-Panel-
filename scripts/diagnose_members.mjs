import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function diagnoseMembers() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  console.log("Checking members indexes...");
  const indexes = await db.collection("members").indexes();
  console.log("Indexes on members:", indexes);

  const sampleMember = await db.collection("members").findOne({});
  console.log("Sample member structure:", sampleMember ? Object.keys(sampleMember) : null);
  console.log("Sample member ID types:", {
    _id: typeof sampleMember?._id,
    id: typeof sampleMember?.id,
    username: sampleMember?.username
  });

  const memberCount = await db.collection("members").countDocuments();
  console.log("Total members in DB:", memberCount);

  // Let's test a simple query by id
  if (sampleMember?.id) {
    const start = Date.now();
    const found = await db.collection("members").findOne({ id: sampleMember.id });
    console.log(`findOne by id (${sampleMember.id}) took ${Date.now() - start}ms`);
  }

  // Let's test find with projection
  const startAll = Date.now();
  const allMembersLean = await db.collection("members").find({}, { projection: { id: 1, username: 1, name: 1, avatar: 1 } }).toArray();
  console.log(`find all ${allMembersLean.length} members lean took ${Date.now() - startAll}ms`);

  await client.close();
}

diagnoseMembers().catch(console.error);

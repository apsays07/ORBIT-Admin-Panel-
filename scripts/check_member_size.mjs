import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function checkMemberSize() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const members = await db.collection("members").find({}, { projection: { id: 1, username: 1, name: 1 } }).toArray();
  console.log(`Fetched ${members.length} members without avatar in milliseconds.`);

  // Now let's check which member has huge fields
  for (const m of members) {
    const doc = await db.collection("members").findOne({ id: m.id });
    const jsonStr = JSON.stringify(doc);
    const sizeKB = (jsonStr.length / 1024).toFixed(2);
    const avatarLen = doc.avatar ? doc.avatar.length : 0;
    if (jsonStr.length > 50000) {
      console.log(`MASSIVE DOC FOUND: ${m.username} (${m.id}) -> Total size: ${sizeKB} KB, Avatar length: ${avatarLen} chars`);
    } else {
      console.log(`Member: ${m.username} -> ${sizeKB} KB (avatar: ${avatarLen} chars)`);
    }
  }

  await client.close();
}

checkMemberSize().catch(console.error);

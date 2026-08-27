import { MongoClient } from "mongodb";
import crypto from "crypto";

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt, combined: `${salt}:${hash}` };
}

async function migrate() {
  console.log("Starting secure credentials migration...");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const membersCol = db.collection("members");
  const usersCol = db.collection("users");

  const members = await membersCol.find({}).toArray();
  console.log(`Found ${members.length} members in MongoDB.`);

  let updatedMembersCount = 0;
  let syncedUsersCount = 0;

  for (const member of members) {
    let passwordHash = member.passwordHash;
    let salt = member.salt;

    // If member has a legacy plaintext password and no passwordHash, convert it to a secure hash
    if (!passwordHash && member.password) {
      const generated = hashPassword(member.password);
      passwordHash = generated.combined;
      salt = generated.salt;
    } else if (!passwordHash) {
      // Default fallback if neither exists
      const fallbackPass = `${member.username}@${Math.floor(1000 + Math.random() * 9000)}`;
      const generated = hashPassword(fallbackPass);
      passwordHash = generated.combined;
      salt = generated.salt;
    }

    const nowIso = new Date().toISOString();
    const cleanUsername = (member.username || member.name).trim().toLowerCase().replace(/^@/, "");
    const cleanEmail = member.email?.trim() || `${cleanUsername}@nexo.private`;
    const cleanPhone = member.phone?.trim() || undefined;

    // 1. Update member: set passwordHash, salt, passwordUpdatedAt, and $unset plaintext password
    await membersCol.updateOne(
      { _id: member._id },
      {
        $set: {
          username: cleanUsername,
          passwordHash,
          salt,
          passwordUpdatedAt: member.passwordUpdatedAt || member.lastPasswordResetAt || member.updatedAt || nowIso,
          lastPasswordResetAt: member.lastPasswordResetAt || member.updatedAt || nowIso,
          updatedAt: nowIso,
        },
        $unset: {
          password: "",
        },
      }
    );
    updatedMembersCount++;

    // 2. Synchronize user in users collection
    const existingUser = await usersCol.findOne({
      $or: [{ memberId: member.id }, { username: cleanUsername }],
    });

    const userDocUpdates = {
      memberId: member.id,
      username: cleanUsername,
      name: member.name || cleanUsername,
      displayName: member.displayName || member.name || cleanUsername,
      email: cleanEmail,
      emailNormalized: cleanEmail.toLowerCase(),
      phone: cleanPhone,
      phoneNormalized: cleanPhone ? cleanPhone.replace(/[\s-]/g, "") : undefined,
      passwordHash: existingUser?.passwordHash || passwordHash,
      role: member.role || "MEMBER",
      status: member.status || "ACTIVE",
      emailVerified: existingUser?.emailVerified !== undefined ? existingUser.emailVerified : true,
      mustChangePassword: existingUser?.mustChangePassword || false,
      updatedAt: nowIso,
    };

    if (existingUser) {
      await usersCol.updateOne(
        { _id: existingUser._id },
        {
          $set: userDocUpdates,
          $unset: { password: "" },
        }
      );
    } else {
      await usersCol.insertOne({
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...userDocUpdates,
        createdAt: member.createdAt || nowIso,
      });
    }
    syncedUsersCount++;
  }

  // 3. Purge any remaining plaintext password fields across all users and members
  const unsetUsersPassRes = await usersCol.updateMany(
    { password: { $exists: true } },
    { $unset: { password: "" } }
  );

  const unsetMembersPassRes = await membersCol.updateMany(
    { password: { $exists: true } },
    { $unset: { password: "" } }
  );

  console.log(`\nMigration completed successfully:`);
  console.log(`- Updated ${updatedMembersCount} members`);
  console.log(`- Synchronized ${syncedUsersCount} users`);
  console.log(`- Purged plaintext password field from ${unsetUsersPassRes.modifiedCount} user docs`);
  console.log(`- Purged plaintext password field from ${unsetMembersPassRes.modifiedCount} member docs`);

  // Verify zero plaintext passwords
  const remainingPlaintextMembers = await membersCol.countDocuments({ password: { $exists: true } });
  const remainingPlaintextUsers = await usersCol.countDocuments({ password: { $exists: true } });
  console.log(`- Verification: Remaining plaintext members = ${remainingPlaintextMembers}, users = ${remainingPlaintextUsers}`);

  await client.close();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

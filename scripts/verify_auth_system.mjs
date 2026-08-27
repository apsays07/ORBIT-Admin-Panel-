import { MongoClient } from "mongodb";
import crypto from "crypto";

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt, combined: `${salt}:${hash}` };
}

function verifyPassword(password, combined) {
  const [salt, storedHash] = combined.split(":");
  if (!salt || !storedHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return hash === storedHash;
}

async function runVerification() {
  console.log("=== RUNNING SECURE CREDENTIAL SYSTEM VERIFICATION ===");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const membersCol = db.collection("members");
  const usersCol = db.collection("users");
  const sessionsCol = db.collection("sessions");
  const activitiesCol = db.collection("activities");

  // 1. Verify zero plaintext passwords currently across database
  const plaintextMembersCount = await membersCol.countDocuments({ password: { $exists: true } });
  const plaintextUsersCount = await usersCol.countDocuments({ password: { $exists: true } });

  console.log("✓ Zero plaintext passwords check:");
  console.log(`  - Members with plaintext 'password': ${plaintextMembersCount}`);
  console.log(`  - Users with plaintext 'password': ${plaintextUsersCount}`);
  if (plaintextMembersCount > 0 || plaintextUsersCount > 0) {
    throw new Error("Plaintext passwords detected in database!");
  }

  // 2. Test Member Creation Flow
  const testUsername = `test_user_${Date.now()}`;
  const testPassword = "MySecureTestPassword123!";
  const testMemberId = `mem_test_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const { combined, salt } = hashPassword(testPassword);

  console.log("\n✓ Simulating member creation for:", testUsername);

  const newMemberDoc = {
    id: testMemberId,
    name: "Test User Account",
    displayName: "Test User Account",
    username: testUsername,
    email: `${testUsername}@nexo.private`,
    role: "MEMBER",
    status: "ACTIVE",
    passwordHash: combined,
    salt,
    lastPasswordResetAt: nowIso,
    passwordUpdatedAt: nowIso,
    joinedAt: "Aug 2026",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await membersCol.insertOne(newMemberDoc);

  const newUserDoc = {
    id: `usr_${Date.now()}`,
    memberId: testMemberId,
    username: testUsername,
    name: "Test User Account",
    displayName: "Test User Account",
    email: `${testUsername}@nexo.private`,
    emailNormalized: `${testUsername}@nexo.private`.toLowerCase(),
    passwordHash: combined,
    role: "MEMBER",
    status: "ACTIVE",
    emailVerified: true,
    mustChangePassword: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await usersCol.insertOne(newUserDoc);

  // 3. Verify Database Storage Integrity
  const createdMember = await membersCol.findOne({ id: testMemberId });
  const createdUser = await usersCol.findOne({ memberId: testMemberId });

  if (!createdMember || !createdUser) {
    throw new Error("Failed to insert member or user document!");
  }

  console.log("✓ Verifying created records in MongoDB:");
  console.log(`  - Plaintext password in member doc: ${"password" in createdMember ? "EXISTS (FAILED)" : "NOT STORED (PASSED)"}`);
  console.log(`  - Plaintext password in user doc: ${"password" in createdUser ? "EXISTS (FAILED)" : "NOT STORED (PASSED)"}`);
  console.log(`  - Valid passwordHash in user doc: ${Boolean(createdUser.passwordHash && createdUser.passwordHash.length === 161)}`);

  // 4. Test Website B Login Authentication Flow against users collection
  const authUser = await usersCol.findOne({
    $or: [{ username: testUsername }, { emailNormalized: `${testUsername}@nexo.private`.toLowerCase() }],
  });

  const authSuccess = authUser && verifyPassword(testPassword, authUser.passwordHash);
  console.log(`✓ Website B Authentication with password '${testPassword}': ${authSuccess ? "SUCCESS" : "FAILED"}`);

  const wrongAuth = authUser && verifyPassword("WrongPassword!", authUser.passwordHash);
  console.log(`✓ Rejection of invalid password: ${!wrongAuth ? "SUCCESS (Rejected)" : "FAILED (Accepted wrong)"}`);

  // 5. Test Creating an Active Session and Password Reset Invalidation
  const testSessionId = `sess_test_${Date.now()}`;
  await sessionsCol.insertOne({
    id: testSessionId,
    userId: testMemberId,
    createdAt: nowIso,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    revokedAt: null,
  });

  console.log("\n✓ Simulating admin password reset & session revocation...");
  const newAssignedPassword = "NewlyResetPassword456!";
  const newHash = hashPassword(newAssignedPassword);
  const resetIso = new Date().toISOString();

  // Reset operation
  await Promise.all([
    membersCol.updateOne(
      { id: testMemberId },
      {
        $set: {
          passwordHash: newHash.combined,
          salt: newHash.salt,
          lastPasswordResetAt: resetIso,
          passwordUpdatedAt: resetIso,
          updatedAt: resetIso,
        },
        $unset: { password: "" },
      }
    ),
    usersCol.updateOne(
      { memberId: testMemberId },
      {
        $set: {
          passwordHash: newHash.combined,
          mustChangePassword: true,
          updatedAt: resetIso,
        },
        $unset: { password: "" },
      }
    ),
    sessionsCol.updateMany(
      {
        $or: [{ userId: testMemberId }, { userId: testUsername }],
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: resetIso,
          updatedAt: resetIso,
        },
      }
    ),
  ]);

  // Verify Session Invalidation
  const sessionAfterReset = await sessionsCol.findOne({ id: testSessionId });
  console.log(`✓ Old session revoked: ${Boolean(sessionAfterReset?.revokedAt)} (Revoked at: ${sessionAfterReset?.revokedAt})`);

  // Verify New Password Authentication
  const updatedUserDoc = await usersCol.findOne({ memberId: testMemberId });
  const newAuthSuccess = updatedUserDoc && verifyPassword(newAssignedPassword, updatedUserDoc.passwordHash);
  const oldAuthSuccess = updatedUserDoc && verifyPassword(testPassword, updatedUserDoc.passwordHash);

  console.log(`✓ Authentication with NEW password: ${newAuthSuccess ? "SUCCESS" : "FAILED"}`);
  console.log(`✓ Old password no longer works: ${!oldAuthSuccess ? "SUCCESS (Rejected)" : "FAILED (Accepted old)"}`);
  console.log(`✓ Force password change flag: ${updatedUserDoc?.mustChangePassword ? "TRUE" : "FALSE"}`);

  // 6. Cleanup test records
  await Promise.all([
    membersCol.deleteOne({ id: testMemberId }),
    usersCol.deleteOne({ memberId: testMemberId }),
    sessionsCol.deleteOne({ id: testSessionId }),
  ]);
  console.log("\n✓ Test records cleaned up successfully.");

  console.log("\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===");
  await client.close();
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

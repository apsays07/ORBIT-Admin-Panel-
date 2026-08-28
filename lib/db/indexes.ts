import { Db } from "mongodb";

let indexesEnsured = false;

/**
 * Idempotent index initialization for high-frequency queries and joins.
 * Executes once asynchronously on initial connection.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;

  try {
    await Promise.allSettled([
      // Members collection indexes
      db.collection("members").createIndex({ id: 1 }, { unique: true }),
      db.collection("members").createIndex({ username: 1 }, { unique: true }),
      db.collection("members").createIndex({ role: 1 }),
      db.collection("members").createIndex({ status: 1 }),
      db.collection("members").createIndex({ createdAt: -1 }),
      db.collection("members").createIndex({ email: 1 }, { sparse: true }),
      db.collection("members").createIndex({ phone: 1 }, { sparse: true }),
      db.collection("members").createIndex({ panFull: 1 }, { sparse: true }),

      // Applications collection indexes
      db.collection("applications").createIndex({ id: 1 }, { unique: true }),
      db.collection("applications").createIndex({ ipoId: 1, createdAt: -1 }),
      db.collection("applications").createIndex({ memberId: 1, createdAt: -1 }),
      db.collection("applications").createIndex({ "contributors.memberId": 1 }),
      db.collection("applications").createIndex({ status: 1 }),
      db.collection("applications").createIndex({ allotmentStatus: 1 }),
      db.collection("applications").createIndex({ createdAt: -1 }),
      db.collection("applications").createIndex({ totalContribution: 1 }),
      db.collection("applications").createIndex({ panNumbers: 1 }),

      // IPOs collection indexes
      db.collection("ipos").createIndex({ id: 1 }, { unique: true }),
      db.collection("ipos").createIndex({ status: 1, createdAt: -1 }),
      db.collection("ipos").createIndex({ isCompleted: 1 }),
      db.collection("ipos").createIndex({ createdAt: -1 }),

      // Profit Distributions collection indexes
      db.collection("profit_distributions").createIndex({ ipoId: 1 }, { unique: true }),
      db.collection("profit_distributions").createIndex({ "memberPayouts.memberId": 1 }),

      // Activities & Audit logs collection indexes
      db.collection("activities").createIndex({ targetId: 1, createdAt: -1 }),
      db.collection("activities").createIndex({ actorUsername: 1, createdAt: -1 }),
      db.collection("activities").createIndex({ category: 1, createdAt: -1 }),
      db.collection("activities").createIndex({ eventType: 1, createdAt: -1 }),
      db.collection("activities").createIndex({ createdAt: -1 }),

      // Sessions collection indexes
      db.collection("sessions").createIndex({ id: 1 }, { unique: true }),
      db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("sessions").createIndex({ userId: 1 }),

      // Users collection indexes (authentication)
      db.collection("users").createIndex({ id: 1 }, { unique: true }),
      db.collection("users").createIndex({ username: 1 }, { unique: true }),
      db.collection("users").createIndex({ memberId: 1 }, { sparse: true }),
      db.collection("users").createIndex({ emailNormalized: 1 }, { sparse: true }),
    ]);
  } catch {
    // Indexes already exist or background index creation in progress
  }
}

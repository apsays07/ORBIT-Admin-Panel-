import { MongoClient, Db } from "mongodb";
import { ensureIndexes } from "./indexes";

// Resolve connection URI from either MONGODB_URI or DATABASE_URL
const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
const dbName = process.env.MONGODB_DATABASE || "nexo";

declare global {
  var _orbitMongoClientPromise: Promise<MongoClient> | undefined;
  var _orbitIndexesEnsuredPromise: Promise<void> | undefined;
}

const clientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

/**
 * Server-only database accessor.
 * Returns the connected MongoDB Db instance for the shared Nexo database.
 */
export async function getDatabase(): Promise<Db | null> {
  if (!uri) return null;
  try {
    if (!global._orbitMongoClientPromise) {
      const client = new MongoClient(uri, clientOptions);
      global._orbitMongoClientPromise = client.connect().catch((err) => {
        global._orbitMongoClientPromise = undefined;
        throw err;
      });
    }
    const client = await global._orbitMongoClientPromise;
    const db = client.db(dbName);
    if (!global._orbitIndexesEnsuredPromise) {
      global._orbitIndexesEnsuredPromise = ensureIndexes(db).catch(() => {});
    }
    return db;
  } catch {
    global._orbitMongoClientPromise = undefined;
    return null;
  }
}

let lastStatusCheckTime = 0;
let cachedStatus: "connected" | "disconnected" | "missing_config" = "connected";

/**
 * Safe, read-only status checker for development / status badge.
 * Does not expose raw connection strings or secrets.
 */
export async function getDatabaseConnectionStatus(): Promise<"connected" | "disconnected" | "missing_config"> {
  if (!uri) {
    return "missing_config";
  }

  const now = Date.now();
  if (now - lastStatusCheckTime < 60000) {
    return cachedStatus;
  }

  try {
    const db = await getDatabase();
    if (!db) {
      cachedStatus = "disconnected";
      lastStatusCheckTime = now;
      return "disconnected";
    }

    // Perform a harmless read-only ping command
    await db.command({ ping: 1 });
    cachedStatus = "connected";
    lastStatusCheckTime = now;
    return "connected";
  } catch {
    cachedStatus = "disconnected";
    lastStatusCheckTime = now;
    return "disconnected";
  }
}

export default getDatabase;

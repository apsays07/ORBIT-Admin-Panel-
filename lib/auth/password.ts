import crypto from "crypto";

/**
 * Hash a password using PBKDF2 with SHA-512 and a random 16-byte salt (100,000 iterations).
 * Returns { hash, salt, combined } where combined is "salt:hash".
 */
export function hashPassword(password: string): { hash: string; salt: string; combined: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  const combined = `${salt}:${hash}`;
  return { hash, salt, combined };
}

/**
 * Verify a candidate password against a stored "salt:hash" combined string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, combined?: string | null): boolean {
  if (!password || !combined || typeof combined !== "string") {
    return false;
  }

  const parts = combined.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const [salt, storedHash] = parts;
  if (!salt || !storedHash) {
    return false;
  }

  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    const hashBuffer = Buffer.from(computedHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");

    if (hashBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

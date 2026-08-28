import test from "node:test";
import assert from "node:assert/strict";
import { SESSION_CONFIG, generateSessionId } from "../session";

test("Session Config: Lifetimes and Thresholds", () => {
  // 30 days for persistent
  assert.equal(SESSION_CONFIG.PERSISTENT_MAX_AGE_SECONDS, 30 * 24 * 60 * 60);
  // 24 hours for transient
  assert.equal(SESSION_CONFIG.TRANSIENT_MAX_AGE_SECONDS, 24 * 60 * 60);
  // 5 days refresh threshold
  assert.equal(SESSION_CONFIG.REFRESH_THRESHOLD_SECONDS, 5 * 24 * 60 * 60);
  assert.equal(SESSION_CONFIG.COOKIE_NAME, "orbit_session");
});

test("Session ID Generation: Unique and Structured", () => {
  const id1 = generateSessionId();
  const id2 = generateSessionId();

  assert.ok(id1.startsWith("sess_"));
  assert.ok(id2.startsWith("sess_"));
  assert.notEqual(id1, id2);
  assert.ok(id1.length > 30);
});

test("Session Expiration Calculation", () => {
  const now = Date.now();
  const persistentExpiry = now + SESSION_CONFIG.PERSISTENT_MAX_AGE_SECONDS * 1000;
  const transientExpiry = now + SESSION_CONFIG.TRANSIENT_MAX_AGE_SECONDS * 1000;

  assert.ok(persistentExpiry > now);
  assert.ok(transientExpiry > now);
  assert.ok(persistentExpiry > transientExpiry);
});

"use server";

import {
  createSession,
  validateSession,
  destroySession,
  verifyAdminSession,
  SessionValidationResult,
} from "./session";

import { getDatabase } from "@/lib/db/mongodb";
import { verifyPassword } from "./password";

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

export async function loginAdmin(
  prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  try {
    const rawIdentifier = (formData.get("identifier") || formData.get("email") as string)?.toString() || "";
    const password = (formData.get("password") as string) || "";
    const rememberMeRaw = formData.get("rememberMe");
    const rememberMe = rememberMeRaw === "on" || rememberMeRaw === "true" || rememberMeRaw === "1";
    const requestedRedirect = (formData.get("redirect") as string)?.trim();

    let identifier = rawIdentifier.trim();
    if (identifier.startsWith("@")) {
      identifier = identifier.slice(1);
    }

    if (!identifier || !password) {
      return {
        success: false,
        error: "Username and password are required.",
      };
    }

    const db = await getDatabase();
    let authenticatedUser: { username: string; role: "SUPER_ADMIN" | "ADMIN" | "MEMBER"; status?: string } | null = null;

    if (db) {
      const cleanIdent = identifier.toLowerCase();
      // 1. Look up in canonical `users` collection
      const userDoc = await db.collection<any>("users").findOne({
        $or: [
          { username: { $regex: `^${identifier}$`, $options: "i" } },
          { emailNormalized: cleanIdent },
          { email: { $regex: `^${identifier}$`, $options: "i" } },
        ],
      });

      if (userDoc && userDoc.passwordHash) {
        const isMatch = verifyPassword(password, userDoc.passwordHash);
        if (isMatch) {
          authenticatedUser = {
            username: userDoc.username || identifier,
            role: userDoc.role || "MEMBER",
            status: userDoc.status || "ACTIVE",
          };
        }
      }

      // 2. Fallback lookup in `members` collection if not authenticated yet
      if (!authenticatedUser) {
        const memberDoc = await db.collection<any>("members").findOne({
          $or: [
            { username: { $regex: `^${identifier}$`, $options: "i" } },
            { email: { $regex: `^${identifier}$`, $options: "i" } },
          ],
        });

        if (memberDoc && memberDoc.passwordHash) {
          const isMatch = verifyPassword(password, memberDoc.passwordHash);
          if (isMatch) {
            authenticatedUser = {
              username: memberDoc.username || identifier,
              role: memberDoc.role || "MEMBER",
              status: memberDoc.status || "ACTIVE",
            };
          }
        }
      }
    }

    // 3. Fallback check for root bootstrap admin environment credentials
    if (!authenticatedUser) {
      const allowedUsernames = [
        (process.env.ADMIN_USERNAME || "ankitgod").toLowerCase(),
        (process.env.ADMIN_EMAIL || "admin@nexo.internal").toLowerCase(),
        "ankitgod",
      ];
      const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

      if (allowedUsernames.includes(identifier.toLowerCase()) && password === expectedPassword) {
        authenticatedUser = {
          username: identifier.toLowerCase() === "admin@nexo.internal" ? "ankitgod" : identifier,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        };
      }
    }

    if (!authenticatedUser) {
      return {
        success: false,
        error: "Invalid username or password.",
      };
    }

    if (authenticatedUser.status === "INACTIVE" || authenticatedUser.status === "SUSPENDED") {
      return {
        success: false,
        error: "Account is currently suspended. Please contact an administrator.",
      };
    }

    // Create session in MongoDB and set secure cookie
    await createSession({
      userId: authenticatedUser.username,
      role: authenticatedUser.role,
      rememberMe,
    });

    const redirectUrl = requestedRedirect && requestedRedirect.startsWith("/")
      ? requestedRedirect
      : "/ad/ipo";

    return {
      success: true,
      redirectUrl,
    };
  } catch (e) {
    console.error("[loginAdmin] Error during authentication:", e);
    return {
      success: false,
      error: "Unable to sign in right now. Please try again.",
    };
  }
}

export async function logoutAdmin(): Promise<{ success: boolean }> {
  try {
    await destroySession();
    return { success: true };
  } catch (err) {
    console.error("[logoutAdmin] Error during logout:", err);
    return { success: false };
  }
}

export async function checkSessionStatus(): Promise<SessionValidationResult> {
  return validateSession();
}

export { verifyAdminSession, validateSession, destroySession };

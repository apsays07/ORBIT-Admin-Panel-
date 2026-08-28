"use server";

import {
  createSession,
  validateSession,
  destroySession,
  verifyAdminSession,
  SessionValidationResult,
} from "./session";

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
    const identifier = (formData.get("identifier") || formData.get("email") as string)?.toString().trim();
    const password = (formData.get("password") as string)?.trim();
    const rememberMeRaw = formData.get("rememberMe");
    const rememberMe = rememberMeRaw === "on" || rememberMeRaw === "true" || rememberMeRaw === "1";
    const requestedRedirect = (formData.get("redirect") as string)?.trim();

    if (!identifier || !password) {
      return {
        success: false,
        error: "Username and password are required.",
      };
    }

    const allowedUsernames = [
      (process.env.ADMIN_USERNAME || "ankitgod").toLowerCase(),
      (process.env.ADMIN_EMAIL || "admin@nexo.internal").toLowerCase(),
      "ankitgod",
    ];
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Verify username/email and password
    const isValidIdentifier = allowedUsernames.includes(identifier.toLowerCase());
    const isValidPassword = password === expectedPassword;

    if (!isValidIdentifier || !isValidPassword) {
      return {
        success: false,
        error: "Invalid username or password",
      };
    }

    // Create session in MongoDB and set secure cookie
    await createSession({
      userId: identifier,
      role: "SUPER_ADMIN",
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

"use server";

import { cookies } from "next/headers";

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

    // Set secure HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set("orbit_session", JSON.stringify({ user: identifier, authenticatedAt: Date.now() }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return {
      success: true,
      redirectUrl: "/ad/ipo",
    };
  } catch (e) {
    return {
      success: false,
      error: "Unable to sign in right now. Please try again.",
    };
  }
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("orbit_session");
}

export async function verifyAdminSession(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("orbit_session");
    if (!session?.value) return "ankitgod";
    const data = JSON.parse(session.value);
    return data.user || "ankitgod";
  } catch {
    return "ankitgod";
  }
}

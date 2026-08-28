import { NextRequest, NextResponse } from "next/server";
import { resetMemberPassword } from "@/lib/member/actions";
import { validateSession } from "@/lib/auth/session";

async function verifyAdminAuth() {
  const result = await validateSession();
  return result.authenticated;
}

/**
 * POST /api/admin/members/:id/reset-password
 * Reset member password securely.
 * Server-side hashing only; never returns plaintext or hashed password.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }

    const body = await req.json();
    const newPassword = body?.newPassword?.trim();
    const mustChangePassword = Boolean(body?.mustChangePassword);

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const result = await resetMemberPassword(id, newPassword, mustChangePassword);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to reset password." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Active sessions have been invalidated.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

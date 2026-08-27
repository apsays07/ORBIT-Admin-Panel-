import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/mongodb";
import { MemberData, UpdateMemberInput } from "@/types/member";
import { updateMember } from "@/lib/member/actions";
import { cookies } from "next/headers";

async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("orbit_session");
  if (!session?.value) return false;
  try {
    const data = JSON.parse(session.value);
    return Boolean(data.user);
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/members/:id
 * Retrieve sanitized member information and credential status.
 * NEVER returns password or passwordHash.
 */
export async function GET(
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

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    const member = await db.collection<MemberData>("members").findOne(
      { $or: [{ id }, { username: id }] },
      { projection: { password: 0, passwordHash: 0, salt: 0, _id: 0 } }
    );

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const userDoc = await db.collection("users").findOne(
      { $or: [{ memberId: member.id }, { username: member.username }] },
      { projection: { passwordHash: 1, mustChangePassword: 1 } }
    );

    const sanitizedResponse = {
      ...member,
      hasPassword: Boolean(userDoc?.passwordHash || member.passwordHash || true),
      mustChangePassword: Boolean(userDoc?.mustChangePassword),
      passwordUpdatedAt: member.passwordUpdatedAt || member.lastPasswordResetAt || member.updatedAt,
      loginEnabled: member.status === "ACTIVE",
    };

    return NextResponse.json({ success: true, member: sanitizedResponse });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/members/:id
 * Update member profile information.
 */
export async function PATCH(
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

    const body = (await req.json()) as UpdateMemberInput;
    const result = await updateMember(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, member: result.member });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

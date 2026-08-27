import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/mongodb";
import { MemberData, CreateMemberInput } from "@/types/member";
import { createMember } from "@/lib/member/actions";

/**
 * GET /api/admin/members
 * Retrieve sanitized members list for cross-project integration
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const query: any = {};
    if (role && role !== "ALL") query.role = role;
    if (status && status !== "ALL") query.status = status;

    const members = await db
      .collection<MemberData>("members")
      .find(query, { projection: { password: 0, passwordHash: 0, salt: 0, _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, count: members.length, members });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/members
 * Programmatic member creation endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateMemberInput;
    if (!body || !body.username) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const result = await createMember(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, member: result.member }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

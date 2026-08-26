import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/mongodb";

const mediaMemoryCache = new Map<string, { buffer: Uint8Array; mimeType: string }>();

/* ────────────────────────────────────────────────────────────────
   GET /api/upload?id=...
   Retrieves stored image/avatar from MongoDB `media` collection by ID.
──────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing file ID." }, { status: 400 });
    }

    // Fast in-memory cache hit (0.1ms)
    const cached = mediaMemoryCache.get(id);
    if (cached) {
      return new NextResponse(cached.buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": cached.mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
    }

    const doc = await db.collection("media").findOne({
      $or: [{ id }, { _id: id as unknown as undefined }, { filename: id }],
    });

    if (!doc || !doc.data) {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
    }

    // 1. If data is a base64 Data URL (data:image/png;base64,...)
    if (typeof doc.data === "string" && doc.data.startsWith("data:")) {
      const match = doc.data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1] || doc.contentType || "image/png";
        const uint8 = new Uint8Array(Buffer.from(match[2], "base64"));
        mediaMemoryCache.set(id, { buffer: uint8, mimeType });
        return new NextResponse(uint8 as unknown as BodyInit, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // 2. If data is raw base64 string
    if (typeof doc.data === "string") {
      const mimeType = doc.contentType || "image/png";
      const uint8 = new Uint8Array(Buffer.from(doc.data, "base64"));
      mediaMemoryCache.set(id, { buffer: uint8, mimeType });
      return new NextResponse(uint8 as unknown as BodyInit, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 3. If data is already a Buffer / Binary
    if (Buffer.isBuffer(doc.data)) {
      const mimeType = doc.contentType || "image/png";
      const uint8 = new Uint8Array(doc.data);
      mediaMemoryCache.set(id, { buffer: uint8, mimeType });
      return new NextResponse(uint8 as unknown as BodyInit, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return NextResponse.json({ success: true, file: doc });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch file.";
    console.error("GET /api/upload error:", err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/upload
   Securely uploads and saves image/avatar to MongoDB `media` collection.
──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = "image/png";
    let filename = `avatar_${Date.now()}`;
    let customId = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      customId = (formData.get("id") as string) || "";

      if (!file) {
        return NextResponse.json({ success: false, error: "No file attached." }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: "File exceeds 5MB size limit." }, { status: 400 });
      }

      mimeType = file.type || "image/png";
      filename = file.name || filename;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      const dataUrl = body.data || body.file;
      customId = body.id || "";
      mimeType = body.mimeType || "image/png";

      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json({ success: false, error: "Missing data URL in request payload." }, { status: 400 });
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1] || mimeType;
        fileBuffer = Buffer.from(match[2], "base64");
      } else {
        fileBuffer = Buffer.from(dataUrl, "base64");
      }
    } else {
      return NextResponse.json({ success: false, error: "Unsupported content type." }, { status: 400 });
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ success: false, error: "Empty file content." }, { status: 400 });
    }

    const fileId = customId || `avatar_mem_admin_${Date.now()}`;
    const nowIso = new Date().toISOString();

    await db.collection("media").updateOne(
      { id: fileId },
      {
        $set: {
          id: fileId,
          filename,
          contentType: mimeType,
          data: fileBuffer,
          size: fileBuffer.length,
          updatedAt: nowIso,
          createdAt: nowIso,
        },
      },
      { upsert: true }
    );

    // Update in-memory cache
    mediaMemoryCache.set(fileId, {
      buffer: new Uint8Array(fileBuffer),
      mimeType,
    });

    const publicUrl = `/api/upload?id=${fileId}`;

    return NextResponse.json({
      success: true,
      fileId,
      url: publicUrl,
      size: fileBuffer.length,
      mimeType,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to upload file.";
    console.error("POST /api/upload error:", err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  deleteFromR2,
  getPublicUrl,
  getSignedGetUrl,
  uploadImageToR2,
} from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    const { key, url } = await uploadImageToR2(file);

    return NextResponse.json({ key, url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    const signed = request.nextUrl.searchParams.get("signed") === "true";

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    if (signed) {
      const url = await getSignedGetUrl(key);
      return NextResponse.json({ key, url });
    }

    return NextResponse.json({ key, url: getPublicUrl(key) });
  } catch (error) {
    console.error("Get URL error:", error);
    return NextResponse.json({ error: "Failed to get URL" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    await deleteFromR2(key);

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}

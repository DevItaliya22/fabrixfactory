import { NextRequest, NextResponse } from "next/server";

import { checkProductSlugAvailability } from "@/lib/products";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const slug = searchParams.get("slug") ?? "";
    const collectionIdsParam = searchParams.get("collectionIds") ?? "";
    const excludeProductId = searchParams.get("excludeProductId") ?? undefined;

    const collectionIds = collectionIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const result = await checkProductSlugAvailability(
      slug,
      collectionIds,
      excludeProductId,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check slug error:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 },
    );
  }
}

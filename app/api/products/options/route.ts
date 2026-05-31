import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      widths,
      colours,
      fabrics,
      collections,
      tags,
      lengthPresets,
      careInstructions,
    ] = await Promise.all([
      db.width.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, valueInCm: true },
      }),
      db.colour.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, hexCode: true },
      }),
      db.fabricComposition.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
      db.collection.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          parent: { select: { name: true } },
        },
      }),
      db.tag.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.lengthPreset.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, value: true, unit: true },
      }),
      db.careInstruction.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, description: true },
      }),
    ]);

    return NextResponse.json({
      widths,
      colours,
      fabrics,
      collections,
      tags,
      lengthPresets,
      careInstructions,
    });
  } catch (error) {
    console.error("Options fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load form options" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { resolveCollectionParentId } from "@/lib/resolve-collection-parent";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

import { isMasterType, type MasterType } from "@/lib/masters-config";

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");

    if (type && isMasterType(type)) {
      const items = await fetchMasterList(type);
      return NextResponse.json({ type, items });
    }

    const [colour, width, fabric, tag, collection, care, lengthPreset] =
      await Promise.all([
        fetchMasterList("colour"),
        fetchMasterList("width"),
        fetchMasterList("fabric"),
        fetchMasterList("tag"),
        fetchMasterList("collection"),
        fetchMasterList("care"),
        fetchMasterList("lengthPreset"),
      ]);

    return NextResponse.json({
      colour,
      width,
      fabric,
      tag,
      collection,
      care,
      lengthPreset,
    });
  } catch (error) {
    console.error("List masters error:", error);
    return NextResponse.json(
      { error: "Failed to load masters" },
      { status: 500 },
    );
  }
}

async function fetchMasterList(type: MasterType) {
  switch (type) {
    case "colour":
      return db.colour.findMany({ orderBy: { sortOrder: "asc" } });
    case "width":
      return db.width.findMany({ orderBy: { sortOrder: "asc" } });
    case "fabric":
      return db.fabricComposition.findMany({ orderBy: { sortOrder: "asc" } });
    case "tag":
      return db.tag.findMany({ orderBy: { name: "asc" } });
    case "collection":
      return db.collection.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { children: true } },
        },
      });
    case "care":
      return db.careInstruction.findMany({ orderBy: { sortOrder: "asc" } });
    case "lengthPreset":
      return db.lengthPreset.findMany({ orderBy: { sortOrder: "asc" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type as MasterType;

    switch (type) {
      case "colour": {
        if (!body.name?.trim()) {
          return NextResponse.json(
            { error: "Colour name required" },
            { status: 400 },
          );
        }
        const item = await db.colour.create({
          data: {
            name: body.name.trim(),
            hexCode: body.hexCode?.trim() || undefined,
          },
        });
        return NextResponse.json({ item });
      }

      case "width": {
        if (!body.label?.trim()) {
          return NextResponse.json(
            { error: "Width label required" },
            { status: 400 },
          );
        }
        const item = await db.width.create({
          data: {
            label: body.label.trim(),
            valueInCm: body.valueInCm ?? undefined,
          },
        });
        return NextResponse.json({ item });
      }

      case "fabric": {
        if (!body.name?.trim()) {
          return NextResponse.json(
            { error: "Fabric name required" },
            { status: 400 },
          );
        }
        const item = await db.fabricComposition.create({
          data: {
            name: body.name.trim(),
            description: body.description?.trim() || undefined,
          },
        });
        return NextResponse.json({ item });
      }

      case "tag": {
        if (!body.name?.trim()) {
          return NextResponse.json(
            { error: "Tag name required" },
            { status: 400 },
          );
        }
        const item = await db.tag.create({
          data: { name: body.name.trim() },
        });
        return NextResponse.json({ item });
      }

      case "collection": {
        if (!body.name?.trim()) {
          return NextResponse.json(
            { error: "Collection name required" },
            { status: 400 },
          );
        }
        const parentId = await resolveCollectionParentId(
          undefined,
          body.parentId as string | null | undefined,
        );
        const slug = body.slug?.trim() || slugify(body.name);
        const item = await db.collection.create({
          data: {
            name: body.name.trim(),
            slug,
            description: body.description?.trim() || undefined,
            parentId,
          },
          include: {
            parent: { select: { id: true, name: true } },
            _count: { select: { children: true } },
          },
        });
        return NextResponse.json({ item });
      }

      case "care": {
        if (!body.title?.trim()) {
          return NextResponse.json(
            { error: "Care title required" },
            { status: 400 },
          );
        }
        const item = await db.careInstruction.create({
          data: {
            title: body.title.trim(),
            description: body.description?.trim() || undefined,
            iconKey: body.iconKey?.trim() || undefined,
          },
        });
        return NextResponse.json({ item });
      }

      case "lengthPreset": {
        if (body.value == null || !body.unit) {
          return NextResponse.json(
            { error: "Length value and unit required" },
            { status: 400 },
          );
        }
        const item = await db.lengthPreset.create({
          data: {
            label: body.label?.trim() || undefined,
            value: body.value,
            unit: body.unit,
          },
        });
        return NextResponse.json({ item });
      }

      default:
        return NextResponse.json(
          { error: "Unknown master type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Master create error:", error);
    let message = "Failed to create master";
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        message = "This item already exists";
      } else if (
        error.message.includes("parent") ||
        error.message.includes("sub-collection")
      ) {
        message = error.message;
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

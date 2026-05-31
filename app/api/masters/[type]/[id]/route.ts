import { NextRequest, NextResponse } from "next/server";

import { resolveCollectionParentId } from "@/app/api/masters/route";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { isMasterType } from "@/lib/masters-config";

type RouteContext = { params: Promise<{ type: string; id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { type, id } = await context.params;

    if (!isMasterType(type)) {
      return NextResponse.json(
        { error: "Invalid master type" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const item = await updateMaster(type, id, body);
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update master error:", error);
    const message =
      error instanceof Error &&
      (error.message.includes("parent") ||
        error.message.includes("sub-collection"))
        ? error.message
        : "Failed to update master";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { type, id } = await context.params;

    if (!isMasterType(type)) {
      return NextResponse.json(
        { error: "Invalid master type" },
        { status: 400 },
      );
    }

    await deleteMaster(type, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete master error:", error);
    return NextResponse.json(
      { error: "Failed to delete master" },
      { status: 500 },
    );
  }
}

async function updateMaster(
  type: string,
  id: string,
  body: Record<string, unknown>,
) {
  switch (type) {
    case "colour":
      return db.colour.update({
        where: { id },
        data: {
          name: (body.name as string)?.trim(),
          hexCode: (body.hexCode as string)?.trim() || null,
          isActive: body.isActive as boolean | undefined,
        },
      });
    case "width": {
      const label = (body.label as string)?.trim();
      return db.width.update({
        where: { id },
        data: {
          label,
          valueInCm:
            body.valueInCm != null && body.valueInCm !== ""
              ? Number(body.valueInCm)
              : null,
          isActive: body.isActive as boolean | undefined,
        },
      });
    }
    case "fabric":
      return db.fabricComposition.update({
        where: { id },
        data: {
          name: (body.name as string)?.trim(),
          description: (body.description as string)?.trim() || null,
          isActive: body.isActive as boolean | undefined,
        },
      });
    case "tag":
      return db.tag.update({
        where: { id },
        data: {
          name: (body.name as string)?.trim(),
          isActive: body.isActive as boolean | undefined,
        },
      });
    case "collection": {
      const name = (body.name as string)?.trim();
      const parentId =
        body.parentId !== undefined
          ? await resolveCollectionParentId(
              id,
              body.parentId as string | null | undefined,
            )
          : undefined;
      return db.collection.update({
        where: { id },
        data: {
          name,
          slug:
            (body.slug as string)?.trim() || (name ? slugify(name) : undefined),
          description: (body.description as string)?.trim() || null,
          isActive: body.isActive as boolean | undefined,
          ...(body.parentId !== undefined ? { parentId } : {}),
        },
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { children: true } },
        },
      });
    }
    case "care":
      return db.careInstruction.update({
        where: { id },
        data: {
          title: (body.title as string)?.trim(),
          description: (body.description as string)?.trim() || null,
          isActive: body.isActive as boolean | undefined,
        },
      });
    case "lengthPreset":
      return db.lengthPreset.update({
        where: { id },
        data: {
          label: (body.label as string)?.trim() || null,
          value: body.value != null ? Number(body.value) : undefined,
          unit: body.unit as "METRE" | "YARD" | undefined,
          isActive: body.isActive as boolean | undefined,
        },
      });
    default:
      throw new Error("Unknown type");
  }
}

async function deleteMaster(type: string, id: string) {
  switch (type) {
    case "colour":
      return db.colour.delete({ where: { id } });
    case "width":
      return db.width.delete({ where: { id } });
    case "fabric":
      return db.fabricComposition.delete({ where: { id } });
    case "tag":
      return db.tag.delete({ where: { id } });
    case "collection":
      return db.collection.delete({ where: { id } });
    case "care":
      return db.careInstruction.delete({ where: { id } });
    case "lengthPreset":
      return db.lengthPreset.delete({ where: { id } });
    default:
      throw new Error("Unknown type");
  }
}

import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { productDetailInclude } from "@/lib/product-include";
import { serializeProduct } from "@/lib/serialize";
import { slugify } from "@/lib/slug";
import { syncProductRelations } from "@/lib/sync-product-relations";

type RouteContext = { params: Promise<{ id: string }> };

type UpdateProductBody = {
  name: string;
  slug?: string;
  skuCode?: string;
  description?: string;
  widthId?: string;
  fabricCompositionId?: string;
  weightValue?: number;
  weightUnit?: "METRE" | "PIECE" | "YARD";
  stockStatus?:
    | "IN_STOCK"
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | "PRE_ORDER"
    | "DISCONTINUED";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isOnOffer?: boolean;
  offerType?: "PERCENTAGE" | "FIXED_PRICE";
  offerPercent?: number;
  offerFixedPrice?: number;
  leadTimeDays?: number;
  leadTimeDate?: string;
  availabilityDate?: string;
  metaTitle?: string;
  metaDesc?: string;
  colours?: { colourId: string; isDefault?: boolean }[];
  images?: {
    url: string;
    key?: string;
    colourId?: string;
    altText?: string;
    isPrimary?: boolean;
  }[];
  rateTiers?: {
    minQuantity: number;
    maxQuantity?: number;
    originalRate: number;
    discountedRate?: number;
    shippingCharge?: number;
  }[];
  availableLengths?: {
    lengthPresetId?: string;
    customValue?: number;
    customUnit?: "METRE" | "YARD";
  }[];
  careInstructionIds?: string[];
  collectionIds?: string[];
  tagIds?: string[];
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const product = await db.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      product: serializeProduct(product as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Failed to load product" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateProductBody;

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 },
      );
    }

    const slug = body.slug?.trim() || slugify(body.name);

    const product = await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: body.name.trim(),
          slug,
          skuCode: body.skuCode?.trim() || null,
          description: body.description?.trim() || null,
          widthId: body.widthId || null,
          fabricCompositionId: body.fabricCompositionId || null,
          weightValue: body.weightValue ?? null,
          weightUnit: body.weightUnit ?? null,
          stockStatus: body.stockStatus ?? "IN_STOCK",
          status: body.status ?? "DRAFT",
          isOnOffer: body.isOnOffer ?? false,
          offerType: body.isOnOffer ? (body.offerType ?? null) : null,
          offerPercent: body.isOnOffer ? (body.offerPercent ?? null) : null,
          offerFixedPrice: body.isOnOffer
            ? (body.offerFixedPrice ?? null)
            : null,
          leadTimeDays: body.leadTimeDays ?? null,
          leadTimeDate: body.leadTimeDate ? new Date(body.leadTimeDate) : null,
          availabilityDate: body.availabilityDate
            ? new Date(body.availabilityDate)
            : null,
          metaTitle: body.metaTitle?.trim() || null,
          metaDesc: body.metaDesc?.trim() || null,
        },
      });

      await syncProductRelations(tx, id, {
        name: body.name.trim(),
        colours: body.colours,
        images: body.images,
        rateTiers: body.rateTiers,
        availableLengths: body.availableLengths,
        careInstructionIds: body.careInstructionIds,
        collectionIds: body.collectionIds,
        tagIds: body.tagIds,
      });

      return tx.product.findUnique({
        where: { id },
        include: productDetailInclude,
      });
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Update product error:", error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A product with this slug or SKU already exists"
        : "Failed to update product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}

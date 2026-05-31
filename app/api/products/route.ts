import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { serializeProduct, slugify } from "@/lib/format";
import { productDetailInclude, syncProductRelations } from "@/lib/products";

export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        width: { select: { label: true } },
        fabricComposition: { select: { name: true } },
        productImages: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        _count: {
          select: {
            productColours: true,
            productImages: true,
          },
        },
      },
    });

    return NextResponse.json({
      products: products.map((p) =>
        serializeProduct(p as Record<string, unknown>),
      ),
    });
  } catch (error) {
    console.error("List products error:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 },
    );
  }
}

type ProductImageInput = {
  url: string;
  key?: string;
  colourId?: string;
  altText?: string;
  isPrimary?: boolean;
};

type ProductColourInput = {
  colourId: string;
  isDefault?: boolean;
};

type RateTierInput = {
  minQuantity: number;
  maxQuantity?: number;
  originalRate: number;
  discountedRate?: number;
  shippingCharge?: number;
};

type AvailableLengthInput = {
  lengthPresetId?: string;
  customValue?: number;
  customUnit?: "METRE" | "YARD";
};

type CreateProductBody = {
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
  colours?: ProductColourInput[];
  images?: ProductImageInput[];
  rateTiers?: RateTierInput[];
  availableLengths?: AvailableLengthInput[];
  careInstructionIds?: string[];
  collectionIds?: string[];
  tagIds?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateProductBody;

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 },
      );
    }

    const slug = body.slug?.trim() || slugify(body.name);

    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: body.name.trim(),
          slug,
          skuCode: body.skuCode?.trim() || undefined,
          description: body.description?.trim() || undefined,
          widthId: body.widthId || undefined,
          fabricCompositionId: body.fabricCompositionId || undefined,
          weightValue: body.weightValue ?? undefined,
          weightUnit: body.weightUnit ?? undefined,
          stockStatus: body.stockStatus ?? "IN_STOCK",
          status: body.status ?? "DRAFT",
          isOnOffer: body.isOnOffer ?? false,
          offerType: body.isOnOffer ? (body.offerType ?? undefined) : undefined,
          offerPercent: body.isOnOffer
            ? (body.offerPercent ?? undefined)
            : undefined,
          offerFixedPrice: body.isOnOffer
            ? (body.offerFixedPrice ?? undefined)
            : undefined,
          leadTimeDays: body.leadTimeDays ?? undefined,
          leadTimeDate: body.leadTimeDate
            ? new Date(body.leadTimeDate)
            : undefined,
          availabilityDate: body.availabilityDate
            ? new Date(body.availabilityDate)
            : undefined,
          metaTitle: body.metaTitle?.trim() || undefined,
          metaDesc: body.metaDesc?.trim() || undefined,
        },
      });

      await syncProductRelations(tx, created.id, {
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
        where: { id: created.id },
        include: productDetailInclude,
      });
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);

    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A product with this slug or SKU already exists"
        : "Failed to create product";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

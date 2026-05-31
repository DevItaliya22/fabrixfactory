import type { Prisma } from "@/app/generated/prisma/client";

export const productDetailInclude = {
  productColours: {
    include: { colour: true },
    orderBy: { sortOrder: "asc" as const },
  },
  productImages: { orderBy: { sortOrder: "asc" as const } },
  productRateTiers: { orderBy: { sortOrder: "asc" as const } },
  productAvailableLengths: {
    include: { lengthPreset: true },
    orderBy: { sortOrder: "asc" as const },
  },
  productCareInstructions: {
    include: { careInstruction: true },
    orderBy: { sortOrder: "asc" as const },
  },
  productCollections: {
    include: { collection: true },
    orderBy: { sortOrder: "asc" as const },
  },
  productTags: { include: { tag: true } },
  width: true,
  fabricComposition: true,
} as const;

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

export type ProductRelationsInput = {
  name: string;
  colours?: ProductColourInput[];
  images?: ProductImageInput[];
  rateTiers?: RateTierInput[];
  availableLengths?: AvailableLengthInput[];
  careInstructionIds?: string[];
  collectionIds?: string[];
  tagIds?: string[];
};

export async function syncProductRelations(
  tx: Prisma.TransactionClient,
  productId: string,
  body: ProductRelationsInput,
) {
  await tx.productColour.deleteMany({ where: { productId } });
  await tx.productImage.deleteMany({ where: { productId } });
  await tx.productRateTier.deleteMany({ where: { productId } });
  await tx.productAvailableLength.deleteMany({ where: { productId } });
  await tx.productCareInstruction.deleteMany({ where: { productId } });
  await tx.productCollection.deleteMany({ where: { productId } });
  await tx.productTag.deleteMany({ where: { productId } });

  const colourIds = new Set<string>();

  if (body.colours?.length) {
    await tx.productColour.createMany({
      data: body.colours.map((c, index) => {
        colourIds.add(c.colourId);
        return {
          productId,
          colourId: c.colourId,
          isDefault: c.isDefault ?? index === 0,
          sortOrder: index,
        };
      }),
    });
  }

  if (body.images?.length) {
    await tx.productImage.createMany({
      data: body.images.map((img, index) => {
        if (img.colourId) colourIds.add(img.colourId);
        return {
          productId,
          colourId: img.colourId || undefined,
          url: img.url,
          altText: img.altText || body.name,
          isPrimary: img.isPrimary ?? index === 0,
          sortOrder: index,
          extraInfo: img.key ? { r2Key: img.key } : undefined,
        };
      }),
    });

    for (const colourId of colourIds) {
      const exists = body.colours?.some((c) => c.colourId === colourId);
      if (!exists) {
        await tx.productColour.create({
          data: {
            productId,
            colourId,
            isDefault: false,
            sortOrder: body.colours?.length ?? 0,
          },
        });
      }
    }
  }

  if (body.rateTiers?.length) {
    await tx.productRateTier.createMany({
      data: body.rateTiers.map((tier, index) => ({
        productId,
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity ?? undefined,
        originalRate: tier.originalRate,
        discountedRate: tier.discountedRate ?? undefined,
        shippingCharge: tier.shippingCharge ?? undefined,
        sortOrder: index,
      })),
    });
  }

  if (body.availableLengths?.length) {
    await tx.productAvailableLength.createMany({
      data: body.availableLengths.map((len, index) => ({
        productId,
        lengthPresetId: len.lengthPresetId || undefined,
        customValue: len.customValue ?? undefined,
        customUnit: len.customUnit ?? undefined,
        sortOrder: index,
      })),
    });
  }

  if (body.careInstructionIds?.length) {
    await tx.productCareInstruction.createMany({
      data: body.careInstructionIds.map((careInstructionId, index) => ({
        productId,
        careInstructionId,
        sortOrder: index,
      })),
    });
  }

  if (body.collectionIds?.length) {
    await tx.productCollection.createMany({
      data: body.collectionIds.map((collectionId, index) => ({
        productId,
        collectionId,
        sortOrder: index,
      })),
    });
  }

  if (body.tagIds?.length) {
    await tx.productTag.createMany({
      data: body.tagIds.map((tagId) => ({
        productId,
        tagId,
      })),
    });
  }
}

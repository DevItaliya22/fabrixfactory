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

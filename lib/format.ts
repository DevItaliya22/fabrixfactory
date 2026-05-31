/** Convert Prisma Decimal fields to plain numbers for JSON responses */
export function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export function serializeProduct<T extends Record<string, unknown>>(
  product: T,
): T {
  const out = { ...product } as Record<string, unknown>;

  for (const key of [
    "weightValue",
    "offerPercent",
    "offerFixedPrice",
  ] as const) {
    if (key in out) out[key] = decimalToNumber(out[key]);
  }

  if (Array.isArray(out.productRateTiers)) {
    out.productRateTiers = (
      out.productRateTiers as Record<string, unknown>[]
    ).map((tier) => ({
      ...tier,
      minQuantity: decimalToNumber(tier.minQuantity),
      maxQuantity: decimalToNumber(tier.maxQuantity),
      originalRate: decimalToNumber(tier.originalRate),
      discountedRate: decimalToNumber(tier.discountedRate),
      shippingCharge: decimalToNumber(tier.shippingCharge),
    }));
  }

  return out as T;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

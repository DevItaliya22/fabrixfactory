import type { SlugConflict } from "@/lib/products";

export type RateTierRow = {
  id: string;
  minQuantity: string;
  maxQuantity: string;
  originalRate: string;
  discountedRate: string;
  shippingCharge: string;
};

export function parseNonNegativeDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export function isInvalidDecimalInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return parseNonNegativeDecimal(trimmed) === null;
}

export function validateRateTiers(
  tiers: RateTierRow[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  tiers.forEach((tier) => {
    const hasAnyValue =
      tier.minQuantity.trim() ||
      tier.maxQuantity.trim() ||
      tier.originalRate.trim() ||
      tier.discountedRate.trim() ||
      tier.shippingCharge.trim();

    if (!hasAnyValue) return;

    if (isInvalidDecimalInput(tier.minQuantity)) {
      errors[tier.id] = "Min QTY must be zero or greater";
      return;
    }
    if (isInvalidDecimalInput(tier.maxQuantity)) {
      errors[tier.id] = "Max QTY must be zero or greater";
      return;
    }
    if (isInvalidDecimalInput(tier.originalRate)) {
      errors[tier.id] = "Original rate must be zero or greater";
      return;
    }
    if (isInvalidDecimalInput(tier.discountedRate)) {
      errors[tier.id] = "Discounted rate must be zero or greater";
      return;
    }
    if (isInvalidDecimalInput(tier.shippingCharge)) {
      errors[tier.id] = "Shipping must be zero or greater";
      return;
    }

    if (!tier.originalRate.trim()) {
      errors[tier.id] = "Original rate is required";
      return;
    }

    const min = parseNonNegativeDecimal(tier.minQuantity);
    const max = parseNonNegativeDecimal(tier.maxQuantity);
    if (min != null && max != null && max < min) {
      errors[tier.id] = "Max QTY must be greater than or equal to min QTY";
    }
  });

  return errors;
}

export function formatSlugConflictMessage(conflicts: SlugConflict[]): string {
  if (conflicts.length === 0) return "";
  const paths = conflicts.map((c) => c.path).join(", ");
  return `Slug already used at: ${paths}`;
}

export const PROMO_RATES = [20, 30, 40] as const;

type PromotionVariant = {
  id: number;
  price: string | number;
  original_price?: string | number | null;
};

const money = (value: number) => (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);

export function promotionForVariant(variant: PromotionVariant) {
  const discountPercent = PROMO_RATES[Math.abs(variant.id) % PROMO_RATES.length];
  // Reuse original_price when a promoted variant comes back from localStorage.
  // Raw catalog entries intentionally use price as the current/base price.
  const currentPrice = Number(variant.original_price ?? variant.price);
  const originalPrice = money(currentPrice);
  if (currentPrice <= 0) return { discountPercent: 0, salePrice: "0.00", originalPrice };
  const salePrice = money(currentPrice * (1 - discountPercent / 100));
  return { discountPercent, salePrice, originalPrice };
}

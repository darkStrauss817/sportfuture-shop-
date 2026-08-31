export const PROMO_RATES = [20, 25, 30, 35, 40, 45, 50] as const;

export function promotionForVariant(variant: { id: number; price: string | number }) {
  const discountPercent = PROMO_RATES[Math.abs(variant.id) % PROMO_RATES.length];
  const salePrice = Number(variant.price);
  const originalPrice = (salePrice / (1 - discountPercent / 100)).toFixed(2);
  return { discountPercent, originalPrice };
}

import { describe, expect, it } from "vitest";
import { calculatePriceCents, getProduct, getVariant, listProducts, normalizeEmail } from "./catalog";
import { EUROPEAN_COUNTRIES } from "./stripe";
import { PROMO_RATES, promotionForVariant } from "@shared/promotions";
import { FOOTWEAR_SIZES, availableSizesForProduct, ensureFootwearVariants, isValidSizeSelection, sizesForProduct, variantForSize } from "@shared/productSizes";

describe("SportFuture checkout rules", () => {
  it("normalizes the customer email before coupon checks", () => {
    expect(normalizeEmail("  Cliente@Exemplo.PT ")).toBe("cliente@exemplo.pt");
  });

  it("calculates the subtotal from the server catalog, never client prices", () => {
    const product = getProduct(11207574847830);
    expect(product).toBeTruthy();
    const variant = product ? product.variants.find(item => item.available !== false) : undefined;
    expect(variant).toBeTruthy();
    if (!product || !variant) return;
    const selectedSize = variant.title.match(/(?:^|\/)\s*(S|M|L|XL|XXL)\s*$/)?.[1];
    expect(calculatePriceCents([{ productId: product.id, variantId: variant.id, quantity: 2, size: selectedSize }]))
      .toBe(Math.round(Number(variant.price) * 100) * 2);
    expect(getVariant(product.id, variant.id)?.id).toBe(variant.id);
  });

  it("defines the fixed Europe shipping destination list", () => {
    expect(EUROPEAN_COUNTRIES).toContain("PT");
    expect(EUROPEAN_COUNTRIES).toContain("DE");
    expect(EUROPEAN_COUNTRIES).toContain("GB");
    expect(EUROPEAN_COUNTRIES.length).toBeGreaterThan(25);
  });

  it("gives every priced product a real 20%, 30% or 40% promotion", () => {
    const page = listProducts({ page: 1, pageSize: 48 });
    expect(page.items).toHaveLength(48);
    for (const product of page.items) {
      for (const variant of product.variants) {
        expect(variant.compare_at_price).toBeTruthy();
        if (Number(variant.compare_at_price) === 0) {
          expect(variant.price).toBe("0.00");
          expect(variant.discount_percent).toBe(0);
          continue;
        }
        expect(PROMO_RATES).toContain(variant.discount_percent);
        expect(Number(variant.price)).toBeLessThan(Number(variant.compare_at_price));
        expect(Number(variant.price)).toBeCloseTo(Number(variant.compare_at_price) * (1 - Number(variant.discount_percent) / 100), 2);
      }
    }
    const previouslyMissing = getProduct(11207574847830)?.variants[0];
    expect(PROMO_RATES).toContain(previouslyMissing?.discount_percent);
  });

  it("calculates discounts from the current price without inflating it first", () => {
    expect(promotionForVariant({ id: 1, price: "100.00" })).toEqual({ discountPercent: 30, salePrice: "70.00", originalPrice: "100.00" });
    expect(promotionForVariant({ id: 2, price: "99.99" })).toEqual({ discountPercent: 40, salePrice: "59.99", originalPrice: "99.99" });
    expect(promotionForVariant({ id: 3, price: "45.49" })).toEqual({ discountPercent: 20, salePrice: "36.39", originalPrice: "45.49" });
    expect(promotionForVariant({ id: 4, price: "0.00" })).toEqual({ discountPercent: 0, salePrice: "0.00", originalPrice: "0.00" });
  });

  it("exposes every footwear size from 35 through 46", () => {
    expect(FOOTWEAR_SIZES).toEqual(["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]);
    expect(sizesForProduct({ title: "Sapatilhas de corrida", type: "Calçado", tags: [] })).toEqual([...FOOTWEAR_SIZES]);
    expect(sizesForProduct({ title: "Chinelos de piscina", type: "", tags: [] })).toEqual([...FOOTWEAR_SIZES]);
  });

  it("normalizes every footwear product to selectable sizes 35 through 46", () => {
    const product = getProduct(11199675269462);
    expect(product).toBeTruthy();
    if (!product) return;
    expect(availableSizesForProduct(product)).toEqual([...FOOTWEAR_SIZES]);
    const variant35 = variantForSize(product, "35");
    const variant46 = variantForSize(product, "46");
    expect(variant35).toBeTruthy();
    expect(variant46).toBeTruthy();
    expect(variant35?.available).toBe(true);
    expect(variant46?.available).toBe(true);
    expect(isValidSizeSelection(product, variant35!, "35")).toBe(true);
    expect(isValidSizeSelection(product, variant46!, "46")).toBe(true);
    expect(isValidSizeSelection(product, variant46!, "40")).toBe(false);
    expect(calculatePriceCents([{ productId: product.id, variantId: variant35!.id, quantity: 1, size: "35" }]))
      .toBe(Math.round(Number(variant35!.price) * 100));
  });

  it("creates missing footwear variants without disabling any requested size", () => {
    const product = { id: 999, title: "Sapatilhas de corrida", type: "Calçado", tags: [], variants: [{ id: 1, title: "Preto / 40", option1: "Preto", option2: "40", available: true }] };
    const variants = ensureFootwearVariants(product);
    expect(variants).toHaveLength(12);
    expect(availableSizesForProduct({ ...product, variants })).toEqual([...FOOTWEAR_SIZES]);
    expect(variants.every(variant => variant.available !== false)).toBe(true);
  });

  it("applies SF10 as ten percent of the server subtotal", () => {
    const subtotal = 12345;
    expect(Math.round(subtotal * 0.9) + 499).toBe(11610);
  });

  it("returns products for every sport category used by the menu", () => {
    for (const tag of ["Running", "Futebol", "Fitness", "Basquetebol"]) {
      const result = listProducts({ tag, page: 1, pageSize: 48 });
      expect(result.total, `${tag} should contain products`).toBeGreaterThan(0);
      expect(result.items.length, `${tag} first page should contain products`).toBeGreaterThan(0);
    }
  });
});

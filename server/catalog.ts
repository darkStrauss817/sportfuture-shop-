import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promotionForVariant } from "@shared/promotions";
import { ensureFootwearVariants, isValidSizeSelection } from "@shared/productSizes";

export type CatalogVariant = {
  id: number;
  title: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  sku?: string | null;
  available?: boolean;
  price: string;
  compare_at_price?: string | null;
  original_price?: string;
  discount_percent?: number;
};

export type CatalogProduct = {
  id: number;
  handle: string;
  title: string;
  vendor: string;
  type: string;
  tags: string[];
  description?: string;
  images: string[];
  options?: Array<{ name: string; values: string[] }>;
  variants: CatalogVariant[];
};

function withPromotions(product: CatalogProduct): CatalogProduct {
  const normalizedVariants = ensureFootwearVariants(product);
  return {
    ...product,
    variants: normalizedVariants.map(variant => {
      const promotion = promotionForVariant(variant);
      return { ...variant, price: promotion.salePrice, compare_at_price: promotion.originalPrice, original_price: promotion.originalPrice, discount_percent: promotion.discountPercent };
    }),
  };
}

const SPORT_CATEGORY_TERMS: Record<string, string[]> = {
  running: ["running", "corrida", "runner", "windrunner", "trail"],
  futebol: ["futebol", "football", "chuteira", "soccer"],
  fitness: ["fitness", "ginásio", "ginasio", "gym", "training", "treino", "yoga", "pilates"],
  basquetebol: ["basquetebol", "basketball", "nba"],
};

function matchesTag(product: CatalogProduct, tag?: string) {
  if (!tag) return true;
  if (product.tags.some(value => value.toLowerCase() === tag)) return true;
  const terms = SPORT_CATEGORY_TERMS[tag];
  if (!terms) return false;
  const haystack = [product.title, product.type, ...product.tags].join(" ").toLowerCase();
  return terms.some(term => haystack.includes(term));
}

let productsCache: CatalogProduct[] | undefined;
function products() {
  if (!productsCache) {
    const source = readFileSync(join(process.cwd(), "shared", "catalog.json"), "utf8");
    productsCache = (JSON.parse(source) as { products: CatalogProduct[] }).products;
  }
  return productsCache;
}

export function listProducts(input: { page?: number; pageSize?: number; query?: string; tag?: string; vendor?: string }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(12, input.pageSize ?? 24));
  const query = input.query?.trim().toLowerCase();
  const tag = input.tag?.trim().toLowerCase();
  const vendor = input.vendor?.trim().toLowerCase();
  const filtered = products().filter(product => {
    const haystack = [product.title, product.vendor, product.type, ...product.tags].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && matchesTag(product, tag)
      && (!vendor || product.vendor.toLowerCase() === vendor);
  });
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map(product => ({
      ...product,
      variants: withPromotions({ ...product, variants: product.variants }).variants,
    })),
    total: filtered.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}

export function getProduct(productId: number) {
  const product = products().find(product => product.id === productId);
  return product ? withPromotions(product) : undefined;
}

export function getVariant(productId: number, variantId: number) {
  const product = getProduct(productId);
  return product?.variants.find(variant => variant.id === variantId && variant.available !== false);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function calculatePriceCents(items: Array<{ productId: number; variantId: number; quantity: number; size?: string }>) {
  return items.reduce((sum, item) => {
    const product = getProduct(item.productId);
    const variant = getVariant(item.productId, item.variantId);
    if (!product || !variant) throw new Error("Produto ou variante indisponível.");
    if (!isValidSizeSelection(product, variant, item.size)) throw new Error("O tamanho selecionado não corresponde a uma variante disponível.");
    const quantity = Math.min(20, Math.max(1, Math.floor(item.quantity)));
    return sum + Math.round(Number(variant.price) * 100) * quantity;
  }, 0);
}

export function getProductSnapshot(productId: number, variantId: number) {
  const product = getProduct(productId);
  const variant = getVariant(productId, variantId);
  if (!product || !variant) throw new Error("Produto ou variante indisponível.");
  return { product, variant };
}

import type { Fetcher } from "@cloudflare/workers-types";
import { promotionForVariant } from "../../shared/promotions";
import { ensureFootwearVariants, isValidSizeSelection } from "../../shared/productSizes";

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

export type CatalogEnv = { ASSETS: Fetcher };

let productsCache: CatalogProduct[] | undefined;

async function products(env: CatalogEnv, request: Request) {
  if (productsCache) return productsCache;
  const url = new URL("/catalog.json", request.url);
  const response = await env.ASSETS.fetch(url);
  if (!response.ok) throw new Error("Catálogo não encontrado nos assets do site.");
  productsCache = (await response.json() as { products: CatalogProduct[] }).products;
  return productsCache;
}

function withPromotions(product: CatalogProduct): CatalogProduct {
  const normalizedVariants = ensureFootwearVariants(product);
  return {
    ...product,
    variants: normalizedVariants.map(variant => {
      const promotion = promotionForVariant(variant);
      return { ...variant, compare_at_price: promotion.originalPrice, original_price: promotion.originalPrice, discount_percent: promotion.discountPercent };
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

export async function listProducts(env: CatalogEnv, request: Request, input: { page?: number; pageSize?: number; query?: string; tag?: string; vendor?: string }) {
  const allProducts = await products(env, request);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(12, input.pageSize ?? 24));
  const query = input.query?.trim().toLowerCase();
  const tag = input.tag?.trim().toLowerCase();
  const vendor = input.vendor?.trim().toLowerCase();
  const filtered = allProducts.filter(product => {
    const haystack = [product.title, product.vendor, product.type, ...product.tags].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && matchesTag(product, tag)
      && (!vendor || product.vendor.toLowerCase() === vendor);
  });
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map(product => withPromotions(product)),
    total: filtered.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}

export async function getProduct(env: CatalogEnv, request: Request, productId: number) {
  const allProducts = await products(env, request);
  const product = allProducts.find(item => item.id === productId);
  return product ? withPromotions(product) : undefined;
}

export async function getVariant(env: CatalogEnv, request: Request, productId: number, variantId: number) {
  const product = await getProduct(env, request, productId);
  return product?.variants.find(variant => variant.id === variantId && variant.available !== false);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function calculatePriceCents(env: CatalogEnv, request: Request, items: Array<{ productId: number; variantId: number; quantity: number; size?: string }>) {
  return items.reduce(async (previousPromise, item) => {
    const sum = await previousPromise;
    const product = await getProduct(env, request, item.productId);
    const variant = await getVariant(env, request, item.productId, item.variantId);
    if (!product || !variant) throw new Error("Produto ou variante indisponível.");
    if (!isValidSizeSelection(product, variant, item.size)) throw new Error("O tamanho selecionado não corresponde a uma variante disponível.");
    const quantity = Math.min(20, Math.max(1, Math.floor(item.quantity)));
    return sum + Math.round(Number(variant.price) * 100) * quantity;
  }, Promise.resolve(0));
}

export async function getProductSnapshot(env: CatalogEnv, request: Request, productId: number, variantId: number) {
  const product = await getProduct(env, request, productId);
  const variant = await getVariant(env, request, productId, variantId);
  if (!product || !variant) throw new Error("Produto ou variante indisponível.");
  return { product, variant };
}

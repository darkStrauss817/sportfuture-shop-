export const FOOTWEAR_SIZES = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
] as const;
export const CLOTHING_SIZES = ["S", "M", "L", "XL", "XXL"] as const;

type VariantLike = {
  id: number;
  title?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  available?: boolean;
};

type ProductLike = {
  id?: number;
  title?: string;
  type?: string;
  tags?: string[];
  options?: Array<{ name?: string | null; values?: string[] }>;
  variants?: VariantLike[];
};

function haystackFor(product: ProductLike) {
  return [product.title, product.type, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isFootwearProduct(product: ProductLike) {
  return /\b(calçado|sapatilha?s?|chuteira?s?|chinelo?s?|sandália?s?|bota?s?|sapato?s?|mocassins?|footwear|shoes?|sneakers?|trainers?|boots?|cleats?|slides?|sandals?|loafers?)\b/.test(
    haystackFor(product)
  );
}

export function isClothingProduct(product: ProductLike) {
  return /\b(vestuário|sapatilhas?|t-shirts?|camisolas?|calças|calções|casacos|tops?|pólos?|fatos? de treino|roupa interior|camisas|blusões|coletes|fatos de banho|clothing|apparel)\b/.test(
    haystackFor(product)
  );
}

function sizeOptionValues(product: ProductLike) {
  const option = product.options?.find(item =>
    /^(tamanho|size)$/i.test(item.name?.trim() ?? "")
  );
  return option?.values?.map(value => value.trim()).filter(Boolean) ?? [];
}

function variantSizeValues(product: ProductLike) {
  const values = (product.variants ?? [])
    .flatMap(variant => [
      variant.option1,
      variant.option2,
      variant.option3,
      variant.title,
    ])
    .filter((value): value is string => Boolean(value))
    .flatMap(value => value.split("/").map(part => part.trim()))
    .filter(value => /^(?:\d+(?:\.\d+)?|XXL?|S|M|L)$/i.test(value));
  return Array.from(new Set(values));
}

export function sizesForProduct(product: ProductLike): string[] {
  if (isFootwearProduct(product)) return [...FOOTWEAR_SIZES];
  const optionValues = sizeOptionValues(product);
  if (optionValues.length) return optionValues;
  if (isClothingProduct(product)) return [...CLOTHING_SIZES];
  return [];
}

function hasExactSizeToken(variant: VariantLike, size: string) {
  const values = [
    variant.option1,
    variant.option2,
    variant.option3,
    variant.title,
  ]
    .filter(Boolean)
    .join(" ");
  const escaped = size.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^0-9.])${escaped}(?:$|[^0-9.])`).test(values);
}

export function variantForSize<T extends VariantLike>(
  product: { variants: T[] },
  size: string
): T | undefined {
  return product.variants.find(
    variant => variant.available !== false && hasExactSizeToken(variant, size)
  );
}

/**
 * Garante que qualquer artigo com tamanhos tem uma variante seleccionável para cada opção
 * apresentada. Variantes reais disponíveis são preservadas; opções ausentes ou esgotadas
 * recebem uma variante de catálogo disponível para evitar bloqueios falsos no checkout.
 */
export function ensureFootwearVariants<T extends VariantLike>(
  product: { id: number; variants: T[] } & ProductLike
): T[] {
  if (!product.variants.length) return product.variants;
  const sizes = sizesForProduct(product);
  if (!sizes.length) return product.variants;
  const base =
    product.variants.find(variant => variant.available !== false) ??
    product.variants[0];
  const next = [...product.variants];
  for (let index = 0; index < sizes.length; index += 1) {
    const size = sizes[index];
    if (variantForSize({ variants: next }, size)) continue;
    const colour =
      [base.option1, base.option2, base.option3].find(
        value => value && !/^(?:\d+(?:\.\d+)?|XXL?|S|M|L)$/i.test(value)
      ) ?? undefined;
    const syntheticId = product.id * 100 + index + 1;
    next.push({
      ...base,
      id: syntheticId,
      title: colour ? `${colour} / ${size}` : size,
      option1: colour ?? size,
      option2: colour ? size : null,
      option3: null,
      available: true,
    } as T);
  }
  return next;
}

export function availableSizesForProduct(product: ProductLike) {
  const sizes = sizesForProduct(product);
  if (!sizes.length || !product.variants?.length) return [];
  return sizes.filter(size =>
    Boolean(
      variantForSize(product as ProductLike & { variants: VariantLike[] }, size)
    )
  );
}

export function sizeFromVariant<T extends VariantLike>(
  product: { variants: T[] } & ProductLike,
  variant?: T
) {
  if (!variant) return undefined;
  return sizesForProduct(product).find(value =>
    hasExactSizeToken(variant, value)
  );
}

export function isValidSizeSelection(
  product: ProductLike,
  variant: VariantLike,
  size?: string
) {
  const sizes = sizesForProduct(product);
  if (!sizes.length) return true;
  if (!size || !product.variants?.length) return false;
  const matchingVariant = variantForSize(
    product as ProductLike & { variants: VariantLike[] },
    size
  );
  return Boolean(matchingVariant && matchingVariant.id === variant.id);
}

export { variantSizeValues };

/* Keep this module's public surface focused on the catalogue helpers above. */
void variantSizeValues;

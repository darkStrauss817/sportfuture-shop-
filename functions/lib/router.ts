import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { isValidSizeSelection } from "../../shared/productSizes";
import { attachCoupon, createOrderItems, createPendingOrder, hasPaidOrder, releaseCoupon, reserveCoupon } from "./db";
import type { StoreEnv } from "./db";
import { calculatePriceCents, getProductSnapshot, listProducts, normalizeEmail } from "./catalog";
import { createCheckoutSession } from "./stripe";

export type CloudflareContext = { env: StoreEnv; req: Request };
const t = initTRPC.context<CloudflareContext>().create({ transformer: superjson });
const publicProcedure = t.procedure;
const router = t.router;

const cartItem = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  size: z.string().max(8).optional(),
});

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ ok: true })),
  }),
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  catalog: router({
    list: publicProcedure
      .input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(12).max(48).default(24), query: z.string().optional(), tag: z.string().optional(), vendor: z.string().optional() }))
      .query(({ ctx, input }) => listProducts(ctx.env, ctx.req, input)),
    product: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getProduct } = await import("./catalog");
        return await getProduct(ctx.env, ctx.req, input.id) ?? null;
      }),
  }),
  checkout: router({
    createSession: publicProcedure
      .input(z.object({ email: z.string().email(), items: z.array(cartItem).min(1).max(50), couponCode: z.string().trim().toUpperCase().optional() }))
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        const subtotalCents = await calculatePriceCents(ctx.env, ctx.req, input.items);
        const wantsCoupon = input.couponCode === "SF10";
        const eligible = wantsCoupon && !(await hasPaidOrder(ctx.env, email));
        const reserved = eligible ? await reserveCoupon(ctx.env, email) : false;
        const couponApplied = eligible && reserved;
        const discountedSubtotalCents = couponApplied ? Math.round(subtotalCents * 0.9) : subtotalCents;
        const shippingCents = 499;
        const totalCents = discountedSubtotalCents + shippingCents;
        try {
          const validated = await Promise.all(input.items.map(async item => {
            const { product, variant } = await getProductSnapshot(ctx.env, ctx.req, item.productId, item.variantId);
            if (!isValidSizeSelection(product, variant, item.size)) {
              throw new TRPCError({ code: "BAD_REQUEST", message: item.size ? `O tamanho ${item.size} não corresponde à variante disponível de ${product.title}.` : `Seleciona um tamanho para ${product.title}.` });
            }
            return {
              item,
              product,
              variant,
              unitAmountCents: Math.round(Number(variant.price) * 100 * (couponApplied ? 0.9 : 1)),
            };
          }));
          const origin = new URL(ctx.req.url).origin;
          const session = await createCheckoutSession(ctx.env, {
            email,
            origin,
            couponApplied,
            subtotalCents: discountedSubtotalCents,
            shippingCents,
            lines: validated.map(({ item, product, variant, unitAmountCents }) => ({
              name: `${product.title} · ${variant.title}${item.size ? ` · Tamanho ${item.size}` : ""}`,
              image: product.images.slice(0, 1)[0],
              unitAmountCents,
              quantity: item.quantity,
            })),
          });
          const orderId = await createPendingOrder(ctx.env, { email, stripeCheckoutSessionId: session.id, subtotalCents: discountedSubtotalCents, shippingCents, totalCents });
          if (couponApplied) await attachCoupon(ctx.env, email, orderId);
          await createOrderItems(ctx.env, orderId, validated.map(({ item, product, variant, unitAmountCents }) => ({ productId: item.productId, variantId: item.variantId, productTitle: product.title, variantTitle: variant.title, size: item.size, quantity: item.quantity, unitAmountCents })));
          return { url: session.url, totalCents, couponApplied };
        } catch (error) {
          if (reserved) await releaseCoupon(ctx.env, email);
          if (error instanceof TRPCError) throw error;
          console.error("[Checkout] Failed to create session", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Não foi possível iniciar o pagamento." });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

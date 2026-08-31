import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { attachCoupon, createOrderItems, createPendingOrder, hasPaidOrder, releaseCoupon, reserveCoupon } from "./db";
import { calculatePriceCents, getProduct, getProductSnapshot, listProducts, normalizeEmail } from "./catalog";
import { EUROPEAN_COUNTRIES, getStripeClient } from "./stripe";
import { isValidSizeSelection } from "@shared/productSizes";

const cartItem = z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive(), quantity: z.number().int().min(1).max(20), size: z.string().max(8).optional() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  catalog: router({
    list: publicProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(12).max(48).default(24), query: z.string().optional(), tag: z.string().optional(), vendor: z.string().optional() })).query(({ input }) => listProducts(input)),
    product: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getProduct(input.id) ?? null),
  }),
  checkout: router({
    createSession: publicProcedure.input(z.object({ email: z.string().email(), items: z.array(cartItem).min(1).max(50), couponCode: z.string().trim().toUpperCase().optional() })).mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      const subtotalCents = calculatePriceCents(input.items);
      const wantsCoupon = input.couponCode === "SF10";
      const eligible = wantsCoupon && !(await hasPaidOrder(email));
      const reserved = eligible ? await reserveCoupon(email) : false;
      const couponApplied = eligible && reserved;
      const discountedSubtotalCents = couponApplied ? Math.round(subtotalCents * 0.9) : subtotalCents;
      const shippingCents = 499;
      const totalCents = discountedSubtotalCents + shippingCents;
      const stripe = getStripeClient();
      const origin = ctx.req.headers.origin || "http://localhost";
      const validated = input.items.map(item => { const { product, variant } = getProductSnapshot(item.productId, item.variantId); if (!isValidSizeSelection(product, variant, item.size)) throw new TRPCError({ code: "BAD_REQUEST", message: item.size ? `O tamanho ${item.size} não corresponde à variante disponível de ${product.title}.` : `Seleciona um tamanho para ${product.title}.` }); const unitAmountCents = Math.round(Number(variant.price) * 100 * (couponApplied ? 0.9 : 1)); return { item, product, variant, unitAmountCents }; });
      try {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: email,
          client_reference_id: ctx.user?.id ? String(ctx.user.id) : undefined,
          line_items: validated.map(({ item, product, variant, unitAmountCents }) => ({ price_data: { currency: "eur", product_data: { name: `${product.title} · ${variant.title}${item.size ? ` · Tamanho ${item.size}` : ""}`, images: product.images.slice(0, 1) }, unit_amount: unitAmountCents }, quantity: item.quantity })),
          shipping_address_collection: { allowed_countries: EUROPEAN_COUNTRIES as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] },
          shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: shippingCents, currency: "eur" }, display_name: "Entrega Europa" } }],
          metadata: { customer_email: email, customer_name: ctx.user?.name || "", coupon_code: couponApplied ? "SF10" : "", subtotal_cents: String(discountedSubtotalCents), shipping_cents: String(shippingCents) },
          success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/checkout/cancelled`,
        });
        const orderId = await createPendingOrder({ email, userId: ctx.user?.id, stripeCheckoutSessionId: session.id, subtotalCents: discountedSubtotalCents, shippingCents, totalCents });
        if (couponApplied) await attachCoupon(email, orderId ?? 0);
        if (orderId) await createOrderItems(orderId, validated.map(({ item, product, variant, unitAmountCents }) => ({ productId: item.productId, variantId: item.variantId, productTitle: product.title, variantTitle: variant.title, size: item.size, quantity: item.quantity, unitAmountCents })));
        return { url: session.url, totalCents, couponApplied };
      } catch (error) {
        if (reserved) await releaseCoupon(email);
        throw error;
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;

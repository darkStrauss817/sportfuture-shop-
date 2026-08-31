import type { D1Database, Fetcher } from "@cloudflare/workers-types";

export interface StoreEnv {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  ASSETS: Fetcher;
}

export async function hasPaidOrder(env: StoreEnv, email: string) {
  const row = await env.DB.prepare("SELECT id FROM orders WHERE email = ?1 AND status = 'paid' LIMIT 1").bind(email).first<{ id: number }>();
  return Boolean(row);
}

export async function reserveCoupon(env: StoreEnv, email: string) {
  try {
    await env.DB.prepare("INSERT INTO coupon_claims (code, email, order_id, status) VALUES ('SF10', ?1, 0, 'reserved')").bind(email).run();
    return true;
  } catch {
    return false;
  }
}

export async function attachCoupon(env: StoreEnv, email: string, orderId: number) {
  await env.DB.prepare("UPDATE coupon_claims SET order_id = ?1 WHERE email = ?2 AND code = 'SF10' AND order_id = 0 AND status = 'reserved'").bind(orderId, email).run();
}

export async function releaseCoupon(env: StoreEnv, email: string) {
  await env.DB.prepare("DELETE FROM coupon_claims WHERE email = ?1 AND code = 'SF10' AND order_id = 0 AND status = 'reserved'").bind(email).run();
}

export async function createPendingOrder(env: StoreEnv, input: {
  email: string;
  stripeCheckoutSessionId: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}) {
  const result = await env.DB.prepare("INSERT INTO orders (email, stripe_checkout_session_id, status, subtotal_cents, shipping_cents, total_cents, currency) VALUES (?1, ?2, 'pending', ?3, ?4, ?5, 'eur')")
    .bind(input.email, input.stripeCheckoutSessionId, input.subtotalCents, input.shippingCents, input.totalCents)
    .run();
  return Number(result.meta.last_row_id);
}

export async function createOrderItems(env: StoreEnv, orderId: number, items: Array<{ productId: number; variantId: number; productTitle: string; variantTitle: string; size?: string; quantity: number; unitAmountCents: number }>) {
  if (!items.length) return;
  const statements = items.map(item => env.DB.prepare("INSERT INTO order_items (order_id, product_id, variant_id, product_title, variant_title, size, quantity, unit_amount_cents) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8")
    .bind(orderId, item.productId, item.variantId, item.productTitle, item.variantTitle, item.size ?? null, item.quantity, item.unitAmountCents));
  await env.DB.batch(statements);
}

export async function markOrderPaid(env: StoreEnv, input: { sessionId: string; paymentIntentId?: string; email: string; couponCode?: string }) {
  const order = await env.DB.prepare("SELECT id FROM orders WHERE stripe_checkout_session_id = ?1 LIMIT 1").bind(input.sessionId).first<{ id: number }>();
  if (!order) return;
  await env.DB.prepare("UPDATE orders SET status = 'paid', stripe_payment_intent_id = ?1, paid_at = CURRENT_TIMESTAMP WHERE id = ?2").bind(input.paymentIntentId ?? null, order.id).run();
  if (input.couponCode === "SF10") {
    try {
      await env.DB.batch([
        env.DB.prepare("UPDATE coupon_claims SET status = 'redeemed', redeemed_at = CURRENT_TIMESTAMP WHERE order_id = ?1 AND code = 'SF10' AND status = 'reserved'").bind(order.id),
        env.DB.prepare("INSERT INTO coupon_redemptions (code, email, order_id) VALUES ('SF10', ?1, ?2)").bind(input.email, order.id),
      ]);
    } catch {
      console.warn("[Coupon] SF10 already redeemed or could not be recorded");
    }
  }
}

export async function markOrderCancelled(env: StoreEnv, sessionId: string) {
  const order = await env.DB.prepare("SELECT id FROM orders WHERE stripe_checkout_session_id = ?1 LIMIT 1").bind(sessionId).first<{ id: number }>();
  await env.DB.prepare("UPDATE orders SET status = 'cancelled' WHERE stripe_checkout_session_id = ?1").bind(sessionId).run();
  if (order) await env.DB.prepare("DELETE FROM coupon_claims WHERE order_id = ?1 AND status = 'reserved'").bind(order.id).run();
}

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, couponClaims, couponRedemptions, orderItems, orders, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Order and coupon helpers used by the Stripe checkout flow.
export async function hasPaidOrder(email: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.email, email), eq(orders.status, "paid"))).limit(1);
  return result.length > 0;
}

export async function reserveCoupon(email: string, orderId = 0) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.insert(couponClaims).values({ code: "SF10", email, orderId, status: "reserved" });
    return true;
  } catch {
    return false;
  }
}

export async function attachCoupon(email: string, orderId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(couponClaims).set({ orderId }).where(and(eq(couponClaims.email, email), eq(couponClaims.code, "SF10"), eq(couponClaims.orderId, 0), eq(couponClaims.status, "reserved")));
}

export async function releaseCoupon(email: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(couponClaims).where(and(eq(couponClaims.email, email), eq(couponClaims.code, "SF10"), eq(couponClaims.orderId, 0), eq(couponClaims.status, "reserved")));
}

export async function createOrderItems(orderId: number, items: Array<{ productId: number; variantId: number; productTitle: string; variantTitle: string; size?: string; quantity: number; unitAmountCents: number }>) {
  const db = await getDb();
  if (!db || !items.length) return;
  await db.insert(orderItems).values(items.map(item => ({ ...item, orderId })));
}

export async function createPendingOrder(input: {
  email: string;
  userId?: number;
  stripeCheckoutSessionId: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(orders).values({
    email: input.email,
    userId: input.userId,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    status: "pending",
    subtotalCents: input.subtotalCents,
    shippingCents: input.shippingCents,
    totalCents: input.totalCents,
    currency: "eur",
  });
  return Number(result[0].insertId);
}

export async function markOrderPaid(input: { sessionId: string; paymentIntentId?: string; email: string; couponCode?: string }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(orders).where(eq(orders.stripeCheckoutSessionId, input.sessionId)).limit(1);
  const order = existing[0];
  if (!order) return;
  await db.update(orders).set({
    status: "paid",
    stripePaymentIntentId: input.paymentIntentId,
    paidAt: new Date(),
  }).where(eq(orders.id, order.id));
  if (input.couponCode === "SF10") {
    try {
      await db.update(couponClaims).set({ status: "redeemed", redeemedAt: new Date() })
        .where(and(eq(couponClaims.orderId, order.id), eq(couponClaims.code, "SF10"), eq(couponClaims.status, "reserved")));
      await db.insert(couponRedemptions).values({ code: "SF10", email: input.email, orderId: order.id });
    } catch (error) {
      console.warn("[Coupon] SF10 already redeemed or could not be recorded", error);
    }
  }
}

export async function markOrderCancelled(sessionId: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: orders.id }).from(orders).where(eq(orders.stripeCheckoutSessionId, sessionId)).limit(1);
  const order = existing[0];
  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.stripeCheckoutSessionId, sessionId));
  if (order) await db.delete(couponClaims).where(and(eq(couponClaims.orderId, order.id), eq(couponClaims.status, "reserved")));
}

// TODO: add feature queries here as your schema grows.

import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  userId: int("userId"),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  status: mysqlEnum("status", ["pending", "paid", "cancelled"]).default("pending").notNull(),
  subtotalCents: int("subtotalCents").notNull(),
  shippingCents: int("shippingCents").notNull(),
  totalCents: int("totalCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("eur").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  variantId: bigint("variantId", { mode: "number", unsigned: true }).notNull(),
  productTitle: text("productTitle").notNull(),
  variantTitle: varchar("variantTitle", { length: 255 }).notNull(),
  size: varchar("size", { length: 8 }),
  quantity: int("quantity").notNull(),
  unitAmountCents: int("unitAmountCents").notNull(),
});

export const couponClaims = mysqlTable("couponClaims", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  orderId: int("orderId").notNull(),
  status: mysqlEnum("status", ["reserved", "redeemed"]).default("reserved").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  redeemedAt: timestamp("redeemedAt"),
}, (table) => ({
  emailCodeUnique: uniqueIndex("coupon_claim_email_code_unique").on(table.email, table.code),
}));

export const couponRedemptions = mysqlTable("couponRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  orderId: int("orderId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  emailCodeUnique: uniqueIndex("coupon_email_code_unique").on(table.email, table.code),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type CouponClaim = typeof couponClaims.$inferSelect;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;

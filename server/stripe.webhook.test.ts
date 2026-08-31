import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const mocks = vi.hoisted(() => ({
  markOrderPaid: vi.fn(),
  markOrderCancelled: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { processStripeEvent } from "./stripe";

describe("Stripe webhook processing", () => {
  it("returns verification response for Stripe test events", async () => {
    const result = await processStripeEvent({ id: "evt_test_checkout", type: "payment_intent.succeeded" } as Stripe.Event);
    expect(result).toEqual({ verified: true });
  });

  it("marks a completed checkout as paid and normalizes the email", async () => {
    const event = {
      id: "evt_live_checkout",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_paid", customer_email: " BUYER@EXAMPLE.COM ", payment_intent: "pi_test_123", metadata: { coupon_code: "SF10" } } },
    } as unknown as Stripe.Event;
    await processStripeEvent(event);
    expect(mocks.markOrderPaid).toHaveBeenCalledWith({ sessionId: "cs_test_paid", paymentIntentId: "pi_test_123", email: "buyer@example.com", couponCode: "SF10" });
  });

  it("cancels an expired checkout", async () => {
    const event = { id: "evt_live_expired", type: "checkout.session.expired", data: { object: { id: "cs_test_expired" } } } as unknown as Stripe.Event;
    await processStripeEvent(event);
    expect(mocks.markOrderCancelled).toHaveBeenCalledWith("cs_test_expired");
  });

  it("registers the raw webhook before the global JSON parser", () => {
    const source = readFileSync(join(process.cwd(), "server", "_core", "index.ts"), "utf8");
    expect(source.indexOf("registerStripeWebhook(app)")).toBeGreaterThanOrEqual(0);
    expect(source.indexOf("registerStripeWebhook(app)")).toBeLessThan(source.indexOf("app.use(express.json"));
  });
});

import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  hasPaidOrder: vi.fn(async () => false),
  reserveCoupon: vi.fn(async () => false),
  releaseCoupon: vi.fn(async () => undefined),
  attachCoupon: vi.fn(async () => undefined),
  createPendingOrder: vi.fn(async () => 321),
  createOrderItems: vi.fn(async () => undefined),
}));

vi.mock("./stripe", () => ({
  EUROPEAN_COUNTRIES: ["PT", "DE"],
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.createSession } } }),
}));

vi.mock("./db", () => ({
  hasPaidOrder: mocks.hasPaidOrder,
  reserveCoupon: mocks.reserveCoupon,
  releaseCoupon: mocks.releaseCoupon,
  attachCoupon: mocks.attachCoupon,
  createPendingOrder: mocks.createPendingOrder,
  createOrderItems: mocks.createOrderItems,
}));

import { appRouter } from "./routers";
import { getProduct } from "./catalog";
import { variantForSize } from "@shared/productSizes";

function context(): TrpcContext {
  return {
    user: undefined,
    req: { headers: { origin: "https://sportfuture.test" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("checkout.createSession com tamanhos normalizados", () => {
  it("aceita o tamanho 35 e cria line item/encomenda com o total server-side", async () => {
    mocks.createSession.mockResolvedValue({ id: "cs_test_normalized_size", url: "https://checkout.stripe.com/test" });
    const product = getProduct(11199675269462);
    expect(product).toBeTruthy();
    if (!product) return;
    const variant35 = variantForSize(product, "35");
    expect(variant35).toBeTruthy();
    if (!variant35) return;

    const result = await appRouter.createCaller(context()).checkout.createSession({
      email: "cliente@exemplo.pt",
      items: [{ productId: product.id, variantId: variant35.id, quantity: 1, size: "35" }],
    });

    expect(result).toMatchObject({ totalCents: Math.round(Number(variant35.price) * 100) + 499, couponApplied: false });
    expect(mocks.createSession).toHaveBeenCalledOnce();
    expect(mocks.createSession.mock.calls[0]?.[0].line_items[0].price_data.product_data.name).toContain("Tamanho 35");
    expect(mocks.createPendingOrder).toHaveBeenCalledWith(expect.objectContaining({ totalCents: result.totalCents }));
    expect(mocks.createOrderItems).toHaveBeenCalledWith(321, [expect.objectContaining({ variantId: variant35.id, size: "35", unitAmountCents: Math.round(Number(variant35.price) * 100) })]);
  });
});

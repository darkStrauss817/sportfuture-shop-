import { markOrderCancelled, markOrderPaid } from "./db";
import type { StoreEnv } from "./db";

export const EUROPEAN_COUNTRIES = [
  "PT", "ES", "FR", "DE", "IT", "NL", "BE", "LU", "IE", "AT", "SE", "DK", "FI", "EE", "LV", "LT", "PL", "CZ", "SK", "SI", "HR", "HU", "RO", "BG", "GR", "CY", "MT", "CH", "NO", "IS", "LI", "GB",
] as const;

type CheckoutLine = {
  name: string;
  image?: string;
  unitAmountCents: number;
  quantity: number;
};

function append(form: URLSearchParams, key: string, value: string | number) {
  form.set(key, String(value));
}

export async function createCheckoutSession(env: StoreEnv, input: {
  email: string;
  origin: string;
  lines: CheckoutLine[];
  couponApplied: boolean;
  subtotalCents: number;
  shippingCents: number;
  customerName?: string;
}) {
  const form = new URLSearchParams();
  append(form, "mode", "payment");
  append(form, "customer_email", input.email);
  append(form, "success_url", `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  append(form, "cancel_url", `${input.origin}/checkout/cancelled`);
  input.lines.forEach((line, index) => {
    append(form, `line_items[${index}][price_data][currency]`, "eur");
    append(form, `line_items[${index}][price_data][product_data][name]`, line.name);
    append(form, `line_items[${index}][price_data][unit_amount]`, line.unitAmountCents);
    append(form, `line_items[${index}][quantity]`, line.quantity);
    if (line.image) append(form, `line_items[${index}][price_data][product_data][images][0]`, line.image);
  });
  EUROPEAN_COUNTRIES.forEach((country, index) => append(form, `shipping_address_collection[allowed_countries][${index}]`, country));
  append(form, "shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  append(form, "shipping_options[0][shipping_rate_data][fixed_amount][amount]", input.shippingCents);
  append(form, "shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");
  append(form, "shipping_options[0][shipping_rate_data][display_name]", "Entrega Europa");
  append(form, "metadata[customer_email]", input.email);
  append(form, "metadata[customer_name]", input.customerName ?? "");
  append(form, "metadata[coupon_code]", input.couponApplied ? "SF10" : "");
  append(form, "metadata[subtotal_cents]", input.subtotalCents);
  append(form, "metadata[shipping_cents]", input.shippingCents);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const payload = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !payload.id || !payload.url) throw new Error(payload.error?.message || "Não foi possível iniciar o pagamento Stripe.");
  return { id: payload.id, url: payload.url };
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(payload: string, signature: string, secret: string) {
  const parts = signature.split(",");
  const timestamp = parts.find(part => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter(part => part.startsWith("v1=")).map(part => part.slice(3));
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return signatures.some(value => value === digest);
}

export async function processWebhook(env: StoreEnv, request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!signature || !env.STRIPE_WEBHOOK_SECRET || !(await verifySignature(payload, signature, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response(JSON.stringify({ error: "Webhook inválido." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const event = JSON.parse(payload) as { type: string; data?: { object?: Record<string, unknown> } };
  const session = event.data?.object ?? {};
  if (event.type === "checkout.session.completed") {
    const metadata = (session.metadata ?? {}) as Record<string, string>;
    const email = String(session.customer_details && typeof session.customer_details === "object" && "email" in session.customer_details ? (session.customer_details as { email?: string }).email : session.customer_email || metadata.customer_email || "");
    await markOrderPaid(env, {
      sessionId: String(session.id || ""),
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      email: email.trim().toLowerCase(),
      couponCode: metadata.coupon_code,
    });
  }
  if (event.type === "checkout.session.expired") await markOrderCancelled(env, String(session.id || ""));
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
}

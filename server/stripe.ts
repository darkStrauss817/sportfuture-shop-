import Stripe from "stripe";
import express, { type Express, type Request, type Response } from "express";
import { markOrderCancelled, markOrderPaid } from "./db";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const EUROPEAN_COUNTRIES = [
  "PT",
  "ES",
  "FR",
  "DE",
  "IT",
  "NL",
  "BE",
  "LU",
  "IE",
  "AT",
  "SE",
  "DK",
  "FI",
  "EE",
  "LV",
  "LT",
  "PL",
  "CZ",
  "SK",
  "SI",
  "HR",
  "HU",
  "RO",
  "BG",
  "GR",
  "CY",
  "MT",
  "CH",
  "NO",
  "IS",
  "LI",
  "GB",
];

export async function processStripeEvent(event: Stripe.Event) {
  if (event.id.startsWith("evt_test_")) {
    console.log(
      "[Webhook] Test event detected, returning verification response"
    );
    return { verified: true } as const;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email =
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.customer_email;
    if (email)
      await markOrderPaid({
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : undefined,
        email: email.trim().toLowerCase(),
        couponCode: session.metadata?.coupon_code,
      });
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await markOrderCancelled(session.id);
  }
  return { received: true } as const;
}

export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"];
      if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res
          .status(400)
          .json({ error: "Stripe webhook não configurado." });
      }
      try {
        if (!stripe)
          return res
            .status(400)
            .json({ error: "Stripe não está configurado no servidor." });
        const event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        return res.json(await processStripeEvent(event));
      } catch (error) {
        console.error("[Webhook] Signature or processing error", error);
        return res.status(400).json({ error: "Webhook inválido." });
      }
    }
  );
}

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("Stripe não está configurado no servidor.");
  if (!stripe) throw new Error("Stripe não está configurado no servidor.");
  return stripe;
}

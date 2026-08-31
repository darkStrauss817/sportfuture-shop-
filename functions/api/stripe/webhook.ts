import { processWebhook } from "../../lib/stripe";
import type { StoreEnv } from "../../lib/db";

export const onRequestPost = (context: { request: Request; env: StoreEnv }) => processWebhook(context.env, context.request);

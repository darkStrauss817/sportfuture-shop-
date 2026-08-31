import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../lib/router";
import type { StoreEnv } from "../../lib/db";

export const onRequest = (context: { request: Request; env: StoreEnv }) => fetchRequestHandler({
  endpoint: "/api/trpc",
  req: context.request,
  router: appRouter,
  createContext: () => ({ env: context.env, req: context.request }),
});

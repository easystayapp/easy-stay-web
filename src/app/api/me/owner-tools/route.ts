import type { OwnerToolsRequest } from "@/types/api";
import { readJson, requireAuth, route } from "@/lib/server/http";
import { disableOwnerTools, enableOwnerTools } from "@/lib/server/services/users";

/** Turns owner tools on with the contact number seekers should call. */
export const POST = route(async (ctx) =>
  enableOwnerTools(ctx.repos, requireAuth(ctx), await readJson<OwnerToolsRequest>(ctx.req)),
);

export const DELETE = route(async (ctx) => disableOwnerTools(ctx.repos, requireAuth(ctx)));

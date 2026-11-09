import { requireAuth, route } from "@/lib/server/http";
import { disableOwnerTools, enableOwnerTools } from "@/lib/server/services/users";

/** Turns owner tools on. Requires a verified phone number on the ID token. */
export const POST = route(async (ctx) => enableOwnerTools(ctx.repos, requireAuth(ctx)));

export const DELETE = route(async (ctx) => disableOwnerTools(ctx.repos, requireAuth(ctx)));

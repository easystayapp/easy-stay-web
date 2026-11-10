import { readJson, requireAuth, route } from "@/lib/server/http";
import { moderateListing } from "@/lib/server/services/ops/verification";

/** Body: { hide: boolean, reason } */
export const POST = route<{ id: string }>(async (ctx, { id }) => moderateListing(ctx.repos, requireAuth(ctx), id, await readJson(ctx.req)));

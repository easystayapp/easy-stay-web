import { readJson, requireAuth, route } from "@/lib/server/http";
import { getConsents, setConsents } from "@/lib/server/services/ops/privacy";

export const GET = route(async (ctx) => getConsents(ctx.repos, requireAuth(ctx)));
export const PUT = route(async (ctx) => setConsents(ctx.repos, requireAuth(ctx), await readJson(ctx.req)));

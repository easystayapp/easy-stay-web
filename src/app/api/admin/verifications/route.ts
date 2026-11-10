import { readJson, requireAuth, route } from "@/lib/server/http";
import { reviewQueue } from "@/lib/server/services/ops/verification";

const q = (ctx: { req: Request }) => new URL(ctx.req.url).searchParams;

export const GET = route(async (ctx) => reviewQueue(ctx.repos, requireAuth(ctx), { kind: q(ctx).get("kind"), after: q(ctx).get("after") }));

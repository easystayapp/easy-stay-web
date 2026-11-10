import { readJson, requireAuth, route } from "@/lib/server/http";
import { listAudit } from "@/lib/server/services/ops/cases";

const q = (ctx: { req: Request }) => new URL(ctx.req.url).searchParams;

export const GET = route(async (ctx) => listAudit(ctx.repos, requireAuth(ctx), { targetId: q(ctx).get("targetId") ?? undefined, after: q(ctx).get("after") }));

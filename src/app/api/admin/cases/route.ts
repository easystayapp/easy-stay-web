import { readJson, requireAuth, route } from "@/lib/server/http";
import { listCases, startTakedown } from "@/lib/server/services/ops/cases";

const q = (ctx: { req: Request }) => new URL(ctx.req.url).searchParams;

/** ?status=open|acknowledged|resolved|rejected&kind=&overdue=1&after= */
export const GET = route(async (ctx) =>
  listCases(ctx.repos, requireAuth(ctx), { status: q(ctx).get("status") ?? undefined, kind: q(ctx).get("kind") ?? undefined, overdue: q(ctx).get("overdue"), after: q(ctx).get("after") }),
);

/** Starts a 36-hour takedown. Body: { propertyId, reason?, details? } */
export const POST = route(async (ctx) => startTakedown(ctx.repos, requireAuth(ctx), await readJson(ctx.req)));

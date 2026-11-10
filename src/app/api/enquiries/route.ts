import { readJson, requireAuth, route } from "@/lib/server/http";
import { listInbox, sendEnquiry } from "@/lib/server/services/ops/enquiries";

const q = (ctx: { req: Request }) => new URL(ctx.req.url).searchParams;

/** Body: { propertyId, message?, visitAt? (epoch ms) }. Idempotent per (property, seeker). */
export const POST = route(async (ctx) => sendEnquiry(ctx.repos, requireAuth(ctx), await readJson(ctx.req)));

/** ?as=owner|seeker&status=&after=<lastMessageAt cursor> */
export const GET = route(async (ctx) =>
  listInbox(ctx.repos, requireAuth(ctx), { as: q(ctx).get("as"), status: q(ctx).get("status") ?? undefined, after: q(ctx).get("after") }),
);

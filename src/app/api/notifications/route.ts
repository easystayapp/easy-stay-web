import { readJson, requireAuth, route } from "@/lib/server/http";
import { listMyNotifications, markNotificationsRead } from "@/lib/server/services/ops/privacy";

const q = (ctx: { req: Request }) => new URL(ctx.req.url).searchParams;

export const GET = route(async (ctx) => listMyNotifications(ctx.repos, requireAuth(ctx), q(ctx).get("after")));

/** Body: { ids: string[] } */
export const POST = route(async (ctx) => {
  const body = await readJson<{ ids?: unknown }>(ctx.req);
  return markNotificationsRead(ctx.repos, requireAuth(ctx), body.ids);
});

import { readJson, requireAuth, route } from "@/lib/server/http";
import { deleteProperty, getPropertyDetail, updateProperty } from "@/lib/server/services/properties";

type P = { id: string };

export const GET = route<P>(async (ctx, { id }) => getPropertyDetail(ctx.repos, id, ctx.auth));

/** Body: { input: PropertyInput } */
export const PATCH = route<P>(async (ctx, { id }) => {
  const body = await readJson<{ input?: unknown }>(ctx.req);
  return updateProperty(ctx.repos, requireAuth(ctx), id, body.input);
});

export const DELETE = route<P>(async (ctx, { id }) => deleteProperty(ctx.repos, requireAuth(ctx), id));

import { readJson, route } from "@/lib/server/http";
import { recordView } from "@/lib/server/services/properties";

/** Body: { deviceId } — used for anonymous viewers. */
export const POST = route<{ id: string }>(async (ctx, { id }) => {
  const body = await readJson<{ deviceId?: unknown }>(ctx.req);
  return recordView(ctx.repos, id, ctx.auth, body.deviceId);
});

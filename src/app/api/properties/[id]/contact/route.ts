import { readJson, requireAuth, route } from "@/lib/server/http";
import { contactOwner } from "@/lib/server/services/engagement";

/** Body: { channel: "call" | "whatsapp" }. Returns the owner's number. */
export const POST = route<{ id: string }>(async (ctx, { id }) => {
  const body = await readJson<{ channel?: unknown }>(ctx.req);
  return contactOwner(ctx.repos, requireAuth(ctx), id, body.channel);
});

import { readJson, requireAuth, route } from "@/lib/server/http";
import { listMessages, postMessage } from "@/lib/server/services/ops/enquiries";

const q = (ctx: { req: Request }) => new URL(ctx.req.url).searchParams;

export const GET = route<{ id: string }>(async (ctx, { id }) => listMessages(ctx.repos, requireAuth(ctx), id, q(ctx).get("before")));

/** Body: { text } */
export const POST = route<{ id: string }>(async (ctx, { id }) => {
  const body = await readJson<{ text?: unknown }>(ctx.req);
  return postMessage(ctx.repos, requireAuth(ctx), id, body.text);
});

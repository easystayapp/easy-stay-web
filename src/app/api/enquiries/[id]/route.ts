import { readJson, requireAuth, route } from "@/lib/server/http";
import { act, getThread } from "@/lib/server/services/ops/enquiries";

export const GET = route<{ id: string }>(async (ctx, { id }) => getThread(ctx.repos, requireAuth(ctx), id));

/** Body: { action: accept|decline|close|reschedule|propose, visitAt?, note? } */
export const POST = route<{ id: string }>(async (ctx, { id }) => act(ctx.repos, requireAuth(ctx), id, await readJson(ctx.req)));

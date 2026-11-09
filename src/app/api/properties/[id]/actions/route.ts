import type { ListingActionRequest } from "@/types/api";
import { readJson, requireAuth, route } from "@/lib/server/http";
import { applyAction } from "@/lib/server/services/properties";

/** Body: { action: "publish" | "pause" | "resume" | "mark_rented" | "repost" | "confirm_available" } */
export const POST = route<{ id: string }>(async (ctx, { id }) => {
  const body = await readJson<ListingActionRequest>(ctx.req);
  return applyAction(ctx.repos, requireAuth(ctx), id, body.action);
});

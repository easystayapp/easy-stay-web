import type { RatingInput } from "@/types/api";
import { readJson, requireAuth, route } from "@/lib/server/http";
import { listRatings, upsertRating } from "@/lib/server/services/engagement";

type P = { id: string };

export const GET = route<P>(async (ctx, { id }) => listRatings(ctx.repos, id));

/** Creates or edits the caller's single rating for this property. */
export const PUT = route<P>(async (ctx, { id }) =>
  upsertRating(ctx.repos, requireAuth(ctx), id, await readJson<RatingInput>(ctx.req)),
);

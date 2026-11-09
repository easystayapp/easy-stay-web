import { requireAuth, route } from "@/lib/server/http";
import { getMyRating } from "@/lib/server/services/engagement";

export const GET = route<{ id: string }>(async (ctx, { id }) => getMyRating(ctx.repos, requireAuth(ctx), id));

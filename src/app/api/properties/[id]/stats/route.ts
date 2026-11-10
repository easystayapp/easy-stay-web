import { requireAuth, route } from "@/lib/server/http";
import { getPropertyStats } from "@/lib/server/services/properties";

export const GET = route<{ id: string }>(async (ctx, { id }) => getPropertyStats(ctx.repos, requireAuth(ctx), id));

import { requireAuth, route } from "@/lib/server/http";
import { listMyRatings } from "@/lib/server/services/engagement";

export const GET = route(async (ctx) => ({ items: await listMyRatings(ctx.repos, requireAuth(ctx)) }));

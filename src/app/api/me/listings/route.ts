import { requireAuth, route } from "@/lib/server/http";
import { listOwnerListings } from "@/lib/server/services/properties";

export const GET = route(async (ctx) => listOwnerListings(ctx.repos, requireAuth(ctx)));

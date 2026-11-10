import { requireAuth, route } from "@/lib/server/http";
import { adminStats } from "@/lib/server/services/ops/cases";

export const GET = route(async (ctx) => adminStats(ctx.repos, requireAuth(ctx)));

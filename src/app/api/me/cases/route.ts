import { requireAuth, route } from "@/lib/server/http";
import { myCases } from "@/lib/server/services/ops/cases";

/** The caller's reports and grievances with their SLA status. */
export const GET = route(async (ctx) => myCases(ctx.repos, requireAuth(ctx)));

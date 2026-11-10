import { readJson, requireAuth, route } from "@/lib/server/http";
import { fileCase } from "@/lib/server/services/ops/cases";

/** Body: { kind?: report|grievance, targetType, targetId, reason, details? } */
export const POST = route(async (ctx) => fileCase(ctx.repos, requireAuth(ctx), await readJson(ctx.req)));

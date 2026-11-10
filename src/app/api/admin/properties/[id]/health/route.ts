import { readJson, requireAuth, route } from "@/lib/server/http";
import { setHealthScore } from "@/lib/server/services/ops/verification";

/** Body: { score: 0-100, publish: boolean, note? } */
export const PUT = route<{ id: string }>(async (ctx, { id }) => setHealthScore(ctx.repos, requireAuth(ctx), id, await readJson(ctx.req)));

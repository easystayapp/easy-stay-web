import { readJson, requireAuth, route } from "@/lib/server/http";
import { reviewVerification } from "@/lib/server/services/ops/verification";

/** Body: { decision: approve|reject, note?, expiresAt? } */
export const POST = route<{ id: string }>(async (ctx, { id }) => reviewVerification(ctx.repos, requireAuth(ctx), id, await readJson(ctx.req)));

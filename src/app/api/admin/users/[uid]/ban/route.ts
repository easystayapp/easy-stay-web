import { readJson, requireAuth, route } from "@/lib/server/http";
import { setBan } from "@/lib/server/services/ops/cases";

/** Body: { banned: boolean, reason } */
export const POST = route<{ uid: string }>(async (ctx, { uid }) => setBan(ctx.repos, requireAuth(ctx), uid, await readJson(ctx.req)));

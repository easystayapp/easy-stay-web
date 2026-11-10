import { readJson, requireAuth, route } from "@/lib/server/http";
import { deleteMyAccount } from "@/lib/server/services/ops/privacy";

/** Body: { confirm: "DELETE" } */
export const POST = route(async (ctx) => deleteMyAccount(ctx.repos, requireAuth(ctx), await readJson(ctx.req)));

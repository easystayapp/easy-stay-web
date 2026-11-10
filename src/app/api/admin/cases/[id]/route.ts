import { readJson, requireAuth, route } from "@/lib/server/http";
import { updateCase } from "@/lib/server/services/ops/cases";

/** Body: { action: acknowledge|resolve|reject, resolution?, hide? } */
export const POST = route<{ id: string }>(async (ctx, { id }) => updateCase(ctx.repos, requireAuth(ctx), id, await readJson(ctx.req)));

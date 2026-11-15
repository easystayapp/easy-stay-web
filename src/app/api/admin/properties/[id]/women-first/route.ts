import { readJson, requireAuth, route } from "@/lib/server/http";
import { setWomenFirst } from "@/lib/server/services/ops/verification";

/** Body: { femaleCaretaker, guard24x7, wellLitAccess: boolean, note? } */
export const PUT = route<{ id: string }>(async (ctx, { id }) => setWomenFirst(ctx.repos, requireAuth(ctx), id, await readJson(ctx.req)));

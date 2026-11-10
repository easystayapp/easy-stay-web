import { requireAuth, route } from "@/lib/server/http";
import { listSaved, listSavedIds } from "@/lib/server/services/engagement";

/** `?ids=1` returns only the saved property ids (for heart icons). */
export const GET = route(async (ctx) => {
  const auth = requireAuth(ctx);
  if (new URL(ctx.req.url).searchParams.get("ids")) return { ids: await listSavedIds(ctx.repos, auth) };
  return { items: await listSaved(ctx.repos, auth) };
});

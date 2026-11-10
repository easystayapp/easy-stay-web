import { requireAuth, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/services/ops/guard";

/** Confirms the caller is an admin (used by the console's login). */
export const GET = route(async (ctx) => {
  const auth = requireAuth(ctx);
  await requireAdmin(ctx.repos, auth);
  return { uid: auth.uid, email: auth.email, name: auth.name };
});

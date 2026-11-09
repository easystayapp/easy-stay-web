import { requireAuth, route } from "@/lib/server/http";
import { listNotifications } from "@/lib/server/services/properties";

export const GET = route(async (ctx) => ({ items: await listNotifications(ctx.repos, requireAuth(ctx)) }));

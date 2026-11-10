import { requireAuth, route } from "@/lib/server/http";
import { getEditableProperty } from "@/lib/server/services/properties";

export const GET = route<{ id: string }>(async (ctx, { id }) => getEditableProperty(ctx.repos, requireAuth(ctx), id));

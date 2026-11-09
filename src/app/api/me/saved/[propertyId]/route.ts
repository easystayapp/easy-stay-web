import { requireAuth, route } from "@/lib/server/http";
import { saveProperty, unsaveProperty } from "@/lib/server/services/engagement";

type P = { propertyId: string };

export const PUT = route<P>(async (ctx, { propertyId }) => saveProperty(ctx.repos, requireAuth(ctx), propertyId));

export const DELETE = route<P>(async (ctx, { propertyId }) => unsaveProperty(ctx.repos, requireAuth(ctx), propertyId));

import { requireAuth, route } from "@/lib/server/http";
import { adminListing } from "@/lib/server/services/ops/verification";

/** Listing summary + raw safety record for the admin console. */
export const GET = route<{ id: string }>(async (ctx, { id }) => adminListing(ctx.repos, requireAuth(ctx), id));

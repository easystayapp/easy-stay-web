import { route } from "@/lib/server/http";
import { getSafety } from "@/lib/server/services/ops/verification";

/** Public safety badge: health score (if published) and NOC states. */
export const GET = route<{ id: string }>(async (ctx, { id }) => ({ safety: await getSafety(ctx.repos, id) }));

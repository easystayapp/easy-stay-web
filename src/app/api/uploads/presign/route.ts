import { readJson, requireAuth, route } from "@/lib/server/http";
import { createUploadTicket } from "@/lib/server/services/media";

/**
 * Body: { contentType, size }. Returns a presigned PUT URL for Cloudflare R2
 * (`mode: "direct"`), or `mode: "server"` to fall back to POST /api/uploads.
 */
export const POST = route(async (ctx) =>
  createUploadTicket(ctx.repos, requireAuth(ctx), await readJson<{ contentType?: unknown; size?: unknown }>(ctx.req)),
);

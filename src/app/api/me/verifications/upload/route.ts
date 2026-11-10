import { readJson, requireAuth, route } from "@/lib/server/http";
import { createDocUploadTicket } from "@/lib/server/services/ops/verification";

/** Body: { contentType, size }. Returns a presigned PUT into the private bucket. */
export const POST = route(async (ctx) => createDocUploadTicket(ctx.repos, requireAuth(ctx), await readJson(ctx.req)));

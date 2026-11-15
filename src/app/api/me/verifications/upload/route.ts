import { DomainError } from "@/lib/domain/errors";
import { readJson, requireAuth, route } from "@/lib/server/http";
import { createDocUploadTicket, uploadDocThroughServer } from "@/lib/server/services/ops/verification";

/**
 * JSON body { contentType, size }: returns a presigned PUT into the private folder.
 * Multipart (field "file"): uploads through the server, for stores that can't presign.
 */
export const POST = route(async (ctx) => {
  const auth = requireAuth(ctx);
  if (ctx.req.headers.get("content-type")?.startsWith("multipart/form-data")) {
    const file = (await ctx.req.formData().catch(() => null))?.get("file");
    if (!(file instanceof File)) throw new DomainError("invalid_input", "Choose a file to upload.");
    return uploadDocThroughServer(ctx.repos, auth, file);
  }
  return createDocUploadTicket(ctx.repos, auth, await readJson(ctx.req));
});

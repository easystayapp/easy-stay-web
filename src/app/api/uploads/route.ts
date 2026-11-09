import { DomainError } from "@/lib/domain/errors";
import { requireAuth, route } from "@/lib/server/http";
import { uploadThroughServer } from "@/lib/server/services/media";

/**
 * Server-side photo upload (multipart, field "file"). Used only when the
 * storage backend can't issue direct upload URLs (e.g. in-memory dev store).
 */
export const POST = route(async (ctx) => {
  const auth = requireAuth(ctx);
  const form = await ctx.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new DomainError("invalid_input", "Choose a photo to upload.");
  return uploadThroughServer(ctx.repos, auth, file);
});

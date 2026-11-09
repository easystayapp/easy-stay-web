import { randomUUID } from "node:crypto";
import type { UploadedPhoto } from "@/types/api";
import { DomainError } from "@/lib/domain/errors";
import { requireAuth, route } from "@/lib/server/http";
import { getFileStorage } from "@/lib/server/repositories";
import { requireOwner } from "@/lib/server/services/users";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

/** Multipart upload of one listing photo (field "file"). Owners only. */
export const POST = route(async (ctx): Promise<UploadedPhoto> => {
  const auth = requireAuth(ctx);
  await requireOwner(ctx.repos, auth);
  const form = await ctx.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new DomainError("invalid_input", "Choose a photo to upload.");
  const ext = TYPES[file.type];
  if (!ext) throw new DomainError("invalid_input", "Photos must be JPG, PNG or WebP.");
  if (file.size > MAX_BYTES) throw new DomainError("invalid_input", "Each photo must be under 5 MB.");
  const path = `property-photos/${auth.uid}/${randomUUID()}.${ext}`;
  return getFileStorage().upload(path, new Uint8Array(await file.arrayBuffer()), file.type);
});

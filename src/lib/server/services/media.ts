/** Listing photo uploads and verification (storage-agnostic). */
import { randomUUID } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import type { Photo } from "@/lib/domain/types";
import type { UploadTicket, UploadedPhoto } from "@/types/api";
import type { AuthUser } from "../auth";
import { getFileStorage, type Repositories } from "../repositories";
import { requireOwner } from "./users";

export const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ownerPrefix = (uid: string) => `property-photos/${uid}/`;

function checkFile(contentType: unknown, size: unknown): string {
  const ext = typeof contentType === "string" ? PHOTO_TYPES[contentType] : undefined;
  if (!ext) throw new DomainError("invalid_input", "Photos must be JPG, PNG or WebP.");
  if (typeof size !== "number" || size <= 0) throw new DomainError("invalid_input", "That file looks empty.");
  if (size > MAX_PHOTO_BYTES) throw new DomainError("invalid_input", "Each photo must be under 5 MB.");
  return ext;
}

/** Issues a direct-to-storage upload URL, or asks the client to upload via the API. */
export async function createUploadTicket(
  repos: Repositories,
  auth: AuthUser,
  body: { contentType?: unknown; size?: unknown },
): Promise<UploadTicket> {
  await requireOwner(repos, auth);
  const ext = checkFile(body.contentType, body.size);
  const path = `${ownerPrefix(auth.uid)}${randomUUID()}.${ext}`;
  const presigned = await getFileStorage().presignUpload(path, body.contentType as string);
  return presigned ? { mode: "direct", ...presigned } : { mode: "server" };
}

/** Server-side upload fallback (multipart). */
export async function uploadThroughServer(repos: Repositories, auth: AuthUser, file: File): Promise<UploadedPhoto> {
  await requireOwner(repos, auth);
  const ext = checkFile(file.type, file.size);
  const path = `${ownerPrefix(auth.uid)}${randomUUID()}.${ext}`;
  return getFileStorage().upload(path, new Uint8Array(await file.arrayBuffer()), file.type);
}

/**
 * Turns client-submitted photos into trusted ones. Photos already on the
 * listing are kept exactly as stored. New ones must be in the owner's upload
 * namespace, exist, and be valid images; their URL is built from the storage
 * key, never taken from the client.
 */
export async function verifyPhotos(ownerId: string, photos: Photo[], alreadyStored: Photo[] = []): Promise<Photo[]> {
  const storage = getFileStorage();
  const known = new Map(alreadyStored.map((p) => [p.path, p]));
  const prefix = ownerPrefix(ownerId);
  const checks = photos.map(async (p) => {
    // Photos already on the listing keep their stored URL (they may live on a
    // different backend, e.g. bundled demo photos or a previous storage).
    const stored = known.get(p.path);
    if (stored) return stored;
    if (!p.path.startsWith(prefix) || p.path.includes("..")) {
      throw new DomainError("invalid_input", "Upload photos from this device.", { photos: "invalid" });
    }
    const stat = await storage.stat(p.path);
    if (!stat) throw new DomainError("invalid_input", "A photo didn't finish uploading. Please add it again.", { photos: "missing" });
    if (stat.size > MAX_PHOTO_BYTES || (stat.contentType && !PHOTO_TYPES[stat.contentType])) {
      await storage.delete(p.path).catch(() => {});
      throw new DomainError("invalid_input", "Each photo must be a JPG, PNG or WebP under 5 MB.", { photos: "invalid" });
    }
    return { path: p.path, url: storage.publicUrl(p.path) };
  });
  return Promise.all(checks);
}

export async function deleteMedia(paths: string[]): Promise<void> {
  // Only user uploads are ours to delete (never bundled demo photos).
  paths = paths.filter((p) => p.startsWith("property-photos/"));
  if (!paths.length) return;
  const storage = getFileStorage();
  await Promise.allSettled(paths.map((p) => storage.delete(p)));
}

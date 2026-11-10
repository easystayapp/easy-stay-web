/**
 * Cloudflare R2 media storage (S3-compatible API).
 *
 * Env:
 *   R2_ACCOUNT_ID          Cloudflare account id (endpoint host)
 *   R2_ACCESS_KEY_ID       R2 API token access key
 *   R2_SECRET_ACCESS_KEY   R2 API token secret
 *   R2_BUCKET              bucket name
 *   R2_PUBLIC_URL          public base URL: custom domain or https://pub-<id>.r2.dev
 *   R2_ENDPOINT            optional endpoint override (S3-compatible local server)
 *
 * Browsers upload directly with presigned PUT URLs, so photos never pass
 * through the app server. The bucket needs a CORS rule allowing PUT from the
 * app's origins (see README).
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FileStorage } from "../types";

const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PRESIGN_SECONDS = 300;

/** Bucket name; R2_BUCKET_NAME (Cloudflare's guide) is accepted as an alias. */
const bucketName = () => process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;

function required(name: string): string {
  const v = name === "R2_BUCKET" ? bucketName() : process.env[name];
  if (!v) throw new Error(`${name} is not set. Configure Cloudflare R2 in .env.local (see .env.example).`);
  return v;
}

export function r2Configured(): boolean {
  return !!(bucketName() && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}

export const r2PrivateConfigured = () => !!process.env.R2_PRIVATE_BUCKET && r2Configured();

/**
 * `private: true` targets R2_PRIVATE_BUCKET (KYC / NOC documents): no public URL,
 * no-store caching, and reads only through short-lived signed URLs.
 */
export function createR2FileStorage(opts: { private?: boolean } = {}): FileStorage {
  const isPrivate = !!opts.private;
  const bucket = isPrivate ? required("R2_PRIVATE_BUCKET") : required("R2_BUCKET");
  const publicBase = isPrivate ? "" : required("R2_PUBLIC_URL").replace(/\/+$/, "");
  const CACHE_CONTROL = isPrivate ? "private, no-store" : PUBLIC_CACHE_CONTROL;
  const endpoint = process.env.R2_ENDPOINT || `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: !!process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });

  const publicUrl = (path: string) => isPrivate ? "" : `${publicBase}/${path.split("/").map(encodeURIComponent).join("/")}`;

  return {
    publicUrl,

    async upload(path, data, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: path, Body: data, ContentType: contentType, CacheControl: CACHE_CONTROL }),
      );
      return { path, url: publicUrl(path) };
    },

    async presignUpload(path, contentType) {
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: bucket, Key: path, ContentType: contentType, CacheControl: CACHE_CONTROL }),
        { expiresIn: PRESIGN_SECONDS, signableHeaders: new Set(["content-type", "cache-control"]) },
      );
      return {
        uploadUrl,
        method: "PUT",
        headers: { "Content-Type": contentType, "Cache-Control": CACHE_CONTROL },
        path,
        url: publicUrl(path),
        expiresIn: PRESIGN_SECONDS,
      };
    },

    async signedUrl(path, expiresIn) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: path }), { expiresIn });
    },

    async stat(path) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: path }));
        return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? null };
      } catch (err) {
        if (err instanceof S3ServiceException && (err.$metadata.httpStatusCode === 404 || err.name === "NotFound")) return null;
        throw err;
      }
    },

    async delete(path) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }));
    },
  };
}

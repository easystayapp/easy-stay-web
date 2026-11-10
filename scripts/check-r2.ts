/**
 * Verifies Cloudflare R2 media storage end to end: presigned direct upload,
 * metadata, public URL, server upload, delete, and the bucket CORS rule that
 * browser uploads need. Uses a throwaway object and cleans up.
 *   npm run check:r2
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on the shell environment */
}

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
let fail = 0;
const ok = (c: boolean, m: string) => {
  console.log(c ? "  ✓" : "  ✗", m);
  if (!c) fail++;
};

async function main() {
  const { createR2FileStorage } = await import("@/lib/server/repositories/r2");
  const s = createR2FileStorage();
  const path = `healthchecks/${Date.now()}.png`;
  ok(s.publicUrl(path) === `${process.env.R2_PUBLIC_URL?.replace(/\/+$/, "")}/${path}`, "public URL derived from key");

  const t = (await s.presignUpload(path, "image/png"))!;
  ok(!!t && t.uploadUrl.includes("X-Amz-Signature"), "presigned PUT URL issued");
  const put = await fetch(t.uploadUrl, { method: "PUT", headers: t.headers, body: PNG });
  ok(put.ok, `browser-style direct PUT → ${put.status}`);

  const pub = await fetch(s.publicUrl(path)).catch(() => null);
  ok(
    !!pub?.ok,
    `public URL serves the photo → ${pub?.status ?? "unreachable"}`,
  );
  if (!pub?.ok) console.log("      → Bucket → Settings → Public access: connect a custom domain or enable the r2.dev URL, and set R2_PUBLIC_URL to it");

  const st = await s.stat(path);
  ok(st?.size === PNG.length && st?.contentType === "image/png", `stat after upload (${st?.size} bytes, ${st?.contentType})`);
  ok((await s.stat("healthchecks/missing.png")) === null, "stat of missing object → null");

  const up = await s.upload(`${path}.server.png`, PNG, "image/png");
  ok((await s.stat(up.path))?.size === PNG.length, "server-side upload");

  await s.delete(path);
  await s.delete(up.path);
  ok((await s.stat(path)) === null, "delete removes object");

  await checkCors();
  console.log(fail ? `${fail} check(s) failed` : "Cloudflare R2 is configured correctly.");
  process.exit(fail ? 1 : 0);
}
/** Browsers PUT straight to R2, so the bucket must allow the app's origin. */
async function checkCors() {
  const { S3Client, GetBucketCorsCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: !!process.env.R2_ENDPOINT,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
  const origins = (process.env.CHECK_ORIGINS ?? "http://localhost:3000,http://localhost:3002").split(",");
  try {
    const { CORSRules = [] } = await client.send(new GetBucketCorsCommand({ Bucket: process.env.R2_BUCKET }));
    for (const origin of origins) {
      const allowed = CORSRules.some(
        (r) =>
          r.AllowedMethods?.includes("PUT") &&
          (r.AllowedOrigins?.includes("*") || r.AllowedOrigins?.includes(origin)) &&
          ["content-type", "cache-control"].every((h) => r.AllowedHeaders?.some((a) => a === "*" || a.toLowerCase() === h)),
      );
      ok(allowed, `CORS allows browser uploads from ${origin}`);
    }
  } catch (e) {
    ok(false, `CORS rule present (${(e as Error).name})`);
  }
  if (fail) console.log("      → Bucket → Settings → CORS policy: add the rule from the README for each origin above");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};

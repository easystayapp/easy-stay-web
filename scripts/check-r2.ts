/**
 * Verifies Cloudflare R2 media storage end to end: presigned direct upload,
 * metadata, server upload and delete. Uses a throwaway object and cleans up.
 *   npm run check:r2
 * (Browser uploads additionally need the bucket CORS rule from the README.)
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

  const st = await s.stat(path);
  ok(st?.size === PNG.length && st?.contentType === "image/png", `stat after upload (${st?.size} bytes, ${st?.contentType})`);
  ok((await s.stat("healthchecks/missing.png")) === null, "stat of missing object → null");

  const up = await s.upload(`${path}.server.png`, PNG, "image/png");
  ok((await s.stat(up.path))?.size === PNG.length, "server-side upload");

  await s.delete(path);
  await s.delete(up.path);
  ok((await s.stat(path)) === null, "delete removes object");
  console.log(fail ? `${fail} check(s) failed` : "Cloudflare R2 is configured correctly.");
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};

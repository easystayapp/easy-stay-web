/**
 * Temporary deployment diagnostics. Publicly it reports only booleans, the
 * credential "shape", and a Firestore status/error code with a hint; never values,
 * the project id or raw error text. The full error message is returned only with
 * ?token=<HEALTH_TOKEN> (if that env var is set) and is always logged server-side.
 * Remove once production is healthy.
 */
export const dynamic = "force-dynamic";

const has = (k: string) => !!process.env[k]?.trim();

function serviceAccountShape() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return "missing";
  try {
    const j = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return j.client_email && j.private_key?.includes("BEGIN PRIVATE KEY") ? "ok" : "parsed, but missing client_email/private_key";
  } catch {
    return "present but not valid base64/JSON";
  }
}

function privateKeyShape() {
  const k = process.env.FIREBASE_PRIVATE_KEY;
  if (!k) return "missing";
  return [
    k.trim().startsWith('"') ? "wrapped in quotes" : "no quotes",
    k.includes("BEGIN PRIVATE KEY") ? "has BEGIN line" : "NO BEGIN line",
    k.includes("\\n") ? "escaped \\n" : k.includes("\n") ? "real newlines" : "no newlines",
  ].join(", ");
}

/** gRPC status codes Firestore uses, mapped to what to fix. */
const HINT: Record<string, string> = {
  "16": "UNAUTHENTICATED: the service-account key is wrong, revoked or rotated.",
  "7": "PERMISSION_DENIED: the service account lacks Firestore access, or the project id is wrong.",
  "5": "NOT_FOUND: no Firestore database in this project.",
  "14": "UNAVAILABLE: network problem reaching Firestore.",
};

export async function GET(req: Request) {
  const token = process.env.HEALTH_TOKEN;
  const verbose = !!token && new URL(req.url).searchParams.get("token") === token;
  const report: Record<string, unknown> = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    region: process.env.VERCEL_REGION ?? null,
    env: Object.fromEntries(
      ["DATA_BACKEND", "FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "GOOGLE_APPLICATION_CREDENTIALS", "STORAGE_BACKEND", "R2_BUCKET", "NEXT_PUBLIC_SITE_URL"].map((k) => [k, has(k)]),
    ),
    dataBackend: process.env.DATA_BACKEND ?? "(default firestore)",
    projectIdsMatch:
      !process.env.FIREBASE_PROJECT_ID || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        ? null
        : process.env.FIREBASE_PROJECT_ID === process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_SERVICE_ACCOUNT: serviceAccountShape(),
    FIREBASE_PRIVATE_KEY: privateKeyShape(),
  };
  try {
    const { getAdminApp } = await import("@/lib/server/firebase-admin");
    const { getFirestore } = await import("firebase-admin/firestore");
    const snap = await getFirestore(getAdminApp()).collection("cities").limit(1).get();
    report.firestore = `ok (${snap.size} city read)`;
  } catch (err) {
    const e = err as Error & { code?: unknown };
    report.firestore = "FAILED";
    console.error("[health] Firestore check failed", err); // full detail in Vercel logs only
    const code = e.code == null ? null : String(e.code);
    report.error = {
      name: e.name,
      code,
      hint: (code && HINT[code]) || (/credential|private key|PEM|DECODER/i.test(String(e.message)) ? "Credential could not be parsed or loaded." : "See the server log."),
      ...(verbose ? { message: String(e.message).slice(0, 400) } : {}),
    };
  }
  return Response.json(report, { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

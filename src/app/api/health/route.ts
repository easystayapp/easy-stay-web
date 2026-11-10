/**
 * Temporary deployment diagnostics. Reports whether each setting is present and
 * well-formed and what Firestore says, but NEVER the values themselves.
 * Remove once production is healthy.
 */
export const dynamic = "force-dynamic";

const has = (k: string) => !!process.env[k]?.trim();

function serviceAccountShape() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return "missing";
  try {
    const j = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return j.client_email && j.private_key?.includes("BEGIN PRIVATE KEY") ? `ok (project ${j.project_id})` : "parsed, but missing client_email/private_key";
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

export async function GET() {
  const report: Record<string, unknown> = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    region: process.env.VERCEL_REGION ?? null,
    env: Object.fromEntries(
      ["DATA_BACKEND", "FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "GOOGLE_APPLICATION_CREDENTIALS", "STORAGE_BACKEND", "R2_BUCKET", "NEXT_PUBLIC_SITE_URL"].map((k) => [k, has(k)]),
    ),
    dataBackend: process.env.DATA_BACKEND ?? "(default firestore)",
    projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
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
    report.error = { name: e.name, code: e.code ?? null, message: String(e.message).slice(0, 400) };
  }
  return Response.json(report, { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

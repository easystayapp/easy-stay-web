/**
 * Copies the app's settings from .env.local (and service-account.json) into a
 * linked Vercel project, without printing any secret values.
 *
 *   npm run vercel:env -- --dry-run                         # list what would be set
 *   npm run vercel:env                                      # Production
 *   npm run vercel:env -- --target=preview                  # Preview deployments
 *   npm run vercel:env -- --public-url=https://media.example.com
 *   npm run vercel:env -- --site-url=https://easy-stay-web.vercel.app
 *
 * Needs `npx vercel login` and `npx vercel link` first. Re-run after rotating keys.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("No .env.local found.");
  process.exit(1);
}

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=") || "true"] as const;
  }),
);
const target = args.get("target") ?? "production";
const dryRun = args.has("dry-run");
const env = process.env;

// Serverless hosts have no key file: send it as FIREBASE_SERVICE_ACCOUNT (base64 JSON).
let serviceAccount = env.FIREBASE_SERVICE_ACCOUNT;
let clientEmail = env.FIREBASE_CLIENT_EMAIL;
let privateKey = env.FIREBASE_PRIVATE_KEY;
const keyFile = env.GOOGLE_APPLICATION_CREDENTIALS;
if ((!clientEmail || !privateKey) && keyFile && existsSync(keyFile)) {
  const json = JSON.parse(readFileSync(keyFile, "utf8")) as { client_email?: string; private_key?: string };
  clientEmail = json.client_email;
  privateKey = json.private_key;
}
if (!serviceAccount && clientEmail && privateKey && env.FIREBASE_PROJECT_ID) {
  serviceAccount = Buffer.from(
    JSON.stringify({ type: "service_account", project_id: env.FIREBASE_PROJECT_ID, client_email: clientEmail, private_key: privateKey.replace(/\\n/g, "\n") }),
  ).toString("base64");
}

type Var = [name: string, value: string | undefined, secret: boolean];

// Required: without these the server can't reach Firebase.
const required: Var[] = [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", env.NEXT_PUBLIC_FIREBASE_API_KEY, false],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, false],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, false],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", env.NEXT_PUBLIC_FIREBASE_APP_ID, false],
  ["DATA_BACKEND", "firestore", false],
  ["FIREBASE_PROJECT_ID", env.FIREBASE_PROJECT_ID, false],
  // One base64 line: immune to quote / line-break mangling when stored on the host.
  ["FIREBASE_SERVICE_ACCOUNT", serviceAccount, true],
];

// Media: all-or-nothing. Without R2, uploads (photos, KYC) don't work in production.
const r2: Var[] = [
  ["STORAGE_BACKEND", "r2", false],
  ["R2_ACCOUNT_ID", env.R2_ACCOUNT_ID, false],
  ["R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID, true],
  ["R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY, true],
  ["R2_BUCKET", env.R2_BUCKET || env.R2_BUCKET_NAME, false],
  ["R2_PUBLIC_URL", args.get("public-url") ?? env.R2_PUBLIC_URL, false],
];

// Optional: sent only when set.
const optional: Var[] = [
  ["NEXT_PUBLIC_SITE_URL", args.get("site-url") ?? env.NEXT_PUBLIC_SITE_URL, false],
  ["REQUIRE_EMAIL_VERIFICATION", env.REQUIRE_EMAIL_VERIFICATION, false],
];

const missing = required.filter(([, v]) => !v?.trim()).map(([n]) => n);
if (missing.length) {
  console.error(`Missing in .env.local / service-account.json: ${missing.join(", ")}`);
  process.exit(1);
}
const r2Missing = r2.filter(([, v]) => !v?.trim()).map(([n]) => n);
if (r2Missing.length) {
  console.warn(`! Cloudflare R2 is not configured (${r2Missing.join(", ")}). Skipping it: photo and document uploads won't work in production until it is.`);
}
const vars: Var[] = [...required, ...(r2Missing.length ? [] : r2), ...optional.filter(([, v]) => v?.trim())];
if (!vars.some(([n]) => n === "NEXT_PUBLIC_SITE_URL")) {
  console.warn("! NEXT_PUBLIC_SITE_URL not set: canonical links and the sitemap will use the Vercel production URL. Pass --site-url=https://… to set it.");
}

for (const k of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST"]) {
  if (env[k]) console.warn(`! ${k} is set locally; it is NOT sent to Vercel.`);
}

console.log(`${dryRun ? "Would set" : "Setting"} ${vars.length} variables on Vercel (${target}):`);
let failed = 0;
for (const [name, value, secret] of vars) {
  if (dryRun) {
    console.log(`  · ${name}${secret ? " (sensitive)" : ""}`);
    continue;
  }
  const r = spawnSync(
    "npx",
    ["-y", "vercel@latest", "env", "add", name, target, "--force", ...(secret ? ["--sensitive"] : [])],
    { input: value, encoding: "utf8" },
  );
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok ? "" : ` — ${(r.stderr || r.stdout).trim().split("\n").pop()}`}`);
}
if (!dryRun) console.log(failed ? `\n${failed} failed.` : "\nDone. Redeploy for the new values to take effect.");
process.exit(failed ? 1 : 0);

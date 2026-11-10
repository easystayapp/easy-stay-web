/**
 * Verifies the live Firebase setup: browser config, service-account access to
 * Cloud Firestore (write/read/delete a throwaway doc) and Auth, and the web
 * API key's project, sign-in providers and authorized domains.
 *   npm run check:firebase
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on the shell environment */
}
import { existsSync } from "node:fs";

let fail = 0;
let warn = 0;
const ok = (c: boolean, m: string, hint?: string) => {
  console.log(c ? "  ✓" : "  ✗", m);
  if (!c) {
    fail++;
    if (hint) console.log(`      → ${hint}`);
  }
  return c;
};
const note = (m: string) => {
  console.log("  !", m);
  warn++;
};

async function main() {
  const env = process.env;
  console.log("Config");
  for (const k of [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "FIREBASE_PROJECT_ID",
  ]) {
    ok(!!env[k]?.trim(), `${k} is set`, "Fill it in .env.local");
  }
  ok(
    env.FIREBASE_PROJECT_ID === env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "server and browser use the same project id",
    "FIREBASE_PROJECT_ID must equal NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  );
  for (const k of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST"]) {
    ok(!env[k], `${k} is not set (talking to the real project)`, "Remove it from .env.local");
  }
  const keyFile = env.GOOGLE_APPLICATION_CREDENTIALS;
  const inlineKey = !!(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
  ok(
    inlineKey || (!!keyFile && existsSync(keyFile)),
    inlineKey ? "service account from FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY" : `service-account key file found (${keyFile ?? "unset"})`,
    "Save the downloaded JSON as service-account.json in the project folder, or use option B in .env.local",
  );
  if (fail) return done();

  console.log("Web API key");
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${encodeURIComponent(env.NEXT_PUBLIC_FIREBASE_API_KEY!)}`,
    );
    const cfg = (await res.json()) as {
      projectId?: string;
      authorizedDomains?: string[];
      idpConfig?: { provider: string; enabled?: boolean }[];
      error?: { message?: string };
    };
    if (ok(res.ok, "API key is valid", cfg.error?.message)) {
      const google = cfg.idpConfig?.find((p) => p.provider === "google.com");
      if (!google?.enabled) note("Google sign-in looks disabled: Authentication → Sign-in method → Google → Enable");
      else console.log("  ✓ Google sign-in enabled");
      const domains = cfg.authorizedDomains ?? [];
      if (!domains.includes("localhost")) note("'localhost' is not an authorized domain: Authentication → Settings → Authorized domains");
      else console.log(`  ✓ authorized domains: ${domains.join(", ")}`);
    }
  } catch (e) {
    note(`could not reach Identity Toolkit (${(e as Error).message})`);
  }

  console.log("Service account");
  const { getAdminApp } = await import("@/lib/server/firebase-admin");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAuth } = await import("firebase-admin/auth");
  const app = getAdminApp();

  try {
    await getAuth(app).listUsers(1);
    ok(true, "Firebase Auth reachable with the service account");
  } catch (e) {
    ok(false, "Firebase Auth reachable with the service account", (e as Error).message);
  }

  try {
    const ref = getFirestore(app).collection("_healthchecks").doc(`check-${Date.now()}`);
    await ref.set({ at: new Date() });
    const snap = await ref.get();
    ok(snap.exists, "Firestore write + read");
    await ref.delete();
    ok(!(await ref.get()).exists, "Firestore delete");
  } catch (e) {
    const msg = (e as Error).message;
    ok(
      false,
      "Firestore reachable",
      /NOT_FOUND/.test(msg)
        ? "No Firestore database yet: Firebase console → Firestore Database → Create database (Native mode)"
        : msg,
    );
  }
  done();
}

function done() {
  console.log(
    fail
      ? `\n${fail} check(s) failed.`
      : `\nFirebase is configured correctly${warn ? ` (${warn} warning${warn > 1 ? "s" : ""} above)` : ""}.`,
  );
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};

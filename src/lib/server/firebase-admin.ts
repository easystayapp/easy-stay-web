import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";

/**
 * Lazily initialises the Admin SDK from environment variables.
 *
 * - FIREBASE_SERVICE_ACCOUNT: the whole service-account JSON, as base64 (one line,
 *   safest to paste into a host) or as raw JSON.
 * - FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY: service-account credentials.
 * - GOOGLE_APPLICATION_CREDENTIALS: path to a service-account JSON file.
 * - Neither: project id only — enough for the emulators and for verifying
 *   ID tokens, which is all the in-memory backend needs.
 */
export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Set FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID). See .env.example.");
  }

  const sa = serviceAccountFromEnv();
  if (sa) return initializeApp({ credential: cert(sa), projectId });

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Tolerate the key being stored with its surrounding quotes, and with "\n" escapes.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId });
  }
  return initializeApp({ projectId });
}

/** Parses FIREBASE_SERVICE_ACCOUNT (base64 or raw JSON). Throws a clear error if it's malformed. */
function serviceAccountFromEnv(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  let json: { project_id?: string; client_email?: string; private_key?: string };
  try {
    json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64-encoded JSON.");
  }
  if (!json.client_email || !json.private_key || !json.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing client_email, private_key or project_id.");
  }
  return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
}

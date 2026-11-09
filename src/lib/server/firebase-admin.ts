import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";

/**
 * Lazily initialises the Admin SDK from environment variables.
 *
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

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId });
  }
  return initializeApp({ projectId });
}

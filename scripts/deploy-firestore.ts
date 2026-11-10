/**
 * Deploys firestore.rules and firestore.indexes.json to the project in
 * .env.local. Authenticates with the service account (GOOGLE_APPLICATION_CREDENTIALS)
 * or, failing that, your `firebase login` session.
 *   npm run deploy:firestore
 */
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on the shell environment */
}

const project = process.env.FIREBASE_PROJECT_ID;
if (!project) {
  console.error("Set FIREBASE_PROJECT_ID in .env.local first.");
  process.exit(1);
}
const r = spawnSync(
  "npx",
  ["-y", "firebase-tools@latest", "deploy", "--only", "firestore:rules,firestore:indexes", "--project", project, "--non-interactive"],
  { stdio: "inherit", env: process.env },
);
process.exit(r.status ?? 1);

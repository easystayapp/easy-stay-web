/**
 * Writes service-account.json into .env.local and .env as environment variables
 * (never prints them):
 *   FIREBASE_SERVICE_ACCOUNT  whole JSON, base64, one line: the easiest to paste into a host
 *   FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY  the same credentials as two variables
 *
 *   npm run env:service-account                      # uses ./service-account.json
 *   npm run env:service-account -- path/to/key.json  # after rotating the key
 */
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";

const file = process.argv[2] ?? "service-account.json";
if (!existsSync(file)) {
  console.error(`No ${file}. Download it from Firebase → Project settings → Service accounts.`);
  process.exit(1);
}
const sa = JSON.parse(readFileSync(file, "utf8")) as { project_id?: string; client_email?: string; private_key?: string; private_key_id?: string };
if (!sa.client_email || !sa.private_key || !sa.project_id) {
  console.error(`${file} is not a service-account key (missing client_email / private_key / project_id).`);
  process.exit(1);
}
const values: Record<string, string> = {
  FIREBASE_SERVICE_ACCOUNT: Buffer.from(JSON.stringify(sa)).toString("base64"),
  FIREBASE_CLIENT_EMAIL: sa.client_email,
  FIREBASE_PRIVATE_KEY: `"${sa.private_key.replace(/\n/g, "\\n")}"`,
};

for (const target of [".env.local", ".env"]) {
  if (!existsSync(target)) continue;
  let text = readFileSync(target, "utf8");
  for (const [k, v] of Object.entries(values)) {
    const line = new RegExp(`^#?\\s*${k}=.*$`, "m");
    text = line.test(text) ? text.replace(line, () => `${k}=${v}`) : `${text.trimEnd()}\n${k}=${v}\n`;
  }
  writeFileSync(target, text);
  chmodSync(target, 0o600);
  console.log(`✓ ${target}: ${Object.keys(values).join(", ")}`);
}
console.log(`Key id ${sa.private_key_id?.slice(0, 8)}… for ${sa.project_id}. Copy FIREBASE_SERVICE_ACCOUNT to your host, then redeploy.`);

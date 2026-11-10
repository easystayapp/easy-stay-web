/**
 * Creates (or updates) an admin account for admin.easystay.in.
 *   npm run admin:create -- you@easystay.in 'a-long-password'
 *   npm run admin:create -- you@easystay.in --revoke      # remove admin access
 * Sets the `admin` custom claim and marks the email verified (the console requires both).
 */
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "../src/lib/server/firebase-admin";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on the shell environment */
}

const [email, arg] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run admin:create -- <email> <password> | --revoke");
  process.exit(1);
}
const auth = getAuth(getAdminApp());
const existing = await auth.getUserByEmail(email).catch(() => null);

if (arg === "--revoke") {
  if (!existing) throw new Error(`No user ${email}`);
  await auth.setCustomUserClaims(existing.uid, { ...existing.customClaims, admin: false });
  await auth.revokeRefreshTokens(existing.uid);
  console.log(`Removed admin access for ${email}.`);
} else {
  if (!existing && (!arg || arg.length < 12)) throw new Error("A new account needs a password of at least 12 characters.");
  const user = existing
    ? await auth.updateUser(existing.uid, { emailVerified: true, ...(arg ? { password: arg } : {}) })
    : await auth.createUser({ email, password: arg, emailVerified: true });
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
  console.log(`${email} (${user.uid}) is now an admin. Sign in at https://admin.easystay.in/login`);
}

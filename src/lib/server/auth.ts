/**
 * Identity is kept separate from data storage: the API trusts a bearer
 * token, verified here, and services only see `AuthUser`. Swapping the
 * database never touches auth, and swapping the auth provider only touches
 * this file.
 */
import { DomainError } from "@/lib/domain/errors";
import { getAdminApp } from "./firebase-admin";

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  emailVerified: boolean;
  /** `admin` custom claim (set with the Admin SDK). */
  admin: boolean;
  /** When the user last actually signed in (ms). */
  authTime: number;
}

export async function verifyBearer(header: string | null): Promise<AuthUser | null> {
  const token = header?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;
  // Loaded only when a request carries a token, so public routes never depend on the Auth module.
  const { getAuth } = await import("firebase-admin/auth");
  try {
    const t = await getAuth(getAdminApp()).verifyIdToken(token);
    return {
      uid: t.uid,
      email: t.email ?? null,
      name: (t.name as string | undefined) ?? null,
      picture: t.picture ?? null,
      emailVerified: t.email_verified === true,
      admin: t.admin === true,
      authTime: (t.auth_time ?? 0) * 1000,
    };
  } catch {
    throw new DomainError("unauthenticated", "Your session has expired. Please log in again.");
  }
}

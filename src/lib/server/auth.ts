/**
 * Identity is kept separate from data storage: the API trusts a bearer
 * token, verified here, and services only see `AuthUser`. Swapping the
 * database never touches auth, and swapping the auth provider only touches
 * this file.
 */
import { getAuth } from "firebase-admin/auth";
import { DomainError } from "@/lib/domain/errors";
import { getAdminApp } from "./firebase-admin";

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

export async function verifyBearer(header: string | null): Promise<AuthUser | null> {
  const token = header?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;
  try {
    const t = await getAuth(getAdminApp()).verifyIdToken(token);
    return {
      uid: t.uid,
      email: t.email ?? null,
      name: (t.name as string | undefined) ?? null,
      picture: t.picture ?? null,
    };
  } catch {
    throw new DomainError("unauthenticated", "Your session has expired. Please log in again.");
  }
}

/** Shared guards, audit log and notifications for the transactional layer. */
import { randomUUID } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import { defaultMeta, type AppNotification, type AuditEntry, type NotificationType, type UserMeta } from "@/lib/domain/ops";
import type { AuthUser } from "../../auth";
import { PATHS, type Repositories } from "../../repositories";
import { dataBackend } from "../../repositories";

/** Meta read through a 30 s per-process cache: one read per user per half-minute at most. */
const cache = new Map<string, { at: number; meta: UserMeta }>();
const TTL = 30_000;

export async function getMeta(repos: Repositories, uid: string): Promise<UserMeta> {
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < TTL) return hit.meta;
  const now = Date.now();
  const found = await repos.docs<UserMeta & { id: string }>(PATHS.userMeta).get(uid);
  const meta: UserMeta = found ? { ...defaultMeta(now), ...found } : defaultMeta(now);
  cache.set(uid, { at: now, meta });
  return meta;
}

export async function patchMeta(repos: Repositories, uid: string, patch: Record<string, unknown>) {
  await repos.docs(PATHS.userMeta).merge(uid, { ...patch, updatedAt: Date.now() });
  cache.delete(uid);
}

/** Blocks banned users from any write action. */
export async function assertActive(repos: Repositories, auth: AuthUser): Promise<UserMeta> {
  const meta = await getMeta(repos, auth.uid);
  if (meta.banned) throw new DomainError("forbidden", "This account has been suspended. Contact the grievance officer.");
  return meta;
}

/**
 * Email verification before enquiring / listing is OFF by default. Set
 * REQUIRE_EMAIL_VERIFICATION=1 to enforce it (Google accounts are already verified).
 */
export function requireVerifiedEmail(auth: AuthUser) {
  if (process.env.REQUIRE_EMAIL_VERIFICATION !== "1") return;
  if (!auth.emailVerified) throw new DomainError("not_eligible", "Please verify your email first.", { email: "unverified" });
}

/** Admin sessions must be recent so a stolen old token can't be used for long. */
export const ADMIN_SESSION_MAX_MS = 12 * 3_600_000;

export async function requireAdmin(repos: Repositories, auth: AuthUser): Promise<void> {
  const meta = await getMeta(repos, auth.uid);
  if (!(auth.admin || meta.admin) || meta.banned) throw new DomainError("forbidden", "Admin access required.");
  if (!auth.emailVerified) throw new DomainError("forbidden", "Verify your email to use the admin console.");
  if (Date.now() - auth.authTime > ADMIN_SESSION_MAX_MS) {
    throw new DomainError("unauthenticated", "Your admin session expired. Please sign in again.");
  }
}

export async function audit(
  repos: Repositories,
  e: Omit<AuditEntry, "id" | "at" | "note"> & { note?: string | null },
) {
  const id = `${Date.now()}_${randomUUID().slice(0, 8)}`;
  await repos.docs<AuditEntry>(PATHS.audit).set(id, { ...e, note: e.note ?? null, at: Date.now() });
}

/** Stores an in-app notification and sends a push (best effort, never throws). */
export async function notify(
  repos: Repositories,
  n: { userId: string; type: NotificationType; title: string; body: string; href: string },
) {
  try {
    const id = `${n.userId}_${Date.now()}_${randomUUID().slice(0, 6)}`;
    await repos.docs<AppNotification>(PATHS.notifications).set(id, { ...n, read: false, at: Date.now() });
    if (dataBackend() === "firestore") await push(n);
  } catch (err) {
    console.error("notify failed", err);
  }
}

async function push(n: { userId: string; title: string; body: string; href: string }) {
  const [{ getMessaging }, { getAdminApp, adminDb }] = await Promise.all([
    import("firebase-admin/messaging"),
    import("../../firebase-admin"),
  ]);
  const app = getAdminApp();
  const tokens = ((await adminDb().collection("users").doc(n.userId).get()).get("fcmTokens") as string[] | undefined) ?? [];
  if (!tokens.length) return;
  await getMessaging(app).sendEachForMulticast({
    tokens: tokens.slice(0, 20),
    notification: { title: n.title, body: n.body },
    data: { href: n.href },
  });
}

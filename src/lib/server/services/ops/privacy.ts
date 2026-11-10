/** DPDP: consent toggles, data export, account deletion. In-app notification list lives here too. */
import { getAuth } from "firebase-admin/auth";
import { DomainError } from "@/lib/domain/errors";
import { PATHS, dataBackend, type Repositories } from "../../repositories";
import type { AppNotification, Case, Enquiry, Message } from "@/lib/domain/ops";
import type { AuthUser } from "../../auth";
import { getAdminApp } from "../../firebase-admin";
import { getMeta, patchMeta } from "./guard";

export async function getConsents(repos: Repositories, auth: AuthUser) {
  return (await getMeta(repos, auth.uid)).consents;
}

/** `core` can't be switched off (turn it off by deleting the account). */
export async function setConsents(repos: Repositories, auth: AuthUser, body: { marketing?: unknown; partnerSharing?: unknown }) {
  const cur = await getMeta(repos, auth.uid);
  const next = {
    ...cur.consents,
    marketing: typeof body.marketing === "boolean" ? body.marketing : cur.consents.marketing,
    partnerSharing: typeof body.partnerSharing === "boolean" ? body.partnerSharing : cur.consents.partnerSharing,
    updatedAt: Date.now(),
  };
  await patchMeta(repos, auth.uid, { consents: next });
  return next;
}

/** Everything we hold about the user, as one JSON document. */
export async function exportMyData(repos: Repositories, auth: AuthUser) {
  const [user, meta, saved, ratings, asSeeker, asOwner, cases, notes] = await Promise.all([
    repos.users.get(auth.uid),
    getMeta(repos, auth.uid),
    repos.saved.listByUser(auth.uid),
    repos.ratings.listByUser(auth.uid),
    repos.docs<Enquiry>(PATHS.enquiries).query({ where: [["seekerId", "==", auth.uid]], limit: 500 }),
    repos.docs<Enquiry>(PATHS.enquiries).query({ where: [["ownerId", "==", auth.uid]], limit: 500 }),
    repos.docs<Case>(PATHS.cases).query({ where: [["reporterId", "==", auth.uid]], limit: 500 }),
    repos.docs<AppNotification>(PATHS.notifications).query({ where: [["userId", "==", auth.uid]], limit: 500 }),
  ]);
  const threads = [...asSeeker, ...asOwner];
  const messages: Record<string, Message[]> = {};
  for (const t of threads) {
    messages[t.id] = (await repos.docs<Message>(PATHS.messages(t.id)).query({ where: [["senderId", "==", auth.uid]], limit: 1000 }));
  }
  const { fcmTokens: _t, ...profile } = (user ?? {}) as Record<string, unknown>;
  return { exportedAt: new Date().toISOString(), profile, consents: meta.consents, kycStatus: meta.kyc, saved, ratings, enquiries: threads, myMessages: messages, reports: cases, notifications: notes };
}

/**
 * Deletes the account. Listings and personal profile are removed; chat history is
 * anonymised (the other party keeps their conversation), and the auth user is deleted.
 */
export async function deleteMyAccount(repos: Repositories, auth: AuthUser, body: { confirm?: unknown }) {
  if (body.confirm !== "DELETE") throw new DomainError("invalid_input", 'Type "DELETE" to confirm.', { confirm: "required" });
  const uid = auth.uid;
  for (const p of await repos.properties.listByOwner(uid)) await repos.properties.delete(p.id);

  const enq = repos.docs<Enquiry>(PATHS.enquiries);
  const threads = [
    ...(await enq.query({ where: [["seekerId", "==", uid]], limit: 500 })),
    ...(await enq.query({ where: [["ownerId", "==", uid]], limit: 500 })),
  ];
  await repos.batch(
    threads.slice(0, 400).map((t) => ({
      op: "merge" as const, path: PATHS.enquiries, id: t.id,
      data: { status: "closed", [t.seekerId === uid ? "seekerName" : "ownerName"]: "Deleted user" },
    })),
  );
  for (const n of await repos.docs<AppNotification>(PATHS.notifications).query({ where: [["userId", "==", uid]], limit: 500 })) {
    await repos.docs(PATHS.notifications).delete(n.id);
  }
  await repos.docs(PATHS.userMeta).delete(uid);
  await repos.users.update(uid, { displayName: "Deleted user", email: null, phone: null, photoUrl: null, owner: null, updatedAt: new Date() });
  if (dataBackend() === "firestore") await getAuth(getAdminApp()).deleteUser(uid);
  return { ok: true };
}

export async function listMyNotifications(repos: Repositories, auth: AuthUser, after?: unknown) {
  const a = Number(after);
  const rows = await repos.docs<AppNotification>(PATHS.notifications).query({
    where: [["userId", "==", auth.uid]], orderBy: ["at", "desc"], limit: 30, after: a > 0 ? a : undefined,
  });
  return { items: rows, unread: rows.filter((n) => !n.read).length, next: rows.length === 30 ? rows[rows.length - 1].at : null };
}

export async function markNotificationsRead(repos: Repositories, auth: AuthUser, ids: unknown) {
  const list = Array.isArray(ids) ? (ids as unknown[]).filter((i): i is string => typeof i === "string" && i.startsWith(`${auth.uid}_`)).slice(0, 50) : [];
  await repos.batch(list.map((id) => ({ op: "merge" as const, path: PATHS.notifications, id, data: { read: true } })));
  return { ok: true };
}

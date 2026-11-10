/** Reports, grievances, 36 h takedowns, user bans and the audit trail. */
import { randomUUID } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { DomainError } from "@/lib/domain/errors";
import {
  CASE_KINDS, REPORT_REASONS, isOverdue, slaDeadlines,
  type AuditEntry, type Case, type CaseKind, type ReportReason,
} from "@/lib/domain/ops";
import type { AuthUser } from "../../auth";
import { PATHS, dataBackend, type Repositories } from "../../repositories";
import { getAdminApp } from "../../firebase-admin";
import { assertActive, audit, notify, patchMeta, requireAdmin } from "./guard";
import { moderateListing } from "./verification";

const store = (r: Repositories) => r.docs<Case>(PATHS.cases);

/** Report a listing/user (deduplicated per reporter + target) or file a grievance. */
export async function fileCase(
  repos: Repositories,
  auth: AuthUser,
  body: { kind?: unknown; targetType?: unknown; targetId?: unknown; reason?: unknown; details?: unknown },
) {
  await assertActive(repos, auth);
  const kind = (CASE_KINDS.includes(body.kind as CaseKind) ? body.kind : "report") as CaseKind;
  if (kind === "takedown") throw new DomainError("forbidden", "Takedown requests are created by admins.");
  const reason = body.reason as ReportReason;
  if (!REPORT_REASONS.includes(reason)) throw new DomainError("invalid_input", "Choose a reason.", { reason: "required" });
  const targetType = body.targetType === "user" ? "user" : body.targetType === "message" ? "message" : "property";
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  if (!targetId) throw new DomainError("invalid_input", "Missing target.");
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 1000) : "";
  const now = Date.now();
  const id = kind === "report" ? `${targetId}_${auth.uid}` : `g_${now}_${randomUUID().slice(0, 6)}`;
  const created = await store(repos).create(id, {
    kind, status: "open", targetType, targetId, reporterId: auth.uid, reason, details,
    ...slaDeadlines(kind, now), acknowledgedAt: null, resolvedAt: null, resolution: null, assigneeId: null,
    createdAt: now, updatedAt: now,
  });
  return { id, duplicate: !created };
}

export async function listCases(repos: Repositories, auth: AuthUser, opts: { status?: unknown; kind?: unknown; overdue?: unknown; after?: unknown }) {
  await requireAdmin(repos, auth);
  const where: [string, "==", unknown][] = [["status", "==", typeof opts.status === "string" ? opts.status : "open"]];
  if (typeof opts.kind === "string") where.push(["kind", "==", opts.kind]);
  const after = Number(opts.after);
  const rows = await store(repos).query({ where, orderBy: ["createdAt", "asc"], limit: 50, after: after > 0 ? after : undefined });
  const now = Date.now();
  const items = rows.map((c) => ({ ...c, overdue: isOverdue(c, now) }));
  return { items: opts.overdue === "1" ? items.filter((c) => c.overdue) : items, next: rows.length === 50 ? rows[rows.length - 1].createdAt : null };
}

/** acknowledge → resolve/reject. Resolving a takedown also hides the listing. */
export async function updateCase(
  repos: Repositories,
  auth: AuthUser,
  id: string,
  body: { action?: unknown; resolution?: unknown; hide?: unknown },
) {
  await requireAdmin(repos, auth);
  const c = await store(repos).get(id);
  if (!c) throw new DomainError("not_found", "Case not found.");
  const now = Date.now();
  const action = body.action;
  const resolution = typeof body.resolution === "string" ? body.resolution.trim().slice(0, 500) : "";
  if (action === "acknowledge") {
    if (c.status !== "open") throw new DomainError("conflict", "Already acknowledged.");
    await store(repos).merge(id, { status: "acknowledged", acknowledgedAt: now, assigneeId: auth.uid, updatedAt: now });
  } else if (action === "resolve" || action === "reject") {
    if (c.status === "resolved" || c.status === "rejected") throw new DomainError("conflict", "Already closed.");
    if (!resolution) throw new DomainError("invalid_input", "Write the resolution.", { resolution: "required" });
    if (action === "resolve" && body.hide === true && c.targetType === "property") {
      await moderateListing(repos, auth, c.targetId, { hide: true, reason: resolution });
    }
    await store(repos).merge(id, {
      status: action === "resolve" ? "resolved" : "rejected", resolution, resolvedAt: now,
      acknowledgedAt: c.acknowledgedAt ?? now, assigneeId: c.assigneeId ?? auth.uid, updatedAt: now,
    });
    await notify(repos, { userId: c.reporterId, type: "case_update", title: "Your report was reviewed", body: resolution.slice(0, 100), href: "/profile/reports" });
  } else {
    throw new DomainError("invalid_input", "Unknown action.");
  }
  await audit(repos, { actorId: auth.uid, action: `case.${String(action)}`, targetType: c.kind, targetId: id, before: c.status, after: action, note: resolution || null });
  return { ok: true };
}

/** Starts the 36-hour takedown clock for a listing (e.g. on a legal notice). */
export async function startTakedown(repos: Repositories, auth: AuthUser, body: { propertyId?: unknown; reason?: unknown; details?: unknown }) {
  await requireAdmin(repos, auth);
  const targetId = typeof body.propertyId === "string" ? body.propertyId : "";
  if (!targetId || !(await repos.properties.get(targetId))) throw new DomainError("not_found", "Listing not found.");
  const now = Date.now();
  const id = `t_${targetId}_${now}`;
  await store(repos).set(id, {
    kind: "takedown", status: "open", targetType: "property", targetId, reporterId: auth.uid,
    reason: REPORT_REASONS.includes(body.reason as ReportReason) ? (body.reason as ReportReason) : "other",
    details: typeof body.details === "string" ? body.details.slice(0, 1000) : "",
    ...slaDeadlines("takedown", now), acknowledgedAt: null, resolvedAt: null, resolution: null, assigneeId: auth.uid,
    createdAt: now, updatedAt: now,
  });
  await audit(repos, { actorId: auth.uid, action: "takedown.start", targetType: "property", targetId, before: null, after: "open" });
  return { id, hideBy: now + 36 * 3_600_000 };
}

/** Ban or unban. Also disables the Firebase Auth user and revokes sessions. */
export async function setBan(repos: Repositories, auth: AuthUser, uid: string, body: { banned?: unknown; reason?: unknown }) {
  await requireAdmin(repos, auth);
  if (uid === auth.uid) throw new DomainError("forbidden", "You can't ban yourself.");
  const banned = body.banned === true;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  if (banned && !reason) throw new DomainError("invalid_input", "Give a reason.", { reason: "required" });
  await patchMeta(repos, uid, { banned, bannedReason: banned ? reason : null });
  if (dataBackend() === "firestore") {
    const a = getAuth(getAdminApp());
    await a.updateUser(uid, { disabled: banned });
    if (banned) await a.revokeRefreshTokens(uid);
  }
  if (banned) {
    for (const p of await repos.properties.listByOwner(uid)) {
      if (p.status === "active") await repos.properties.update(p.id, { status: "paused", updatedAt: new Date() });
    }
  }
  await audit(repos, { actorId: auth.uid, action: banned ? "user.ban" : "user.unban", targetType: "user", targetId: uid, before: null, after: banned, note: reason || null });
  return { ok: true };
}

export async function listAudit(repos: Repositories, auth: AuthUser, opts: { targetId?: unknown; after?: unknown }) {
  await requireAdmin(repos, auth);
  const after = Number(opts.after);
  const rows = await repos.docs<AuditEntry>(PATHS.audit).query({
    where: typeof opts.targetId === "string" ? [["targetId", "==", opts.targetId]] : [],
    orderBy: ["at", "desc"], limit: 50, after: after > 0 ? after : undefined,
  });
  return { items: rows, next: rows.length === 50 ? rows[rows.length - 1].at : null };
}

/** Dashboard counters. Each is one bounded query (capped at 100, shown as "100+"). */
export async function adminStats(repos: Repositories, auth: AuthUser) {
  await requireAdmin(repos, auth);
  const now = Date.now();
  const [pending, open, ack] = await Promise.all([
    repos.docs(PATHS.verifications).query({ where: [["status", "==", "pending"]], limit: 100 }),
    store(repos).query({ where: [["status", "==", "open"]], limit: 100 }),
    store(repos).query({ where: [["status", "==", "acknowledged"]], limit: 100 }),
  ]);
  const overdue = [...open, ...ack].filter((c) => isOverdue(c, now)).length;
  return {
    pendingVerifications: pending.length,
    openCases: open.length,
    inProgressCases: ack.length,
    overdueCases: overdue,
    takedownsOpen: open.filter((c) => c.kind === "takedown").length,
    capped: pending.length === 100 || open.length === 100 || ack.length === 100,
  };
}

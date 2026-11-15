/**
 * Owner verification (KYC, NOCs, photos), the admin review queue, the published
 * health score and listing moderation. Every admin change is audit-logged with
 * before/after values.
 */
import { DomainError } from "@/lib/domain/errors";
import {
  VERIFICATION_KINDS,
  WOMEN_FIRST_CHECKS,
  emptySafety,
  emptyWomenFirst,
  womenFirstUntil,
  safetyBadge,
  verificationId,
  type PropertySafety,
  type Verification,
  type VerificationKind,
} from "@/lib/domain/ops";
import type { Property } from "@/lib/domain/types";
import type { PropertyCard } from "@/types/api";
import type { AuthUser } from "../../auth";
import { toCard } from "../mappers";
import { randomUUID } from "node:crypto";
import { PATHS, getPrivateStorage, type Repositories } from "../../repositories";
import { assertActive, audit, notify, patchMeta, requireAdmin, requireVerifiedEmail } from "./guard";

const MAX_DOC_BYTES = 10 * 1024 * 1024;
const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const safetyStore = (r: Repositories) => r.docs<PropertySafety>(PATHS.safety);
const verStore = (r: Repositories) => r.docs<Verification>(PATHS.verifications);

/* ------------------------------------------------------------------ owner */

/** Folder for KYC / NOC documents in the bucket. Never linked publicly; admins get signed URLs. */
export const KYC_FOLDER = "owners-kyc-docs/";
export const docPrefix = (uid: string) => `${KYC_FOLDER}${uid}/`;

/** Direct-to-storage upload ticket for a verification document (owners-kyc-docs/ folder). */
export async function createDocUploadTicket(repos: Repositories, auth: AuthUser, body: { contentType?: unknown; size?: unknown }) {
  await assertActive(repos, auth);
  const type = typeof body.contentType === "string" ? body.contentType : "";
  if (!DOC_TYPES.includes(type)) throw new DomainError("invalid_input", "Use a JPG, PNG, WebP or PDF file.");
  if (typeof body.size !== "number" || body.size <= 0 || body.size > MAX_DOC_BYTES) throw new DomainError("invalid_input", "Files must be under 10 MB.");
  const ext = type === "application/pdf" ? "pdf" : type.split("/")[1];
  const path = `${docPrefix(auth.uid)}${randomUUID()}.${ext}`;
  const ticket = await getPrivateStorage().presignUpload(path, type);
  return ticket ? { mode: "direct" as const, ...ticket, url: undefined } : { mode: "unsupported" as const, path };
}

/** Fallback when storage can't presign (in-memory dev store): the file goes through the API. */
export async function uploadDocThroughServer(repos: Repositories, auth: AuthUser, file: File) {
  await assertActive(repos, auth);
  if (!DOC_TYPES.includes(file.type)) throw new DomainError("invalid_input", "Use a JPG, PNG, WebP or PDF file.");
  if (file.size <= 0 || file.size > MAX_DOC_BYTES) throw new DomainError("invalid_input", "Files must be under 10 MB.");
  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${docPrefix(auth.uid)}${randomUUID()}.${ext}`;
  await getPrivateStorage().upload(path, new Uint8Array(await file.arrayBuffer()), file.type);
  return { path };
}

export async function submitVerification(
  repos: Repositories,
  auth: AuthUser,
  body: { kind?: unknown; subjectId?: unknown; files?: unknown; documentType?: unknown; expiresAt?: unknown },
) {
  await assertActive(repos, auth);
  requireVerifiedEmail(auth);
  const kind = body.kind as VerificationKind;
  if (!VERIFICATION_KINDS.includes(kind)) throw new DomainError("invalid_input", "Unknown document type.");
  const files = Array.isArray(body.files) ? (body.files as unknown[]).filter((f): f is string => typeof f === "string").slice(0, 4) : [];
  if (!files.length) throw new DomainError("invalid_input", "Attach at least one file.", { files: "required" });
  if (files.some((f) => !f.startsWith(docPrefix(auth.uid)))) throw new DomainError("forbidden", "Invalid file reference.");

  // Check each stored object exists, is an allowed type and is a sensible size.
  const storage = getPrivateStorage();
  for (const f of files) {
    const st = await storage.stat(f);
    if (!st) throw new DomainError("invalid_input", "A file wasn't uploaded. Try again.");
    if (st.size > MAX_DOC_BYTES || (st.contentType && !DOC_TYPES.includes(st.contentType))) {
      throw new DomainError("invalid_input", "Files must be a JPG, PNG, WebP or PDF under 10 MB.");
    }
  }

  let subjectId = auth.uid;
  let expiresAt: number | null = null;
  if (kind !== "kyc") {
    subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
    const p = subjectId ? await repos.properties.get(subjectId) : null;
    if (!p || p.ownerId !== auth.uid) throw new DomainError("forbidden", "That isn't your listing.");
    if (kind.startsWith("noc_")) {
      expiresAt = Number(body.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) throw new DomainError("invalid_input", "Enter a future NOC expiry date.", { expiresAt: "invalid" });
    }
  }
  const documentType = kind === "kyc" ? (body.documentType === "pan" ? "pan" : "aadhaar") : null;
  const now = Date.now();
  const id = verificationId(subjectId, kind);
  await verStore(repos).set(id, {
    kind, subjectId, ownerId: auth.uid, status: "pending", files, documentType, expiresAt,
    reviewerId: null, reviewNote: null, submittedAt: now, reviewedAt: null,
  });
  if (kind === "kyc") await patchMeta(repos, auth.uid, { kyc: "pending" });
  return { id, status: "pending" as const };
}

export async function myVerifications(repos: Repositories, auth: AuthUser) {
  const rows = await verStore(repos).query({ where: [["ownerId", "==", auth.uid]], orderBy: ["submittedAt", "desc"], limit: 50 });
  // Files are private storage keys: never echo them back to clients.
  return rows.map(({ files: _f, ...rest }) => rest);
}

/** Public safety badge for one listing. */
export async function getSafety(repos: Repositories, propertyId: string) {
  return safetyBadge(await safetyStore(repos).get(propertyId), Date.now());
}

/** Batched badge lookup for lists: one getAll, not N reads. */
export async function getSafetyMany(repos: Repositories, ids: string[]) {
  if (!ids.length) return {};
  const rows = await safetyStore(repos).getMany(ids);
  return Object.fromEntries(rows.map((s) => [s.id, safetyBadge(s, Date.now())]));
}

/** Result cards with their safety facts, from one batched read. */
export async function cardsWithSafety(repos: Repositories, list: Property[]): Promise<PropertyCard[]> {
  const safety = await getSafetyMany(repos, list.map((p) => p.id));
  return list.map((p) => toCard(p, safety[p.id] ?? null));
}

/** Ids of every listing with a current Women-First verification (one range query). */
export async function womenFirstIds(repos: Repositories): Promise<Set<string>> {
  const rows = await safetyStore(repos).query({ where: [["womenFirstUntil", ">", Date.now()]], limit: 2000 });
  return new Set(rows.filter((s) => !s.hidden).map((s) => s.id));
}

/* ------------------------------------------------------------------ admin */

export async function reviewQueue(repos: Repositories, auth: AuthUser, opts: { kind?: unknown; after?: unknown }) {
  await requireAdmin(repos, auth);
  const where: [string, "==", unknown][] = [["status", "==", "pending"]];
  if (typeof opts.kind === "string" && VERIFICATION_KINDS.includes(opts.kind as VerificationKind)) where.push(["kind", "==", opts.kind]);
  const after = Number(opts.after);
  const rows = await verStore(repos).query({ where, orderBy: ["submittedAt", "asc"], limit: 30, after: after > 0 ? after : undefined });
  // Files are private: admins get 5-minute signed URLs, never the bare keys.
  const storage = getPrivateStorage();
  const items = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      files: await Promise.all(r.files.map((f) => (storage.signedUrl ? storage.signedUrl(f, 300) : Promise.resolve(f)))),
    })),
  );
  return { items, next: rows.length === 30 ? rows[rows.length - 1].submittedAt : null };
}

export async function reviewVerification(
  repos: Repositories,
  auth: AuthUser,
  id: string,
  body: { decision?: unknown; note?: unknown; expiresAt?: unknown },
) {
  await requireAdmin(repos, auth);
  const approve = body.decision === "approve";
  if (!approve && body.decision !== "reject") throw new DomainError("invalid_input", "Choose approve or reject.");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;
  if (!approve && !note) throw new DomainError("invalid_input", "Give a reason for rejecting.", { note: "required" });

  const now = Date.now();
  const v = await verStore(repos).get(id);
  if (!v) throw new DomainError("not_found", "Submission not found.");
  if (v.status !== "pending") throw new DomainError("conflict", "Already reviewed.");
  const expiresAt = body.expiresAt !== undefined ? Number(body.expiresAt) : v.expiresAt;

  await verStore(repos).merge(id, { status: approve ? "approved" : "rejected", reviewerId: auth.uid, reviewNote: note, reviewedAt: now, expiresAt });

  if (approve) {
    if (v.kind === "kyc") {
      await patchMeta(repos, v.ownerId, { kyc: "verified" });
      // Mark every listing of this owner as owner-verified (denormalised for cheap badge reads).
      for (const p of await repos.properties.listByOwner(v.ownerId)) {
        await safetyStore(repos).merge(p.id, { ...base(p.id, now), ownerKycVerified: true });
      }
    } else if (v.kind === "photos") {
      await safetyStore(repos).merge(v.subjectId, { ...base(v.subjectId, now), photosVerified: true });
    } else {
      const field = v.kind.replace("noc_", "");
      await safetyStore(repos).merge(v.subjectId, { ...base(v.subjectId, now), [`noc`]: { ...(await currentNoc(repos, v.subjectId, now)), [field]: expiresAt } });
    }
  } else if (v.kind === "kyc") {
    await patchMeta(repos, v.ownerId, { kyc: "rejected" });
  }
  await audit(repos, { actorId: auth.uid, action: `verification.${approve ? "approve" : "reject"}`, targetType: v.kind, targetId: v.subjectId, before: v.status, after: approve ? "approved" : "rejected", note });
  await notify(repos, { userId: v.ownerId, type: "verification", title: `${v.kind.toUpperCase()} ${approve ? "approved" : "rejected"}`, body: note ?? "Your document was verified.", href: "/owner/verification" });
  return { ok: true };
}

const base = (_propertyId: string, now: number) => ({ updatedAt: now });
async function currentNoc(repos: Repositories, propertyId: string, now: number) {
  return { ...emptySafety(propertyId, now).noc, ...(await safetyStore(repos).get(propertyId))?.noc };
}

/** Enter, publish or unpublish the health score. Score changes are audit-logged. */
export async function setHealthScore(
  repos: Repositories,
  auth: AuthUser,
  propertyId: string,
  body: { score?: unknown; publish?: unknown; note?: unknown },
) {
  await requireAdmin(repos, auth);
  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new DomainError("invalid_input", "Score must be a whole number from 0 to 100.", { score: "invalid" });
  const now = Date.now();
  const before = (await safetyStore(repos).get(propertyId)) ?? emptySafety(propertyId, now);
  const publish = body.publish === true;
  await safetyStore(repos).merge(propertyId, { ...base(propertyId, now), healthScore: score, healthPublished: publish });
  await audit(repos, {
    actorId: auth.uid, action: "health_score.set", targetType: "property", targetId: propertyId,
    before: { score: before.healthScore, published: before.healthPublished }, after: { score, published: publish },
    note: typeof body.note === "string" ? body.note.slice(0, 300) : null,
  });
  return { ok: true };
}

/** Record the Women-First site checks. Ticking all three starts a fresh validity window. */
export async function setWomenFirst(
  repos: Repositories,
  auth: AuthUser,
  propertyId: string,
  body: Record<string, unknown>,
) {
  await requireAdmin(repos, auth);
  if (!(await repos.properties.get(propertyId))) throw new DomainError("not_found", "Listing not found.");
  const now = Date.now();
  const before = (await safetyStore(repos).get(propertyId))?.womenFirst ?? emptyWomenFirst();
  const checks = Object.fromEntries(WOMEN_FIRST_CHECKS.map((k) => [k, body[k] === true])) as Record<(typeof WOMEN_FIRST_CHECKS)[number], boolean>;
  const womenFirst = { ...checks, verifiedAt: now };
  await safetyStore(repos).merge(propertyId, { ...base(propertyId, now), womenFirst, womenFirstUntil: womenFirstUntil(womenFirst) });
  await audit(repos, {
    actorId: auth.uid, action: "women_first.set", targetType: "property", targetId: propertyId,
    before, after: womenFirst, note: typeof body.note === "string" ? body.note.slice(0, 300) : null,
  });
  return { ok: true };
}

/** Hide (or restore) a listing. A hidden listing is paused and the owner can't resume it. */
export async function moderateListing(
  repos: Repositories,
  auth: AuthUser,
  propertyId: string,
  body: { hide?: unknown; reason?: unknown },
) {
  await requireAdmin(repos, auth);
  const p = await repos.properties.get(propertyId);
  if (!p) throw new DomainError("not_found", "Listing not found.");
  const hide = body.hide === true;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  if (hide && !reason) throw new DomainError("invalid_input", "Give a reason.", { reason: "required" });
  const now = Date.now();
  await safetyStore(repos).merge(propertyId, { ...base(propertyId, now), hidden: hide, hiddenReason: hide ? reason : null });
  if (hide && p.status === "active") await repos.properties.update(propertyId, { status: "paused", updatedAt: new Date(now) });
  await audit(repos, { actorId: auth.uid, action: hide ? "listing.hide" : "listing.restore", targetType: "property", targetId: propertyId, before: p.status, after: hide ? "hidden" : "visible", note: reason || null });
  if (hide) await notify(repos, { userId: p.ownerId, type: "case_update", title: "Your listing was hidden", body: reason, href: "/my-listings" });
  return { ok: true };
}

/** Throws if an admin has hidden this listing (used before an owner resumes/reposts it). */
export async function assertNotHidden(repos: Repositories, propertyId: string) {
  if ((await safetyStore(repos).get(propertyId))?.hidden) {
    throw new DomainError("forbidden", "This listing was hidden by EasyStay. Contact the grievance officer.");
  }
}

export async function adminListing(repos: Repositories, auth: AuthUser, id: string) {
  await requireAdmin(repos, auth);
  const p = await repos.properties.get(id);
  if (!p) throw new DomainError("not_found", "Listing not found.");
  const [safety, owner] = await Promise.all([safetyStore(repos).get(id), repos.users.get(p.ownerId)]);
  return {
    id: p.id, title: p.title, type: p.type, status: p.status, rent: p.rent,
    city: p.location.city, locality: p.location.locality, ownerId: p.ownerId,
    ownerName: owner?.displayName ?? null, ownerEmail: owner?.email ?? null,
    photo: p.photos[0]?.url ?? null,
    safety: safety
      ? { ...emptySafety(id, 0), ...safety, noc: { ...emptySafety(id, 0).noc, ...safety.noc }, womenFirst: { ...emptyWomenFirst(), ...safety.womenFirst } }
      : emptySafety(id, 0),
  };
}

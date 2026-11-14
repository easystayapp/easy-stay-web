/**
 * Enquiries, visit slots and chat.
 *
 * Reads: the inbox is one indexed query on the denormalised `enquiries` row;
 * a thread is one doc read plus one paged messages query.
 * Writes: sending a message is one set + one atomic merge with increments (no read-modify-write).
 * State changes (accept/decline/visit) go through a single-document transaction.
 */
import { randomUUID } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import { formatVisit } from "@/lib/domain/format";
import { effectiveStatus } from "@/lib/domain/listing";
import {
  MAX_MESSAGE_LENGTH,
  MAX_VISIT_AHEAD_DAYS,
  OWNER_TRANSITIONS,
  enquiryId,
  type Enquiry,
  type EnquiryStatus,
  type Message,
  type PropertySafety,
  type Visit,
} from "@/lib/domain/ops";
import type { AuthUser } from "../../auth";
import { PATHS, inc, type Repositories } from "../../repositories";
import { assertActive, notify, requireVerifiedEmail } from "./guard";

type Side = "seeker" | "owner";
const store = (r: Repositories) => r.docs<Enquiry>(PATHS.enquiries);
const sideOf = (e: Enquiry, uid: string): Side => {
  if (e.seekerId === uid) return "seeker";
  if (e.ownerId === uid) return "owner";
  throw new DomainError("forbidden", "This conversation isn't yours.");
};

async function load(repos: Repositories, id: string, uid: string) {
  const e = await store(repos).get(id);
  if (!e) throw new DomainError("not_found", "Conversation not found.");
  return { e, side: sideOf(e, uid) };
}

/** Hides phone numbers and UPI ids until the owner has accepted. */
const PHONE = /(?:\+?\d[\s-]?){9,13}\d/g;
const UPI = /[\w.-]{2,}@[a-z]{2,}/gi;
export const maskContacts = (t: string) => t.replace(PHONE, "[number hidden]").replace(UPI, "[id hidden]");

function cleanText(raw: unknown, required = true): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (required && !t) throw new DomainError("invalid_input", "Write a message.", { text: "required" });
  if (t.length > MAX_MESSAGE_LENGTH) throw new DomainError("invalid_input", `Keep it under ${MAX_MESSAGE_LENGTH} characters.`, { text: "too_long" });
  return t;
}

function checkVisitTime(at: unknown, now: number): number {
  if (typeof at !== "number" || !Number.isFinite(at)) throw new DomainError("invalid_input", "Pick a visit time.", { visitAt: "invalid" });
  if (at < now + 30 * 60_000) throw new DomainError("invalid_input", "Pick a time at least 30 minutes from now.", { visitAt: "past" });
  if (at > now + MAX_VISIT_AHEAD_DAYS * 86_400_000) throw new DomainError("invalid_input", `Pick a day within ${MAX_VISIT_AHEAD_DAYS} days.`, { visitAt: "too_far" });
  return at;
}

/** Keeps message ids in send order even within one millisecond (per process). */
let seq = 0;

/** Appends a message and bumps the inbox summary + the other side's unread counter, atomically. */
async function append(repos: Repositories, e: Enquiry, side: Side | "system", senderId: string, text: string, extra: Record<string, unknown> = {}) {
  const at = Date.now();
  const id = `${String(at).padStart(14, "0")}_${String(seq++ % 10_000).padStart(4, "0")}_${randomUUID().slice(0, 4)}`;
  const msg: Omit<Message, "id"> = { senderId, side, text, at };
  const other = side === "seeker" ? "unreadOwner" : side === "owner" ? "unreadSeeker" : null;
  await repos.batch([
    { op: "set", path: PATHS.messages(e.id), id, data: msg },
    {
      op: "merge",
      path: PATHS.enquiries,
      id: e.id,
      data: {
        lastMessage: text.slice(0, 140),
        lastMessageAt: at,
        lastSender: side,
        updatedAt: at,
        ...(other ? { [other]: inc(1) } : { unreadOwner: inc(1), unreadSeeker: inc(1) }),
        ...extra,
      },
    },
  ]);
}

/* ------------------------------------------------------------- send enquiry */

export async function sendEnquiry(
  repos: Repositories,
  auth: AuthUser,
  body: { propertyId?: unknown; message?: unknown; visitAt?: unknown },
) {
  await assertActive(repos, auth);
  requireVerifiedEmail(auth);
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const property = propertyId ? await repos.properties.get(propertyId) : null;
  const now = Date.now();
  if (!property || effectiveStatus(property, new Date(now)) !== "active") throw new DomainError("not_found", "This listing isn't available.");
  if (property.ownerId === auth.uid) throw new DomainError("forbidden", "You can't enquire about your own listing.");
  const safety = await repos.docs<PropertySafety & { id: string }>(PATHS.safety).get(propertyId);
  if (safety?.hidden) throw new DomainError("not_found", "This listing isn't available.");

  const text = cleanText(body.message, false) || "Hi, is this still available?";
  const visitAt = body.visitAt === undefined || body.visitAt === null ? null : checkVisitTime(body.visitAt, now);
  const id = enquiryId(propertyId, auth.uid);
  const owner = await repos.users.get(property.ownerId);
  const seeker = await repos.users.get(auth.uid);

  const visit: Visit | null = visitAt ? { at: visitAt, status: "requested", by: "seeker", note: null, updatedAt: now } : null;
  const created = await store(repos).create(id, {
    propertyId,
    ownerId: property.ownerId,
    seekerId: auth.uid,
    status: "open",
    visit,
    propertyTitle: property.title,
    propertyThumb: property.photos[0]?.url ?? null,
    seekerName: (seeker?.displayName || auth.name || "Seeker").split(" ")[0],
    ownerName: (owner?.displayName || "Owner").split(" ")[0],
    lastMessage: "",
    lastMessageAt: now,
    lastSender: "seeker",
    unreadSeeker: 0,
    unreadOwner: 0,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const e = (await store(repos).get(id))!;
  if (!created && (e.status === "declined" || e.status === "closed")) {
    throw new DomainError("conflict", "The owner has closed this conversation.");
  }
  await append(repos, e, "seeker", auth.uid, e.acceptedAt ? text : maskContacts(text), created ? {} : visit ? { visit } : {});
  if (created || visit) {
    await notify(repos, {
      userId: property.ownerId,
      type: "new_enquiry",
      title: `New enquiry for ${property.title}`,
      body: visit ? "A visit time was requested." : text.slice(0, 80),
      href: `/inbox/${id}`,
    });
  }
  return { id, created };
}

/* ------------------------------------------------------------------- inbox */

export async function listInbox(
  repos: Repositories,
  auth: AuthUser,
  opts: { as: unknown; after?: unknown; status?: unknown },
) {
  const side: Side = opts.as === "owner" ? "owner" : "seeker";
  const where: [string, "==", unknown][] = [[side === "owner" ? "ownerId" : "seekerId", "==", auth.uid]];
  if (typeof opts.status === "string") where.push(["status", "==", opts.status]);
  const after = Number(opts.after);
  const rows = await store(repos).query({
    where,
    orderBy: ["lastMessageAt", "desc"],
    limit: 30,
    after: Number.isFinite(after) && after > 0 ? after : undefined,
  });
  return {
    items: rows.map((e) => ({
      ...e,
      unread: side === "owner" ? e.unreadOwner : e.unreadSeeker,
      counterpart: side === "owner" ? e.seekerName : e.ownerName,
    })),
    next: rows.length === 30 ? rows[rows.length - 1].lastMessageAt : null,
  };
}

/* ------------------------------------------------------------------ thread */

export async function getThread(repos: Repositories, auth: AuthUser, id: string) {
  const { e, side } = await load(repos, id, auth.uid);
  // Contact numbers are revealed to the seeker only after the owner accepts.
  let contact: { name: string; phone: string | null; whatsapp: string | null } | null = null;
  if (e.acceptedAt) {
    if (side === "seeker") {
      const p = await repos.properties.get(e.propertyId);
      contact = p ? { name: e.ownerName, phone: p.contact.phone, whatsapp: p.contact.whatsapp ?? p.contact.phone } : null;
    } else {
      const u = await repos.users.get(e.seekerId);
      contact = { name: e.seekerName, phone: u?.phone ?? null, whatsapp: u?.phone ?? null };
    }
  }
  const unreadKey = side === "owner" ? "unreadOwner" : "unreadSeeker";
  if (e[unreadKey] > 0) await store(repos).merge(id, { [unreadKey]: 0 });
  return { enquiry: { ...e, [unreadKey]: 0 }, side, contact };
}

export async function listMessages(repos: Repositories, auth: AuthUser, id: string, before?: unknown) {
  await load(repos, id, auth.uid);
  const rows = await repos.docs<Message>(PATHS.messages(id)).query({
    orderBy: ["at", "desc"],
    limit: 30,
    after: Number.isFinite(Number(before)) && Number(before) > 0 ? Number(before) : undefined,
  });
  return { items: rows.reverse(), next: rows.length === 30 ? rows[0].at : null };
}

export async function postMessage(repos: Repositories, auth: AuthUser, id: string, textRaw: unknown) {
  await assertActive(repos, auth);
  const { e, side } = await load(repos, id, auth.uid);
  if (e.status === "declined" || e.status === "closed") throw new DomainError("conflict", "This conversation is closed.");
  const text = cleanText(textRaw);
  await append(repos, e, side, auth.uid, e.acceptedAt ? text : maskContacts(text));
  await notify(repos, {
    userId: side === "owner" ? e.seekerId : e.ownerId,
    type: "new_message",
    title: `${side === "owner" ? e.ownerName : e.seekerName} · ${e.propertyTitle}`,
    body: text.slice(0, 80),
    href: `/inbox/${id}`,
  });
  return { ok: true };
}

/* ------------------------------------------------- accept / decline / visit */

type Action = "accept" | "decline" | "close" | "reschedule" | "propose";

/**
 * One entry point for state changes, run in a document transaction so two
 * simultaneous taps can't leave an inconsistent state.
 *  - owner: accept | decline | close | reschedule(visitAt)
 *  - seeker: propose(visitAt) | accept (confirms an owner reschedule) | decline (cancels)
 */
export async function act(repos: Repositories, auth: AuthUser, id: string, body: { action?: unknown; visitAt?: unknown; note?: unknown }) {
  await assertActive(repos, auth);
  const { e: current, side } = await load(repos, id, auth.uid);
  const action = body.action as Action;
  const now = Date.now();
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;

  const outcome = await store(repos).update(id, (cur) => {
    if (!cur) throw new DomainError("not_found", "Conversation not found.");
    const rest: Partial<Enquiry> = { ...cur };
    delete rest.id;
    const next = { ...rest, updatedAt: now } as Omit<Enquiry, "id">;
    let system = "";

    if (side === "owner" && (action === "accept" || action === "decline" || action === "close")) {
      const to: EnquiryStatus = action === "accept" ? "accepted" : action === "decline" ? "declined" : "closed";
      if (!OWNER_TRANSITIONS[cur.status].includes(to)) throw new DomainError("conflict", `You can't ${action} this enquiry now.`);
      next.status = to;
      if (to === "accepted") {
        next.acceptedAt = now;
        if (cur.visit?.status === "requested") next.visit = { ...cur.visit, status: "confirmed", by: "owner", updatedAt: now };
      }
      if (to === "declined" && cur.visit && ["requested", "rescheduled"].includes(cur.visit.status)) {
        next.visit = { ...cur.visit, status: "declined", by: "owner", note, updatedAt: now };
      }
      system = to === "accepted" ? "Enquiry accepted. Contact numbers are now shared." : to === "declined" ? "The owner declined this enquiry." : "The owner closed this conversation.";
    } else if (action === "reschedule" || action === "propose") {
      if (cur.status === "declined" || cur.status === "closed") throw new DomainError("conflict", "This conversation is closed.");
      if ((action === "reschedule") !== (side === "owner")) throw new DomainError("forbidden", "That action isn't available to you.");
      const at = checkVisitTime(body.visitAt, now);
      next.visit = { at, status: side === "owner" ? "rescheduled" : "requested", by: side, note, updatedAt: now };
      system = `${side === "owner" ? "Owner suggested a visit on" : "Visit requested for"} ${formatVisit(at)}.`;
    } else if (side === "seeker" && cur.visit?.status === "rescheduled" && (action === "accept" || action === "decline")) {
      next.visit = { ...cur.visit, status: action === "accept" ? "confirmed" : "cancelled", by: "seeker", updatedAt: now };
      if (action === "accept") {
        next.status = "accepted";
        next.acceptedAt = cur.acceptedAt ?? now;
      }
      system = action === "accept" ? "Visit time confirmed." : "Visit cancelled.";
    } else {
      throw new DomainError("invalid_input", "Unknown action.");
    }
    return { next, result: { system, enquiry: { id, ...next } } };
  });

  await append(repos, current, "system", auth.uid, outcome.system, {});
  await notify(repos, {
    userId: side === "owner" ? current.seekerId : current.ownerId,
    type: "visit_update",
    title: current.propertyTitle,
    body: outcome.system,
    href: `/inbox/${id}`,
  });
  return outcome.enquiry;
}

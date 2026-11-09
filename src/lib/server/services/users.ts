import type { Me, OwnerSettingsUpdate, ProfileUpdate } from "@/types/api";
import { DomainError } from "@/lib/domain/errors";
import { normalizeIndianMobile } from "@/lib/domain/format";
import { CONTACT_METHODS, type OwnerSettings, type User } from "@/lib/domain/types";
import type { AuthUser } from "../auth";
import type { Repositories } from "../repositories";
import { toMe } from "./mappers";

/** uid|phone pairs already synced in this process, to skip repeat reads. */
const synced = new Set<string>();

/**
 * Creates the account on first sign-in and keeps the verified phone in sync
 * with the auth provider (e.g. after linking a number for owner tools).
 */
export async function ensureUser(repos: Repositories, auth: AuthUser): Promise<void> {
  const key = `${auth.uid}|${auth.phone ?? ""}`;
  if (synced.has(key)) return;
  const now = new Date();
  const user = await repos.users.createIfMissing({
    id: auth.uid,
    displayName: auth.name?.trim() || "",
    email: auth.email,
    phone: auth.phone,
    photoUrl: auth.picture,
    owner: null,
    createdAt: now,
    updatedAt: now,
  });
  if (user.phone !== auth.phone && auth.phone) {
    await repos.users.update(auth.uid, { phone: auth.phone, updatedAt: now });
  }
  synced.add(key);
}

export async function getUser(repos: Repositories, auth: AuthUser): Promise<User> {
  const user = await repos.users.get(auth.uid);
  if (!user) throw new DomainError("unauthenticated", "Please log in again.");
  return user;
}

export async function requireOwner(repos: Repositories, auth: AuthUser): Promise<User & { owner: OwnerSettings }> {
  const user = await getUser(repos, auth);
  if (!user.owner?.enabled) {
    throw new DomainError("forbidden", "Turn on owner tools to manage listings.");
  }
  return user as User & { owner: OwnerSettings };
}

export async function getMe(repos: Repositories, auth: AuthUser): Promise<Me> {
  const [user, saved] = await Promise.all([getUser(repos, auth), repos.saved.listByUser(auth.uid)]);
  return toMe(user, saved.length);
}

export async function updateProfile(repos: Repositories, auth: AuthUser, body: ProfileUpdate): Promise<Me> {
  const name = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 60) : undefined;
  if (name !== undefined) {
    if (name.length < 2) throw new DomainError("invalid_input", "Enter your name.", { displayName: "required" });
    await repos.users.update(auth.uid, { displayName: name, updatedAt: new Date() });
  }
  return getMe(repos, auth);
}

/**
 * Owner tools turn on only for a verified mobile number. The number comes
 * from the auth provider's verified claim, never from the request body.
 */
export async function enableOwnerTools(repos: Repositories, auth: AuthUser): Promise<Me> {
  if (!auth.phone) {
    throw new DomainError("not_eligible", "Verify your mobile number to turn on owner tools.");
  }
  const user = await getUser(repos, auth);
  const now = new Date();
  const owner: OwnerSettings = {
    contactMethod: "both",
    whatsappPhone: null,
    greeting: null,
    notify: { expiryReminders: true, newRating: true, weeklySummary: false },
    ...user.owner,
    enabled: true,
    enabledAt: user.owner?.enabledAt ?? now,
    contactPhone: auth.phone,
  };
  await repos.users.update(auth.uid, { owner, phone: auth.phone, updatedAt: now });
  return getMe(repos, auth);
}

/** Turning owner tools off pauses every live listing (they can be resumed later). */
export async function disableOwnerTools(repos: Repositories, auth: AuthUser): Promise<Me> {
  const user = await getUser(repos, auth);
  if (!user.owner) return getMe(repos, auth);
  const now = new Date();
  const listings = await repos.properties.listByOwner(auth.uid);
  await Promise.all(
    listings
      .filter((p) => p.status === "active" && (!p.expiresAt || p.expiresAt > now))
      .map((p) => repos.properties.update(p.id, { status: "paused", updatedAt: now })),
  );
  await repos.users.update(auth.uid, { owner: { ...user.owner, enabled: false }, updatedAt: now });
  return getMe(repos, auth);
}

export async function updateOwnerSettings(
  repos: Repositories,
  auth: AuthUser,
  body: OwnerSettingsUpdate,
): Promise<Me> {
  const user = await requireOwner(repos, auth);
  const next: OwnerSettings = { ...user.owner, notify: { ...user.owner.notify } };

  if (body.whatsappPhone !== undefined) {
    if (body.whatsappPhone === null || body.whatsappPhone === "") next.whatsappPhone = null;
    else {
      const n = normalizeIndianMobile(body.whatsappPhone);
      if (!n) throw new DomainError("invalid_input", "Enter a valid WhatsApp number.", { whatsappPhone: "invalid" });
      next.whatsappPhone = n === next.contactPhone ? null : n;
    }
  }
  if (body.contactMethod !== undefined) {
    if (!CONTACT_METHODS.includes(body.contactMethod)) throw new DomainError("invalid_input", "Choose a contact method.");
    next.contactMethod = body.contactMethod;
  }
  if (body.greeting !== undefined) {
    const g = (body.greeting ?? "").trim().slice(0, 500);
    next.greeting = g || null;
  }
  if (body.notify) {
    for (const k of ["expiryReminders", "newRating", "weeklySummary"] as const) {
      if (typeof body.notify[k] === "boolean") next.notify[k] = body.notify[k]!;
    }
  }
  await repos.users.update(auth.uid, { owner: next, updatedAt: new Date() });
  return getMe(repos, auth);
}

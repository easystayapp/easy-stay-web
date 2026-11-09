/**
 * Listing lifecycle rules. Every listing is live for LISTING_DAYS; owners
 * get reminders before it ends and can repost in one tap, keeping views and
 * ratings (no duplicate listing).
 */
import { LISTING_DAYS, REMINDER_DAYS_BEFORE } from "./catalog";
import { DomainError } from "./errors";
import { addDays, DAY_MS } from "./time";
import type { ListingStatus, Property } from "./types";

type Lifecycle = Pick<Property, "status" | "expiresAt" | "publishedAt" | "availabilityConfirmedAt">;

export function effectiveStatus(p: Pick<Property, "status" | "expiresAt">, now = new Date()): ListingStatus {
  if (p.status === "active" && p.expiresAt && p.expiresAt.getTime() <= now.getTime()) return "expired";
  return p.status;
}

export function isPubliclyVisible(p: Pick<Property, "status" | "expiresAt">, now = new Date()): boolean {
  return effectiveStatus(p, now) === "active";
}

/** Whole days left before expiry (rounded up), or null when not live. */
export function daysLeft(p: Pick<Property, "status" | "expiresAt">, now = new Date()): number | null {
  if (effectiveStatus(p, now) !== "active" || !p.expiresAt) return null;
  return Math.max(0, Math.ceil((p.expiresAt.getTime() - now.getTime()) / DAY_MS));
}

/** 1-based day of the current listing period. */
export function listingDay(p: Pick<Property, "publishedAt">, now = new Date()): number | null {
  if (!p.publishedAt) return null;
  return Math.min(LISTING_DAYS, Math.floor((now.getTime() - p.publishedAt.getTime()) / DAY_MS) + 1);
}

export function newListingWindow(now = new Date()) {
  return { publishedAt: now, expiresAt: addDays(now, LISTING_DAYS) };
}

export const LISTING_ACTIONS = [
  "publish",
  "pause",
  "resume",
  "mark_rented",
  "repost",
  "confirm_available",
] as const;
export type ListingAction = (typeof LISTING_ACTIONS)[number];

/** Returns the field changes for an owner action, or throws if not allowed. */
export function applyListingAction(p: Lifecycle, action: ListingAction, now = new Date()): Partial<Property> {
  const status = effectiveStatus(p, now);
  const deny = (msg: string): never => {
    throw new DomainError("conflict", msg);
  };
  switch (action) {
    case "publish":
      if (status !== "draft") deny("Only drafts can be published.");
      return { status: "active", ...newListingWindow(now), availabilityConfirmedAt: null };
    case "pause":
      if (status !== "active") deny("Only live listings can be paused.");
      return { status: "paused" };
    case "resume":
      if (status !== "paused") deny("This listing is not paused.");
      if (!p.expiresAt || p.expiresAt.getTime() <= now.getTime()) {
        // The period ran out while paused: it becomes expired and needs a repost.
        return { status: "expired" };
      }
      return { status: "active" };
    case "mark_rented":
      if (!["active", "paused", "expired"].includes(status)) deny("This listing can't be marked as rented.");
      return { status: "rented" };
    case "repost":
      if (!["expired", "rented"].includes(status)) deny("Only expired or rented listings can be reposted.");
      return { status: "active", ...newListingWindow(now), availabilityConfirmedAt: null };
    case "confirm_available":
      if (status !== "active") deny("Only live listings can be confirmed.");
      return { availabilityConfirmedAt: now };
  }
}

/* ---------------------------------------------------------- reminders */

export type ReminderKind = "expiring" | "expires_tomorrow" | "expired";

export interface ListingReminder {
  id: string;
  kind: ReminderKind;
  propertyId: string;
  /** When the reminder became due. */
  at: Date;
  daysLeft: number;
}

/**
 * Reminders are derived from listing state rather than stored, so they are
 * always consistent and need no scheduler. A reminder is due once its time
 * has passed; "still available" answers dismiss the pre-expiry ones.
 */
export function listingReminders(
  p: Pick<Property, "id" | "status" | "expiresAt" | "availabilityConfirmedAt">,
  now = new Date(),
): ListingReminder[] {
  if (!p.expiresAt) return [];
  const status = effectiveStatus(p, now);
  if (status !== "active" && status !== "expired") return [];

  const out: ListingReminder[] = [];
  const exp = p.expiresAt.getTime();
  const confirmed = p.availabilityConfirmedAt?.getTime() ?? 0;
  for (const before of REMINDER_DAYS_BEFORE) {
    const at = exp - before * DAY_MS;
    if (now.getTime() < at) continue;
    if (confirmed >= at && status === "active") continue;
    out.push({
      id: `${p.id}:${before}`,
      kind: before === 1 ? "expires_tomorrow" : "expiring",
      propertyId: p.id,
      at: new Date(at),
      daysLeft: before,
    });
  }
  if (status === "expired") {
    out.push({ id: `${p.id}:expired`, kind: "expired", propertyId: p.id, at: new Date(exp), daysLeft: 0 });
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime());
}

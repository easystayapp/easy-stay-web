import type {
  EditableProperty,
  OwnerListingsResponse,
  PropertyDetail,
  PropertyStats,
  ReminderItem,
  SearchResponse,
  Suggestion,
} from "@/types/api";
import { DomainError } from "@/lib/domain/errors";
import { normalizeIndianMobile } from "@/lib/domain/format";
import {
  applyListingAction,
  daysLeft,
  effectiveStatus,
  isPubliclyVisible,
  LISTING_ACTIONS,
  listingDay,
  listingReminders,
  newListingWindow,
  type ListingAction,
} from "@/lib/domain/listing";
import { emptySummary } from "@/lib/domain/rating";
import {
  emptyFilters,
  matchesFilters,
  normalizeText,
  PAGE_SIZE,
  sortProperties,
  type SearchFilters,
} from "@/lib/domain/search";
import { popularLocalities, PROPERTY_TYPE_LABEL } from "@/lib/domain/catalog";
import { dayKey, dayKeysBetween, lastDayKeys, parseDayKey } from "@/lib/domain/time";
import type { ListingStatus, Property, PropertyType, User } from "@/lib/domain/types";
import { assertPropertyInput, type PropertyInput } from "@/lib/domain/validation";
import type { AuthUser } from "../auth";
import { getFileStorage, type Repositories } from "../repositories";
import { factorAverages, toCard, toDetail, toEditable, toInput, toOwnerListing } from "./mappers";
import { requireOwner } from "./users";

const CANDIDATE_LIMIT = 500;

/* -------------------------------------------------------------- public */

export async function searchProperties(repos: Repositories, filters: SearchFilters): Promise<SearchResponse> {
  const now = new Date();
  const candidates = await repos.properties.findCandidates(filters, CANDIDATE_LIMIT);
  const matched = sortProperties(
    candidates.filter((p) => matchesFilters(p, filters, now)),
    filters.sort,
  );
  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  return {
    items: matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toCard),
    total: matched.length,
    page,
    pageCount,
  };
}

export async function searchSuggestions(repos: Repositories, q: string, city: string): Promise<Suggestion[]> {
  const tokens = normalizeText(q);
  if (!tokens.length || tokens.join("").length < 2) return [];
  const matchesQ = (text: string) => {
    const words = normalizeText(text);
    return tokens.every((t) => words.some((w) => w.startsWith(t)));
  };

  const candidates = await repos.properties.findCandidates({ ...emptyFilters(city), q }, 100);
  const now = new Date();
  const counts = new Map<string, Set<PropertyType>>();
  for (const p of candidates) {
    if (!isPubliclyVisible(p, now) || !matchesQ(p.location.locality)) continue;
    const set = counts.get(p.location.locality) ?? new Set();
    set.add(p.type);
    counts.set(p.location.locality, set);
  }
  for (const l of popularLocalities(city)) if (matchesQ(l) && !counts.has(l)) counts.set(l, new Set());

  const out: Suggestion[] = [];
  const localities = [...counts.keys()].slice(0, 3);
  for (const l of localities) out.push({ kind: "locality", label: l, sub: `Locality · ${city}`, query: { q: l } });
  const top = localities[0];
  if (top) {
    const types = counts.get(top)!;
    for (const t of (types.size ? [...types] : (["pg", "flat"] as PropertyType[])).slice(0, 3)) {
      const noun = t === "pg" ? "PGs" : t === "room" ? "Rooms" : "Flats";
      out.push({ kind: "type", label: `${noun} in ${top}`, sub: `Property type · ${PROPERTY_TYPE_LABEL[t]}`, query: { q: top, type: t } });
    }
  }
  return out.slice(0, 6);
}

async function loadProperty(repos: Repositories, id: string): Promise<Property> {
  const p = await repos.properties.get(id);
  if (!p) throw new DomainError("not_found", "This property no longer exists.");
  return p;
}

export async function getPropertyDetail(
  repos: Repositories,
  id: string,
  auth: AuthUser | null,
): Promise<PropertyDetail> {
  const p = await loadProperty(repos, id);
  const isOwner = auth?.uid === p.ownerId;
  if (!isOwner && !isPubliclyVisible(p)) {
    throw new DomainError("not_found", "This property is no longer available. It may have been rented or expired.");
  }
  const owner = await repos.users.get(p.ownerId);
  return toDetail(p, owner, auth?.uid ?? null);
}

/** One view per person (or device) per day; owners viewing their own listing don't count. */
export async function recordView(
  repos: Repositories,
  id: string,
  auth: AuthUser | null,
  deviceId: unknown,
): Promise<{ counted: boolean }> {
  const p = await loadProperty(repos, id);
  if (!isPubliclyVisible(p) || auth?.uid === p.ownerId) return { counted: false };
  let viewer: string;
  if (auth) viewer = `u:${auth.uid}`;
  else if (typeof deviceId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(deviceId)) viewer = `d:${deviceId}`;
  else return { counted: false };
  const now = new Date();
  return { counted: await repos.views.recordUnique(p.id, viewer, dayKey(now), now) };
}

/* --------------------------------------------------------------- owner */

async function loadOwned(repos: Repositories, auth: AuthUser, id: string) {
  const owner = await requireOwner(repos, auth);
  const p = await loadProperty(repos, id);
  if (p.ownerId !== auth.uid) throw new DomainError("forbidden", "You can only manage your own listings.");
  return { owner, p };
}

function buildFields(input: PropertyInput, owner: User & { owner: NonNullable<User["owner"]> }) {
  return {
    type: input.type,
    sharing: input.sharing,
    title: input.title,
    rent: input.rent ?? 0,
    deposit: input.deposit,
    location: { city: input.city, locality: input.locality, address: input.address, geo: input.geo },
    photos: input.photos,
    availableFor: input.availableFor,
    contact: { phone: owner.owner.contactPhone, whatsapp: input.whatsapp ? normalizeIndianMobile(input.whatsapp) : null },
    furnishing: input.furnishing,
    food: input.food,
    amenities: input.amenities,
    electricity: input.electricity,
    availableFrom: input.availableFrom ? parseDayKey(input.availableFrom) : null,
    description: input.description,
  } satisfies Partial<Property>;
}

/** Photos must have been uploaded by this owner. */
function assertOwnPhotos(input: PropertyInput, ownerId: string) {
  if (input.photos.some((ph) => !ph.path.startsWith(`property-photos/${ownerId}/`))) {
    throw new DomainError("invalid_input", "Upload photos from this device.", { photos: "invalid" });
  }
}

async function deletePhotos(paths: string[]) {
  const storage = getFileStorage();
  await Promise.allSettled(paths.map((p) => storage.delete(p)));
}

export async function createProperty(
  repos: Repositories,
  auth: AuthUser,
  body: unknown,
  publish: boolean,
): Promise<EditableProperty> {
  const owner = await requireOwner(repos, auth);
  const input = assertPropertyInput(body, publish ? "publish" : "draft");
  assertOwnPhotos(input, auth.uid);
  const now = new Date();
  const p = await repos.properties.create({
    ownerId: auth.uid,
    ...buildFields(input, owner),
    status: publish ? "active" : "draft",
    ...(publish ? newListingWindow(now) : { publishedAt: null, expiresAt: null }),
    availabilityConfirmedAt: null,
    viewCount: 0,
    ratingSummary: emptySummary(),
    createdAt: now,
    updatedAt: now,
  });
  return toEditable(p, now);
}

export async function getEditableProperty(repos: Repositories, auth: AuthUser, id: string): Promise<EditableProperty> {
  const { p } = await loadOwned(repos, auth, id);
  return toEditable(p);
}

export async function updateProperty(
  repos: Repositories,
  auth: AuthUser,
  id: string,
  body: unknown,
): Promise<EditableProperty> {
  const { owner, p } = await loadOwned(repos, auth, id);
  const input = assertPropertyInput(body, p.status === "draft" ? "draft" : "publish");
  assertOwnPhotos(input, auth.uid);
  const fields = buildFields(input, owner);
  const now = new Date();
  await repos.properties.update(id, { ...fields, updatedAt: now });
  const kept = new Set(input.photos.map((x) => x.path));
  await deletePhotos(p.photos.map((x) => x.path).filter((path) => !kept.has(path)));
  return toEditable({ ...p, ...fields, updatedAt: now });
}

export async function deleteProperty(repos: Repositories, auth: AuthUser, id: string): Promise<void> {
  const { p } = await loadOwned(repos, auth, id);
  await repos.properties.delete(id);
  await deletePhotos(p.photos.map((x) => x.path));
}

export async function applyAction(
  repos: Repositories,
  auth: AuthUser,
  id: string,
  action: unknown,
): Promise<EditableProperty> {
  if (!LISTING_ACTIONS.includes(action as ListingAction)) {
    throw new DomainError("invalid_input", "Unknown action.");
  }
  const { p } = await loadOwned(repos, auth, id);
  const now = new Date();
  if (action === "publish") {
    // A draft must be complete before going live.
    assertPropertyInput(toInput(p), "publish");
  }
  const patch = applyListingAction(p, action as ListingAction, now);
  await repos.properties.update(id, { ...patch, updatedAt: now });
  return toEditable({ ...p, ...patch, updatedAt: now }, now);
}

/** Persists the derived `expired` status so stored data stays truthful. */
async function settleExpired(repos: Repositories, items: Property[], now: Date) {
  const stale = items.filter((p) => p.status === "active" && effectiveStatus(p, now) === "expired");
  await Promise.all(stale.map((p) => repos.properties.update(p.id, { status: "expired" })));
}

export async function listOwnerListings(repos: Repositories, auth: AuthUser): Promise<OwnerListingsResponse> {
  const owner = await requireOwner(repos, auth);
  const now = new Date();
  const items = await repos.properties.listByOwner(auth.uid);
  await settleExpired(repos, items, now);

  const counts: OwnerListingsResponse["counts"] = { total: items.length, draft: 0, active: 0, paused: 0, rented: 0, expired: 0 };
  for (const p of items) counts[effectiveStatus(p, now)] += 1;

  const order: Record<ListingStatus, number> = { active: 0, draft: 1, paused: 2, expired: 3, rented: 4 };
  const sorted = [...items].sort(
    (a, b) =>
      order[effectiveStatus(a, now)] - order[effectiveStatus(b, now)] ||
      b.updatedAt.getTime() - a.updatedAt.getTime(),
  );

  // The most urgent pre-expiry reminder becomes the dashboard banner.
  let reminder: ReminderItem | null = null;
  if (owner.owner.notify.expiryReminders) {
    const due = items
      .filter((p) => effectiveStatus(p, now) === "active")
      .flatMap((p) => listingReminders(p, now).map((r) => ({ r, p })))
      .sort((a, b) => a.r.daysLeft - b.r.daysLeft || (a.p.expiresAt!.getTime() - b.p.expiresAt!.getTime()));
    if (due[0]) {
      const { r, p } = due[0];
      reminder = {
        id: r.id,
        kind: r.kind,
        propertyId: p.id,
        propertyTitle: p.title,
        at: r.at.toISOString(),
        daysLeft: daysLeft(p, now) ?? r.daysLeft,
      };
    }
  }
  return { items: sorted.map((p) => toOwnerListing(p, now)), counts, reminder };
}

export async function listNotifications(repos: Repositories, auth: AuthUser): Promise<ReminderItem[]> {
  const user = await repos.users.get(auth.uid);
  if (!user?.owner?.enabled || !user.owner.notify.expiryReminders) return [];
  const now = new Date();
  const items = await repos.properties.listByOwner(auth.uid);
  return items
    .flatMap((p) =>
      listingReminders(p, now).map<ReminderItem>((r) => ({
        id: r.id,
        kind: r.kind,
        propertyId: p.id,
        propertyTitle: p.title,
        at: r.at.toISOString(),
        daysLeft: r.daysLeft,
      })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
}

export async function getPropertyStats(repos: Repositories, auth: AuthUser, id: string): Promise<PropertyStats> {
  const { p } = await loadOwned(repos, auth, id);
  const now = new Date();
  const last7Keys = lastDayKeys(7, now);
  const periodKeys = p.publishedAt ? dayKeysBetween(p.publishedAt, p.expiresAt && p.expiresAt < now ? p.expiresAt : now, 30) : [];
  const keys = [...new Set([...last7Keys, ...periodKeys])];
  const counts = new Map((await repos.views.dailyCounts(p.id, keys)).map((d) => [d.date, d.count]));
  return {
    id: p.id,
    title: p.title,
    locality: p.location.locality,
    status: effectiveStatus(p, now),
    totalViews: p.viewCount,
    periodViews: periodKeys.reduce((n, k) => n + (counts.get(k) ?? 0), 0),
    last7: last7Keys.map((date) => ({ date, count: counts.get(date) ?? 0 })),
    daysLeft: daysLeft(p, now),
    listingDay: effectiveStatus(p, now) === "active" ? listingDay(p, now) : null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    rating: { average: p.ratingSummary.average, count: p.ratingSummary.count },
    factors: factorAverages(p),
  };
}

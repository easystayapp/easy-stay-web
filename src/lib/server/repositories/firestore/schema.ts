/**
 * The Firestore document format shared with the EasyStay Android app
 * (easystayapp/easy-stay-mobile-app, `data/firebase/FirestoreMappers.kt`).
 * Both apps read and write the same documents, so this file is the contract:
 * upper-case enum names, epoch-millisecond times, flat location fields.
 *
 *   properties/{id}                 listing + totalViews, periodViews, dailyViews{yyyyMMdd UTC: n}
 *   properties/{id}/private/contact { phone, whatsapp, ownerId }   (signed-in users only)
 *   reviews/r_{propertyId}_{uid}    { propertyId, userId, reviewerName, relation, scores{FACTOR: n}, text, updatedAt }
 *   users/{uid}                     { name, email, phone, photoUrl, lastSignInAt, ownerSettings{…},
 *                                     saved[], contacted[], fcmTokens[] }
 *
 * Web-only additions the Android app ignores:
 *   listingDrafts/{id}  unpublished listings (Android has no draft state and would show them)
 *   propertyViews/{…}   one-view-per-person-per-day dedupe
 *   properties: createdAt, updatedAt, availabilityConfirmedAt
 *   users: createdAt, updatedAt, savedAt{propertyId: ms}, ownerSettingsOff (owner tools turned off)
 *   users.ownerSettings: greeting, newRating, enabledAt
 */
import { emptySummary } from "@/lib/domain/rating";
import { formatPhone, normalizeIndianMobile } from "@/lib/domain/format";
import type {
  Amenity,
  ContactMethod,
  ElectricityBilling,
  Furnishing,
  Gender,
  ListingStatus,
  OwnerSettings,
  Photo,
  Property,
  PropertyType,
  Rating,
  RatingFactor,
  RatingRelation,
  RatingScores,
  SharingOption,
  User,
} from "@/lib/domain/types";

export const COLLECTIONS = {
  users: "users",
  properties: "properties",
  drafts: "listingDrafts",
  reviews: "reviews",
  views: "propertyViews",
} as const;

export type Doc = Record<string, unknown>;

/* ------------------------------------------------------------ enums */

function codec<W extends string>(pairs: [W, string][]) {
  const toStored = new Map(pairs);
  const toWeb = new Map(pairs.map(([w, s]) => [s, w] as const));
  return {
    out: (v: W) => toStored.get(v)!,
    in: (v: unknown): W | null => (typeof v === "string" ? (toWeb.get(v) ?? null) : null),
  };
}
const upper = <W extends string>(values: readonly W[]) => codec(values.map((v) => [v, v.toUpperCase()] as [W, string]));

export const TYPE = codec<PropertyType>([
  ["pg", "PG_HOSTEL"],
  ["room", "ROOM"],
  ["flat", "FLAT"],
]);
export const SIZE = codec<SharingOption>([
  ["1_sharing", "SHARING_1"],
  ["2_sharing", "SHARING_2"],
  ["3_sharing", "SHARING_3"],
  ["4_sharing", "SHARING_4"],
  ["5_sharing", "SHARING_5"],
  ["6_sharing", "SHARING_6"],
  ["single_room", "SINGLE_ROOM"],
  ["1rk", "RK_1"],
  ["1bhk", "BHK_1"],
  ["2bhk", "BHK_2"],
  ["3bhk", "BHK_3"],
  ["4bhk", "BHK_4"],
]);
export const GENDER = upper<Gender>(["male", "female", "anyone"]);
export const FURNISHING = upper<Furnishing>(["furnished", "semi", "unfurnished"]);
export const AMENITY = upper<Amenity>(["wifi", "ac", "parking", "attached_bath"]);
export const ELECTRICITY = upper<ElectricityBilling>(["included", "metered", "fixed"]);
export const STATUS = upper<ListingStatus>(["draft", "active", "paused", "rented", "expired"]);
export const CONTACT_METHOD = upper<ContactMethod>(["call", "whatsapp", "both"]);
export const RELATION = upper<RatingRelation>(["visited", "stayed", "living"]);
export const FACTOR = upper<RatingFactor>(["property", "owner", "environment", "value", "food"]);

/* ------------------------------------------------------------ cities */

/** Web catalog name ↔ Android catalog name (assets/cities.json), with the state Android stores. */
const CITY_TABLE: { web: string; stored: string; state: string }[] = [
  { web: "Hyderabad", stored: "Hyderabad", state: "Telangana" },
  { web: "Bengaluru", stored: "Bengaluru", state: "Karnataka" },
  { web: "Pune", stored: "Pune", state: "Maharashtra" },
  { web: "Chennai", stored: "Chennai", state: "Tamil Nadu" },
  { web: "Mumbai", stored: "Mumbai Metropolitan Region (MMR)", state: "Maharashtra" },
  { web: "Delhi NCR", stored: "Delhi-NCR (Gurugram & Noida)", state: "Haryana & Uttar Pradesh" },
];
export function cityIn(stored: unknown): string {
  const s = typeof stored === "string" ? stored : "";
  return CITY_TABLE.find((c) => c.stored === s)?.web ?? s;
}
export function cityOut(web: string): { city: string; state: string } {
  const row = CITY_TABLE.find((c) => c.web === web);
  return { city: row?.stored ?? web, state: row?.state ?? "" };
}

/* ------------------------------------------------------------ primitives */

export const ms = (d: Date | null | undefined) => (d ? d.getTime() : null);
export function date(v: unknown): Date | null {
  if (typeof v === "number" && v > 0) return new Date(v);
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  return null;
}
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Android stores "+91 98765 43210"; the web domain uses E.164. */
export const phoneIn = (v: unknown) => (typeof v === "string" && v ? (normalizeIndianMobile(v) ?? v) : null);
export const phoneOut = (e164: string | null | undefined) => (e164 ? formatPhone(e164) : null);

/** UTC day key Android uses for `dailyViews` ("yyyyMMdd"). */
export const utcDayKey = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Same placeholder tint Android picks: Java `String.hashCode` of the id, mod 3. */
export function tintFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return (h & 0x7fffffff) % 3;
}

/* ------------------------------------------------------------ photos */

/** Storage key for a photo URL (R2 public URL, the Worker's /files/ URL, or a bundled path). */
export function photoPath(url: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (base && url.startsWith(`${base}/`)) return decodeURIComponent(url.slice(base.length + 1));
  const files = /^https?:\/\/[^/]+\/files\/(.+)$/.exec(url);
  if (files) return decodeURIComponent(files[1]);
  if (url.startsWith("/")) return url.slice(1);
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    return "";
  }
}
const photosIn = (v: unknown): Photo[] => strings(v).filter(Boolean).map((url) => ({ url, path: photoPath(url) }));

/* ------------------------------------------------------------ property */

/** Location text the web shows as "address": Android's house number + landmark. */
const addressIn = (d: Doc) => [str(d.houseNumber), str(d.landmark)].filter((s) => s.trim()).join(", ");

export function propertyIn(id: string, d: Doc, contact: Doc | null): Property | null {
  const type = TYPE.in(d.type);
  if (!type) return null; // Android skips unknown types too
  const lat = num(d.latitude);
  const lng = num(d.longitude);
  const created = date(d.createdAt) ?? date(d.publishedAt) ?? new Date(0);
  const inline = (d.contact as Doc | undefined) ?? null; // drafts keep the contact inline
  const c = contact ?? inline;
  return {
    id,
    ownerId: str(d.ownerId),
    type,
    sharing: SIZE.in(d.size) ?? (type === "flat" ? "1bhk" : type === "room" ? "single_room" : "1_sharing"),
    title: str(d.name),
    rent: num(d.rent) ?? 0,
    deposit: num(d.deposit),
    location: {
      city: cityIn(d.city),
      locality: str(d.locality),
      address: addressIn(d),
      geo: lat != null && lng != null ? { lat, lng } : null,
    },
    photos: photosIn(d.photoUrls),
    availableFor: GENDER.in(d.gender) ?? "anyone",
    contact: { phone: phoneIn(c?.phone) ?? "", whatsapp: phoneIn(c?.whatsapp) },
    furnishing: FURNISHING.in(d.furnishing),
    food: d.food === true,
    amenities: strings(d.amenities)
      .map((a) => AMENITY.in(a))
      .filter((a): a is Amenity => !!a),
    electricity: ELECTRICITY.in(d.electricity),
    availableFrom: date(d.availableFrom),
    description: str(d.description),
    status: STATUS.in(d.status) ?? "active",
    publishedAt: date(d.publishedAt),
    expiresAt: date(d.expiresAt),
    availabilityConfirmedAt: date(d.availabilityConfirmedAt),
    viewCount: num(d.totalViews) ?? 0,
    ratingSummary: emptySummary(), // filled from `reviews` by the adapter
    createdAt: created,
    updatedAt: date(d.updatedAt) ?? created,
  };
}

/**
 * Every stored field a Property determines. The adapter writes only the
 * fields that differ from the current document, so Android-only details
 * (pin code, separate landmark, view counters) survive web edits.
 */
export function propertyOut(p: Omit<Property, "id">): Doc {
  const { city, state } = cityOut(p.location.city);
  return {
    ownerId: p.ownerId,
    name: p.title,
    type: TYPE.out(p.type),
    size: SIZE.out(p.sharing),
    rent: p.rent,
    city,
    state,
    locality: p.location.locality,
    houseNumber: p.location.address,
    landmark: "",
    latitude: p.location.geo?.lat ?? null,
    longitude: p.location.geo?.lng ?? null,
    gender: GENDER.out(p.availableFor),
    photoUrls: p.photos.map((x) => x.url),
    deposit: p.deposit,
    furnishing: p.furnishing ? FURNISHING.out(p.furnishing) : null,
    food: p.food,
    amenities: p.amenities.map((a) => AMENITY.out(a)),
    electricity: p.electricity ? ELECTRICITY.out(p.electricity) : null,
    availableFrom: ms(p.availableFrom),
    description: p.description,
    status: STATUS.out(p.status),
    publishedAt: ms(p.publishedAt) ?? 0,
    expiresAt: ms(p.expiresAt) ?? 0,
    availabilityConfirmedAt: ms(p.availabilityConfirmedAt),
    createdAt: ms(p.createdAt),
    updatedAt: ms(p.updatedAt),
  };
}

export const contactOut = (p: Pick<Property, "ownerId" | "contact">): Doc => ({
  phone: phoneOut(p.contact.phone),
  whatsapp: phoneOut(p.contact.whatsapp),
  ownerId: p.ownerId,
});

/* ------------------------------------------------------------ review */

export const reviewId = (propertyId: string, userId: string) => `r_${propertyId}_${userId}`;

export function ratingIn(id: string, d: Doc): Rating | null {
  const raw = (d.scores as Record<string, unknown> | undefined) ?? {};
  const scores: Partial<Record<RatingFactor, number>> = {};
  for (const [k, v] of Object.entries(raw)) {
    const f = FACTOR.in(k);
    if (f && typeof v === "number") scores[f] = v;
  }
  const rated = Object.values(scores);
  if (!rated.length) return null;
  const updated = date(d.updatedAt) ?? new Date(0);
  return {
    id,
    propertyId: str(d.propertyId),
    userId: str(d.userId),
    authorName: str(d.reviewerName),
    relation: RELATION.in(d.relation) ?? "visited",
    scores: {
      property: scores.property ?? 0,
      owner: scores.owner ?? 0,
      environment: scores.environment ?? 0,
      value: scores.value ?? 0,
      food: scores.food ?? null,
    } as RatingScores,
    combined: num(d.combined) ?? rated.reduce((a, b) => a + b, 0) / rated.length,
    review: str(d.text),
    createdAt: date(d.createdAt) ?? updated,
    updatedAt: updated,
  };
}

export function ratingOut(r: Omit<Rating, "id">): Doc {
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.scores)) if (typeof v === "number") scores[FACTOR.out(k as RatingFactor)] = v;
  return {
    propertyId: r.propertyId,
    userId: r.userId,
    reviewerName: r.authorName,
    relation: RELATION.out(r.relation),
    scores,
    text: r.review,
    updatedAt: ms(r.updatedAt),
    createdAt: ms(r.createdAt),
    combined: r.combined,
  };
}

/* ------------------------------------------------------------ user */

function ownerIn(m: Doc | undefined, enabled: boolean): OwnerSettings | null {
  if (!m || typeof m !== "object") return null;
  return {
    enabled,
    enabledAt: date(m.enabledAt),
    contactPhone: phoneIn(m.contactNumber) ?? "",
    whatsappPhone: phoneIn(m.whatsappNumber),
    contactMethod: CONTACT_METHOD.in(m.contactMethod) ?? "both",
    greeting: typeof m.greeting === "string" && m.greeting ? m.greeting : null,
    notify: {
      expiryReminders: m.expiryReminders !== false,
      newRating: m.newRating !== false,
      weeklySummary: m.weeklySummary === true,
    },
  };
}

export function ownerOut(o: OwnerSettings): Doc {
  return {
    contactNumber: phoneOut(o.contactPhone) ?? "",
    whatsappNumber: phoneOut(o.whatsappPhone),
    contactMethod: CONTACT_METHOD.out(o.contactMethod),
    expiryReminders: o.notify.expiryReminders,
    weeklySummary: o.notify.weeklySummary,
    newRating: o.notify.newRating,
    greeting: o.greeting,
    enabledAt: ms(o.enabledAt),
  };
}

export function userIn(id: string, d: Doc): User {
  const created = date(d.createdAt) ?? date(d.lastSignInAt) ?? new Date(0);
  return {
    id,
    displayName: str(d.name),
    email: typeof d.email === "string" ? d.email : null,
    phone: phoneIn(d.phone),
    photoUrl: typeof d.photoUrl === "string" ? d.photoUrl : null,
    // Android: ownerSettings present = owner tools on.
    owner: ownerIn(d.ownerSettings as Doc, true) ?? ownerIn(d.ownerSettingsOff as Doc, false),
    createdAt: created,
    updatedAt: date(d.updatedAt) ?? created,
  };
}

export const savedIds = (d: Doc | undefined) => strings(d?.saved);
export const contactedIds = (d: Doc | undefined) => strings(d?.contacted);

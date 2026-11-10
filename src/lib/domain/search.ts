/**
 * Search filters: one shape used by the URL, the API and every storage
 * adapter. Adapters may push some filters down to the database, but
 * `matchesFilters` is the reference behaviour and is always applied.
 */
import { MIN_RATINGS_TO_SHOW, PROPERTY_TYPE_LABEL, SHARING_BY_TYPE, SHARING_LABEL } from "./catalog";
import { factorAverage } from "./rating";
import { isPubliclyVisible } from "./listing";
import { addDays, parseDayKey, startOfDayIST } from "./time";
import {
  AMENITIES,
  FURNISHINGS,
  GENDERS,
  PROPERTY_TYPES,
  SHARING_OPTIONS,
  type Amenity,
  type Furnishing,
  type Gender,
  type Property,
  type PropertyType,
  type SharingOption,
} from "./types";

export const SORTS = ["newest", "rent_asc", "top_rated"] as const;
export type SearchSort = (typeof SORTS)[number];
export const SORT_LABEL: Record<SearchSort, string> = {
  newest: "Newest",
  rent_asc: "Rent: low to high",
  top_rated: "Top rated",
};

export const PAGE_SIZE = 12;

export interface SearchFilters {
  city: string;
  q: string;
  types: PropertyType[];
  sharing: SharingOption[];
  minRent: number | null;
  maxRent: number | null;
  genders: Gender[];
  furnishing: Furnishing[];
  food: "yes" | "no" | null;
  amenities: Amenity[];
  /** "now", "15d", or a YYYY-MM-DD date the seeker wants to move in by. */
  availableBy: string | null;
  minRating: 3 | 4 | null;
  ownerRated4: boolean;
  areaRated4: boolean;
  sort: SearchSort;
  page: number;
}

export function emptyFilters(city: string): SearchFilters {
  return {
    city,
    q: "",
    types: [],
    sharing: [],
    minRent: null,
    maxRent: null,
    genders: [],
    furnishing: [],
    food: null,
    amenities: [],
    availableBy: null,
    minRating: null,
    ownerRated4: false,
    areaRated4: false,
    sort: "newest",
    page: 1,
  };
}

/* ------------------------------------------------------- URL round-trip */

const list = <T extends string>(v: string | null, allowed: readonly T[]): T[] =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));

const num = (v: string | null): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

export function parseFilters(params: URLSearchParams, fallbackCity: string): SearchFilters {
  const rating = params.get("rating");
  const food = params.get("food");
  const sort = params.get("sort") as SearchSort | null;
  const avail = params.get("available");
  return {
    city: params.get("city")?.trim() || fallbackCity,
    q: (params.get("q") ?? "").trim().slice(0, 80),
    types: list(params.get("type"), PROPERTY_TYPES),
    sharing: list(params.get("sharing"), SHARING_OPTIONS),
    minRent: num(params.get("min")),
    maxRent: num(params.get("max")),
    genders: list(params.get("gender"), GENDERS),
    furnishing: list(params.get("furnishing"), FURNISHINGS),
    food: food === "yes" || food === "no" ? food : null,
    amenities: list(params.get("amenities"), AMENITIES),
    availableBy: avail === "now" || avail === "15d" || (avail && parseDayKey(avail)) ? avail : null,
    minRating: rating === "4" ? 4 : rating === "3" ? 3 : null,
    ownerRated4: params.get("owner4") === "1",
    areaRated4: params.get("area4") === "1",
    sort: sort && (SORTS as readonly string[]).includes(sort) ? sort : "newest",
    page: Math.max(1, num(params.get("page")) ?? 1),
  };
}

export function serializeFilters(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.city) p.set("city", f.city);
  if (f.q) p.set("q", f.q);
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.sharing.length) p.set("sharing", f.sharing.join(","));
  if (f.minRent != null) p.set("min", String(f.minRent));
  if (f.maxRent != null) p.set("max", String(f.maxRent));
  if (f.genders.length) p.set("gender", f.genders.join(","));
  if (f.furnishing.length) p.set("furnishing", f.furnishing.join(","));
  if (f.food) p.set("food", f.food);
  if (f.amenities.length) p.set("amenities", f.amenities.join(","));
  if (f.availableBy) p.set("available", f.availableBy);
  if (f.minRating) p.set("rating", String(f.minRating));
  if (f.ownerRated4) p.set("owner4", "1");
  if (f.areaRated4) p.set("area4", "1");
  if (f.sort !== "newest") p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

/** Number of active refinements (for the "Filters · N" button). */
export function activeFilterCount(f: SearchFilters): number {
  return (
    f.types.length +
    f.sharing.length +
    (f.minRent != null || f.maxRent != null ? 1 : 0) +
    f.genders.length +
    f.furnishing.length +
    (f.food ? 1 : 0) +
    f.amenities.length +
    (f.availableBy ? 1 : 0) +
    (f.minRating ? 1 : 0) +
    (f.ownerRated4 ? 1 : 0) +
    (f.areaRated4 ? 1 : 0)
  );
}

/** Sharing options relevant to the selected property types. */
export function sharingOptionsFor(types: PropertyType[]): SharingOption[] {
  return (types.length ? types : PROPERTY_TYPES).flatMap((t) => SHARING_BY_TYPE[t]);
}

/* ------------------------------------------------------------ matching */

export function normalizeText(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function searchableWords(p: Property): string[] {
  return normalizeText(
    [
      p.title,
      p.location.locality,
      p.location.city,
      p.location.address,
      PROPERTY_TYPE_LABEL[p.type],
      p.type === "pg" ? "pg pgs hostel hostels" : p.type === "room" ? "room rooms" : "flat flats apartment",
      SHARING_LABEL[p.sharing],
    ].join(" "),
  );
}

/**
 * Prefix tokens (2–15 chars) for databases without full-text search. An
 * adapter can index these and query on the first word of `q`.
 */
export function searchTokens(p: Property): string[] {
  const out = new Set<string>();
  for (const w of searchableWords(p)) {
    for (let i = 2; i <= Math.min(w.length, 15); i++) out.add(w.slice(0, i));
  }
  return [...out];
}

function availableByDate(v: string, now: Date): Date | null {
  if (v === "now") return startOfDayIST(addDays(now, 1));
  if (v === "15d") return addDays(now, 15);
  const d = parseDayKey(v);
  return d ? addDays(d, 1) : null;
}

export function matchesFilters(p: Property, f: SearchFilters, now = new Date()): boolean {
  if (!isPubliclyVisible(p, now)) return false;
  if (f.city && p.location.city.toLowerCase() !== f.city.toLowerCase()) return false;
  if (f.q) {
    const words = searchableWords(p);
    const ok = normalizeText(f.q).every((t) => words.some((w) => w.startsWith(t)));
    if (!ok) return false;
  }
  if (f.types.length && !f.types.includes(p.type)) return false;
  if (f.sharing.length && !f.sharing.includes(p.sharing)) return false;
  if (f.minRent != null && p.rent < f.minRent) return false;
  if (f.maxRent != null && p.rent > f.maxRent) return false;
  // "Anyone" listings suit every seeker; gendered listings must be asked for.
  if (f.genders.length && p.availableFor !== "anyone" && !f.genders.includes(p.availableFor)) return false;
  if (f.furnishing.length && (!p.furnishing || !f.furnishing.includes(p.furnishing))) return false;
  if (f.food === "yes" && !p.food) return false;
  if (f.food === "no" && p.food) return false;
  if (f.amenities.length && !f.amenities.every((a) => p.amenities.includes(a))) return false;
  if (f.availableBy && p.availableFrom) {
    const by = availableByDate(f.availableBy, now);
    if (by && p.availableFrom.getTime() >= by.getTime()) return false;
  }
  const s = p.ratingSummary;
  if (f.minRating && (s.average ?? 0) < f.minRating) return false;
  if (f.ownerRated4 && (factorAverage(s, "owner") ?? 0) < 4) return false;
  if (f.areaRated4 && (factorAverage(s, "environment") ?? 0) < 4) return false;
  return true;
}

export function sortProperties(items: Property[], sort: SearchSort): Property[] {
  const by = [...items];
  const newest = (a: Property, b: Property) =>
    (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  if (sort === "rent_asc") by.sort((a, b) => a.rent - b.rent || newest(a, b));
  else if (sort === "top_rated")
    by.sort((a, b) => (b.ratingSummary.average ?? 0) - (a.ratingSummary.average ?? 0) || newest(a, b));
  else by.sort(newest);
  return by;
}

/** Human summary of the search, e.g. "PGs in Gachibowli". */
export function searchHeading(f: SearchFilters): string {
  const noun =
    f.types.length === 1
      ? { pg: "PGs", room: "Rooms", flat: "Flats" }[f.types[0]]
      : "Places to stay";
  return `${noun} in ${f.q ? titleCase(f.q) : f.city}`;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/* ------------------------------------------------------------ featured */

const byRating = (a: Property, b: Property) =>
  (b.ratingSummary.average ?? 0) - (a.ratingSummary.average ?? 0) || b.ratingSummary.count - a.ratingSummary.count;

/**
 * Top-rated stays with a mix of property types: each round takes the best
 * remaining listing of every type (best first), so one type can't fill the
 * whole list. Only listings with enough ratings to show a score qualify;
 * newer listings fill any remaining slots.
 */
export function pickFeatured(items: Property[], n = 5): Property[] {
  const rated = items
    .filter((p) => p.ratingSummary.count >= MIN_RATINGS_TO_SHOW && p.ratingSummary.average != null)
    .sort(byRating);
  const queues = new Map<PropertyType, Property[]>();
  for (const p of rated) queues.set(p.type, [...(queues.get(p.type) ?? []), p]);

  const out: Property[] = [];
  while (out.length < n && [...queues.values()].some((q) => q.length)) {
    const heads = [...queues.values()].map((q) => q.shift()).filter((p): p is Property => !!p).sort(byRating);
    out.push(...heads.slice(0, n - out.length));
  }
  if (out.length < n) {
    const taken = new Set(out.map((p) => p.id));
    out.push(...sortProperties(items.filter((p) => !taken.has(p.id)), "newest").slice(0, n - out.length));
  }
  return out;
}

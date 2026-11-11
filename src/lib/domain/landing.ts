/** Pure helpers for SEO landing pages (city / area). No I/O. */
import { normalizeText } from "./search";
import type { Property } from "./types";

/** URL slug: "Gachibowli" → "gachibowli", "HITEC City" → "hitec-city". */
export const slugify = (s: string) => normalizeText(s).join("-");

/**
 * The main area of a listing's locality: Android stores e.g.
 * "Gachibowli (Telecom Nagar, Jayabheri Pine Valley)", grouped here as "Gachibowli".
 */
export function areaName(locality: string): string {
  return locality.split(/[(,/|-]/)[0].trim().replace(/\s+/g, " ");
}

/** A listing belongs to an area when every word of the area name appears in its locality. */
export function inArea(p: Pick<Property, "location">, area: string): boolean {
  const words = new Set(normalizeText(p.location.locality));
  const want = normalizeText(area);
  return want.length > 0 && want.every((w) => words.has(w));
}

export interface LandingStats {
  count: number;
  minRent: number | null;
  medianRent: number | null;
  maxRent: number | null;
  pg: number;
  room: number;
  flat: number;
  female: number;
  male: number;
  anyone: number;
  withFood: number;
  rated: number;
}

export function landingStats(list: Property[]): LandingStats {
  const rents = list.map((p) => p.rent).sort((a, b) => a - b);
  const count = (f: (p: Property) => boolean) => list.filter(f).length;
  return {
    count: list.length,
    minRent: rents[0] ?? null,
    medianRent: rents.length ? rents[Math.floor(rents.length / 2)] : null,
    maxRent: rents[rents.length - 1] ?? null,
    pg: count((p) => p.type === "pg"),
    room: count((p) => p.type === "room"),
    flat: count((p) => p.type === "flat"),
    female: count((p) => p.availableFor === "female"),
    male: count((p) => p.availableFor === "male"),
    anyone: count((p) => p.availableFor === "anyone"),
    withFood: count((p) => p.food),
    rated: count((p) => p.ratingSummary.count > 0),
  };
}

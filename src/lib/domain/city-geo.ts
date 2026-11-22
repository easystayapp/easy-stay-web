/**
 * Which of our cities is a visitor in? Used to pick the city selector's default from their location.
 * Cities are whole regions, so each has one centre and a generous catch radius.
 */
import { distanceKm } from "./search";
import type { GeoPoint } from "./types";

/** City centres by lowercase label. A city missing here is simply never auto-selected. */
export const CITY_CENTERS: Record<string, GeoPoint> = {
  hyderabad: { lat: 17.385, lng: 78.4867 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  pune: { lat: 18.5204, lng: 73.8567 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  mumbai: { lat: 19.076, lng: 72.8777 }, // MMR reaches Thane / Navi Mumbai, ~40 km out
  "delhi ncr": { lat: 28.6139, lng: 77.209 }, // Gurugram, Noida, Ghaziabad all within ~35 km
};

/** Further than this from every city centre = not in a city we serve. */
export const CITY_CATCH_KM = 100;

/** The nearest city to `pos` within {@link CITY_CATCH_KM}, or null (e.g. a visitor abroad). */
export function nearestCity(pos: GeoPoint, cities: { label: string }[], maxKm = CITY_CATCH_KM): { city: string; km: number } | null {
  let best: { city: string; km: number } | null = null;
  for (const c of cities) {
    const center = CITY_CENTERS[c.label.toLowerCase()];
    if (!center) continue;
    const km = distanceKm(pos, center);
    if (km <= maxKm && (!best || km < best.km)) best = { city: c.label, km };
  }
  return best;
}

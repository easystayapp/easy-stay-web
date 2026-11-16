/**
 * Geohash and "geo-fence" ranges, for answering "what's within N km?" from a database index.
 *
 * A listing stores `geohash` (standard base-32 geohash of its map pin). Listings close together share a
 * prefix, so a circle on the map becomes a handful of string ranges (`geohash >= start AND <= end`)
 * that any ordered index can serve — no scan of every listing. The ranges cover a little more than the
 * circle; callers drop the extras with an exact distance check.
 *
 * Standard encoding, so other clients (the Android app) can write the same field with any geohash library.
 */
import type { GeoPoint } from "./types";

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Characters stored per listing (~5 m cells). Queries use shorter prefixes of it. */
export const GEOHASH_LENGTH = 9;

/** Standard geohash of a point, `precision` characters long. */
export function geohashEncode(lat: number, lng: number, precision = GEOHASH_LENGTH): string {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let out = "";
  let bit = 0;
  let ch = 0;
  let evenBit = true; // longitude first
  while (out.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { ch = (ch << 1) | 1; lngMin = mid; } else { ch <<= 1; lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latMin = mid; } else { ch <<= 1; latMax = mid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      out += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return out;
}

/** Cell size in degrees for a geohash of `chars` characters. */
function cellSize(chars: number) {
  const bits = chars * 5;
  return { lat: 180 / 2 ** Math.floor(bits / 2), lng: 360 / 2 ** Math.ceil(bits / 2) };
}

const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;
const clampLat = (lat: number) => Math.max(-90, Math.min(90, lat));

export interface GeofenceRanges {
  /** Prefix length the ranges are made of. */
  precision: number;
  /** Inclusive string ranges to query on the `geohash` field. */
  ranges: [start: string, end: string][];
}

/** Most ranges (= database queries) one search may use. */
export const MAX_FENCE_CELLS = 12;

/**
 * The geohash ranges that together cover every point within `radiusKm` of `center`.
 * Picks the finest precision whose grid cells cover the circle's bounding box in at most `maxCells`
 * ranges: small radii get small cells (few listings read), large radii get big ones (few queries).
 */
export function geofenceRanges(center: GeoPoint, radiusKm: number, maxCells = MAX_FENCE_CELLS): GeofenceRanges {
  const dLat = radiusKm / 110.574;
  const latLo = clampLat(center.lat - dLat);
  const latHi = clampLat(center.lat + dLat);
  // Longitude degrees shrink towards the poles: size the box for its widest (most poleward) edge.
  const cos = Math.max(0.01, Math.cos((Math.min(89.9, Math.max(Math.abs(latLo), Math.abs(latHi))) * Math.PI) / 180));
  const dLng = radiusKm / (111.32 * cos);
  const lngLo = center.lng - dLng;
  const lngHi = center.lng + dLng;

  let best: GeofenceRanges | null = null;
  for (let chars = 1; chars <= GEOHASH_LENGTH; chars++) {
    const c = cellSize(chars);
    const iLat0 = Math.floor((latLo + 90) / c.lat), iLat1 = Math.floor((latHi + 90) / c.lat);
    const iLng0 = Math.floor((lngLo + 180) / c.lng), iLng1 = Math.floor((lngHi + 180) / c.lng);
    const count = (iLat1 - iLat0 + 1) * (iLng1 - iLng0 + 1);
    if (count > maxCells) break; // counts only grow with precision
    const prefixes = new Set<string>();
    for (let a = iLat0; a <= iLat1; a++) {
      for (let b = iLng0; b <= iLng1; b++) {
        prefixes.add(geohashEncode(clampLat((a + 0.5) * c.lat - 90), wrapLng((b + 0.5) * c.lng - 180), chars));
      }
    }
    best = { precision: chars, ranges: [...prefixes].sort().map((p) => [p, `${p}~`] as [string, string]) };
  }
  // A radius so large that even one-character cells need too many ranges: everything.
  return best ?? { precision: 0, ranges: [["", "~"]] };
}

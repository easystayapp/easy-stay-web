"use client";

import { DEFAULT_RADIUS_KM } from "@/lib/domain/search";

export interface Position {
  lat: number;
  lng: number;
}

/** A location problem with a message that is safe to show the user. */
export class LocationError extends Error {}

/** The device's current position. Cached up to 5 minutes so repeat taps are instant. */
export function currentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return reject(new LocationError("Location isn't available on this device."));
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        reject(
          new LocationError(
            e.code === e.PERMISSION_DENIED
              ? "Allow location access in your browser to search near you."
              : e.code === e.TIMEOUT
                ? "Couldn't get your location in time. Please try again."
                : "Couldn't find your location. Please try again.",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

/** Whether location is already allowed/blocked, without prompting. "unsupported" = can't tell (older Safari). */
export async function geolocationPermission(): Promise<PermissionState | "unsupported"> {
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state;
  } catch {
    return "unsupported";
  }
}

/**
 * URL params for a nearby search. Keeps the other filters (type, rent…) but drops the search text,
 * city and sort: "near me" means everything close by, nearest first. Coordinates are rounded to ~100 m.
 */
export function nearbyParams(pos: Position, base?: URLSearchParams, radiusKm = DEFAULT_RADIUS_KM): URLSearchParams {
  const next = new URLSearchParams(base);
  for (const k of ["q", "city", "page", "sort"]) next.delete(k);
  next.set("lat", pos.lat.toFixed(3));
  next.set("lng", pos.lng.toFixed(3));
  next.set("r", String(radiusKm));
  return next;
}

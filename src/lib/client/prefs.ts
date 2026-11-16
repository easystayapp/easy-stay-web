"use client";

/** Per-device conveniences kept in localStorage (never source-of-truth data). */

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage unavailable (private mode) */
  }
};

export function deviceId(): string {
  let id = read("es.device");
  if (!id) {
    id = crypto.randomUUID();
    write("es.device", id);
  }
  return id;
}

/** Last known "owner tools on" state, so the profile skeleton can draw the right layout before login resolves. */
export function ownerHint(): boolean {
  return read("es.owner") === "1";
}
export function storeOwnerHint(on: boolean) {
  write("es.owner", on ? "1" : "0");
}

export function storedCity(): string | null {
  return read("es.city");
}
/** True when the remembered city came from the visitor's location, not from their own pick. */
export function cityIsAuto(): boolean {
  return read("es.city.auto") === "1";
}
export function storeCity(city: string, auto = false) {
  write("es.city", city);
  write("es.city.auto", auto ? "1" : null);
}
/** We only ask for location once; this remembers that we did. */
export function geoAsked(): boolean {
  return read("es.geo.asked") === "1";
}
export function markGeoAsked() {
  write("es.geo.asked", "1");
}

export interface RecentSearch {
  label: string;
  query: string;
}

export function recentSearches(): RecentSearch[] {
  try {
    const v = JSON.parse(read("es.recent") ?? "[]");
    return Array.isArray(v) ? v.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(s: RecentSearch) {
  const next = [s, ...recentSearches().filter((r) => r.query !== s.query)].slice(0, 6);
  write("es.recent", JSON.stringify(next));
}

export function clearRecentSearches() {
  write("es.recent", null);
}

export function welcomeSeen(): boolean {
  return read("es.welcomed") === "1";
}
export function markWelcomeSeen() {
  write("es.welcomed", "1");
}

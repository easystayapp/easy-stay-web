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

export function storedCity(): string | null {
  return read("es.city");
}
export function storeCity(city: string) {
  write("es.city", city);
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

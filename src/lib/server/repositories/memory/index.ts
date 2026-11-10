/**
 * In-memory adapter. Implements the same contract as the Firestore adapter
 * with plain Maps — handy for local development without a database, for
 * tests, and as a reference for writing a new adapter.
 *
 * Data lives for the lifetime of the server process.
 */
import { memoryBatch, memoryDocStore } from "../docstore";
import { randomUUID } from "node:crypto";
import type { City, Page } from "@/lib/domain/content";
import type { ContactEvent, DailyViews, Property, Rating, SavedProperty, User } from "@/lib/domain/types";
import { SEED_APP_CONFIG, SEED_CITIES, SEED_HOME, SEED_PAGES, SEED_WELCOME } from "../../seed/content";
import type { ContentDocs, FileStorage, Repositories } from "../types";

interface Store {
  users: Map<string, User>;
  properties: Map<string, Property>;
  ratings: Map<string, Rating>;
  contacts: Map<string, ContactEvent>;
  saved: Map<string, SavedProperty>;
  views: Set<string>;
  dailyViews: Map<string, DailyViews>;
  files: Map<string, { data: Uint8Array; contentType: string }>;
  cities: Map<string, City>;
  docs: Partial<ContentDocs>;
  pages: Map<string, Page>;
}

const g = globalThis as unknown as { __easyStayMemory?: Store };

export function memoryStore(): Store {
  g.__easyStayMemory ??= {
    users: new Map(),
    properties: new Map(),
    ratings: new Map(),
    contacts: new Map(),
    saved: new Map(),
    views: new Set(),
    dailyViews: new Map(),
    files: new Map(),
    // Starts with the initial content so the memory backend works out of the box.
    cities: new Map(SEED_CITIES.map((c) => [c.id, c])),
    docs: { app: SEED_APP_CONFIG, home: SEED_HOME, welcome: SEED_WELCOME },
    pages: new Map(SEED_PAGES.map((p) => [p.slug, p])),
  };
  return g.__easyStayMemory;
}

const clone = <T>(v: T): T => structuredClone(v);

export function createMemoryRepositories(): Repositories {
  const s = memoryStore();

  return {
    docs: memoryDocStore,
    batch: memoryBatch,
    content: {
      async listCities() {
        return [...s.cities.values()].map(clone).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
      },
      async upsertCity(city) {
        s.cities.set(city.id, clone(city));
      },
      async getDoc(key) {
        const v = s.docs[key];
        return v ? clone(v) : null;
      },
      async putDoc(key, value) {
        s.docs[key] = clone(value);
      },
      async getPage(slug) {
        const p = s.pages.get(slug);
        return p ? clone(p) : null;
      },
      async putPage(page) {
        s.pages.set(page.slug, clone(page));
      },
    },
    users: {
      async get(id) {
        const u = s.users.get(id);
        return u ? clone(u) : null;
      },
      async getMany(ids) {
        return ids.map((id) => s.users.get(id)).filter((u): u is User => !!u).map(clone);
      },
      async createIfMissing(user) {
        if (!s.users.has(user.id)) s.users.set(user.id, clone(user));
        return clone(s.users.get(user.id)!);
      },
      async update(id, patch) {
        const cur = s.users.get(id);
        if (cur) s.users.set(id, { ...cur, ...clone(patch) });
      },
    },

    properties: {
      async get(id) {
        const p = s.properties.get(id);
        return p ? clone(p) : null;
      },
      async getMany(ids) {
        return ids.map((id) => s.properties.get(id)).filter((p): p is Property => !!p).map(clone);
      },
      async create(data) {
        const p: Property = { ...clone(data), id: randomUUID().replace(/-/g, "").slice(0, 20) };
        s.properties.set(p.id, p);
        return clone(p);
      },
      async update(id, patch) {
        const cur = s.properties.get(id);
        if (!cur) throw new Error(`Property ${id} not found`);
        s.properties.set(id, { ...cur, ...clone(patch) });
      },
      async delete(id) {
        s.properties.delete(id);
      },
      async listByOwner(ownerId) {
        return [...s.properties.values()].filter((p) => p.ownerId === ownerId).map(clone);
      },
      async findCandidates(f, limit) {
        const city = f.city.trim().toLowerCase();
        return [...s.properties.values()]
          .filter((p) => p.status === "active" && (!city || p.location.city.toLowerCase() === city))
          .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
          .slice(0, limit)
          .map(clone);
      },
      async setRatingSummary(id, summary) {
        const cur = s.properties.get(id);
        if (cur) cur.ratingSummary = clone(summary);
      },
    },

    ratings: {
      async get(propertyId, userId) {
        const r = s.ratings.get(`${propertyId}_${userId}`);
        return r ? clone(r) : null;
      },
      async upsert(rating) {
        const r: Rating = { ...clone(rating), id: `${rating.propertyId}_${rating.userId}` };
        s.ratings.set(r.id, r);
        return clone(r);
      },
      async listByProperty(propertyId) {
        return [...s.ratings.values()].filter((r) => r.propertyId === propertyId).map(clone);
      },
      async listByUser(userId) {
        return [...s.ratings.values()].filter((r) => r.userId === userId).map(clone);
      },
    },

    contacts: {
      async get(propertyId, userId) {
        const c = s.contacts.get(`${propertyId}_${userId}`);
        return c ? clone(c) : null;
      },
      async record({ propertyId, ownerId, userId, channel, at }) {
        const id = `${propertyId}_${userId}`;
        const cur = s.contacts.get(id);
        if (cur) {
          if (!cur.channels.includes(channel)) cur.channels.push(channel);
          cur.count += 1;
          cur.lastAt = at;
        } else {
          s.contacts.set(id, { id, propertyId, ownerId, userId, channels: [channel], count: 1, firstAt: at, lastAt: at });
        }
      },
    },

    saved: {
      async listByUser(userId) {
        return [...s.saved.values()].filter((x) => x.userId === userId).map(clone);
      },
      async save(userId, propertyId, at) {
        const id = `${userId}_${propertyId}`;
        if (!s.saved.has(id)) s.saved.set(id, { id, userId, propertyId, createdAt: at });
      },
      async remove(userId, propertyId) {
        s.saved.delete(`${userId}_${propertyId}`);
      },
    },

    views: {
      async recordUnique(propertyId, viewerKey, day) {
        const key = `${propertyId}_${viewerKey}_${day}`;
        if (s.views.has(key)) return false;
        s.views.add(key);
        const dk = `${propertyId}_${day}`;
        const d = s.dailyViews.get(dk) ?? { propertyId, date: day, count: 0 };
        d.count += 1;
        s.dailyViews.set(dk, d);
        const p = s.properties.get(propertyId);
        if (p) p.viewCount += 1;
        return true;
      },
      async dailyCounts(propertyId, days) {
        return days.map((date) => ({ propertyId, date, count: s.dailyViews.get(`${propertyId}_${date}`)?.count ?? 0 }));
      },
    },
  };
}

export function createMemoryFileStorage(): FileStorage {
  const s = memoryStore();
  const publicUrl = (path: string) => `/api/files/${path.split("/").map(encodeURIComponent).join("/")}`;
  return {
    publicUrl,
    async upload(path, data, contentType) {
      s.files.set(path, { data, contentType });
      return { path, url: publicUrl(path) };
    },
    async presignUpload() {
      return null; // in-process store: uploads go through /api/uploads
    },
    async stat(path) {
      const f = s.files.get(path);
      return f ? { size: f.data.byteLength, contentType: f.contentType } : null;
    },
    async delete(path) {
      s.files.delete(path);
    },
  };
}

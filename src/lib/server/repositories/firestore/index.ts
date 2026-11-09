/**
 * Firestore adapter (Admin SDK). The only module that knows about
 * Firestore documents, Timestamps and FieldValues.
 *
 * Collections (all top-level, so each maps 1:1 to a table elsewhere):
 *   users                  {uid}
 *   properties             {auto id}            + searchTokens, cityKey (index-only fields)
 *   ratings                {propertyId}_{userId}
 *   contacts               {propertyId}_{userId}
 *   savedProperties        {userId}_{propertyId}
 *   propertyViews          {propertyId}_{viewer}_{day}
 *   propertyDailyViews     {propertyId}_{day}
 */
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentSnapshot,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";
import { emptySummary } from "@/lib/domain/rating";
import { normalizeText, searchTokens, type SearchFilters } from "@/lib/domain/search";
import type { ContactEvent, DailyViews, Property, Rating, SavedProperty, User } from "@/lib/domain/types";
import { getAdminApp } from "../../firebase-admin";
import type { NewProperty, PropertyPatch, Repositories } from "../types";

export const COLLECTIONS = {
  users: "users",
  properties: "properties",
  ratings: "ratings",
  contacts: "contacts",
  saved: "savedProperties",
  views: "propertyViews",
  dailyViews: "propertyDailyViews",
} as const;

/** Fields stored only to support queries; stripped when reading. */
const INDEX_FIELDS = ["searchTokens", "cityKey"] as const;
const SEARCHABLE: (keyof Property)[] = ["title", "location", "type", "sharing"];

/* ------------------------------------------------------------ mapping */

/** Deeply converts Firestore Timestamps to Dates. */
function revive(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate();
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
  }
  return v;
}

function data<T>(snap: DocumentSnapshot): (T & { id: string }) | null {
  if (!snap.exists) return null;
  return { ...(revive(snap.data()) as T), id: snap.id };
}

function toProperty(snap: DocumentSnapshot): Property | null {
  const raw = data<Property & Record<string, unknown>>(snap);
  if (!raw) return null;
  for (const f of INDEX_FIELDS) delete raw[f];
  return {
    ...raw,
    deposit: raw.deposit ?? null,
    photos: raw.photos ?? [],
    amenities: raw.amenities ?? [],
    furnishing: raw.furnishing ?? null,
    electricity: raw.electricity ?? null,
    availableFrom: raw.availableFrom ?? null,
    publishedAt: raw.publishedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    availabilityConfirmedAt: raw.availabilityConfirmedAt ?? null,
    viewCount: raw.viewCount ?? 0,
    ratingSummary: raw.ratingSummary ?? emptySummary(),
    location: { ...raw.location, address: raw.location?.address ?? "", geo: raw.location?.geo ?? null },
    contact: { ...raw.contact, whatsapp: raw.contact?.whatsapp ?? null },
  };
}

function indexFields(p: Property) {
  return { searchTokens: searchTokens(p), cityKey: p.location.city.trim().toLowerCase() };
}

/** Firestore document ids can't contain "/"; keep keys readable and bounded. */
const safeKey = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 120);

async function getAllDocs(db: Firestore, col: string, ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return [];
  const out: DocumentSnapshot[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const refs = unique.slice(i, i + 100).map((id) => db.collection(col).doc(id));
    out.push(...(await db.getAll(...refs)));
  }
  return out;
}

/* ------------------------------------------------------------ adapter */

let db: Firestore | null = null;
function firestore(): Firestore {
  if (!db) {
    db = getFirestore(getAdminApp());
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}

export function createFirestoreRepositories(): Repositories {
  const fs = firestore();
  const col = (name: keyof typeof COLLECTIONS) => fs.collection(COLLECTIONS[name]);

  return {
    users: {
      async get(id) {
        return data<User>(await col("users").doc(id).get());
      },
      async getMany(ids) {
        return (await getAllDocs(fs, COLLECTIONS.users, ids)).map((s) => data<User>(s)).filter((u): u is User => !!u);
      },
      async createIfMissing(user) {
        const ref = col("users").doc(user.id);
        return fs.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists) return data<User>(snap)!;
          const { id: _id, ...rest } = user;
          void _id;
          tx.set(ref, rest);
          return user;
        });
      },
      async update(id, patch) {
        await col("users").doc(id).set(patch, { merge: true });
      },
    },

    properties: {
      async get(id) {
        return toProperty(await col("properties").doc(id).get());
      },
      async getMany(ids) {
        return (await getAllDocs(fs, COLLECTIONS.properties, ids))
          .map(toProperty)
          .filter((p): p is Property => !!p);
      },
      async create(input: NewProperty) {
        const ref = col("properties").doc();
        const property: Property = { ...input, id: ref.id };
        await ref.set({ ...input, ...indexFields(property) });
        return property;
      },
      async update(id, patch: PropertyPatch) {
        const ref = col("properties").doc(id);
        const touchesSearch = SEARCHABLE.some((k) => k in patch);
        if (!touchesSearch) {
          await ref.update(patch);
          return;
        }
        await fs.runTransaction(async (tx) => {
          const current = toProperty(await tx.get(ref));
          if (!current) throw new Error(`Property ${id} not found`);
          const next = { ...current, ...patch };
          // `update` replaces nested maps wholesale, matching Partial<Property> semantics.
          tx.update(ref, { ...patch, ...indexFields(next) });
        });
      },
      async delete(id) {
        await col("properties").doc(id).delete();
      },
      async listByOwner(ownerId) {
        const snap = await col("properties").where("ownerId", "==", ownerId).get();
        return snap.docs.map(toProperty).filter((p): p is Property => !!p);
      },
      async findCandidates(f: SearchFilters, limit) {
        let q: Query = col("properties").where("status", "==", "active");
        if (f.city) q = q.where("cityKey", "==", f.city.trim().toLowerCase());
        const token = normalizeText(f.q)[0];
        if (token && token.length >= 2) q = q.where("searchTokens", "array-contains", token.slice(0, 15));
        const snap = await q.orderBy("publishedAt", "desc").limit(limit).get();
        return snap.docs.map(toProperty).filter((p): p is Property => !!p);
      },
      async setRatingSummary(id, summary) {
        await col("properties").doc(id).update({ ratingSummary: summary });
      },
    },

    ratings: {
      async get(propertyId, userId) {
        return data<Rating>(await col("ratings").doc(`${propertyId}_${userId}`).get());
      },
      async upsert(rating) {
        const id = `${rating.propertyId}_${rating.userId}`;
        await col("ratings").doc(id).set(rating);
        return { ...rating, id };
      },
      async listByProperty(propertyId) {
        const snap = await col("ratings").where("propertyId", "==", propertyId).get();
        return snap.docs.map((d) => data<Rating>(d)!);
      },
      async listByUser(userId) {
        const snap = await col("ratings").where("userId", "==", userId).get();
        return snap.docs.map((d) => data<Rating>(d)!);
      },
    },

    contacts: {
      async get(propertyId, userId) {
        return data<ContactEvent>(await col("contacts").doc(`${propertyId}_${userId}`).get());
      },
      async record({ propertyId, ownerId, userId, channel, at }) {
        const ref = col("contacts").doc(`${propertyId}_${userId}`);
        await fs.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists) {
            tx.update(ref, { channels: FieldValue.arrayUnion(channel), count: FieldValue.increment(1), lastAt: at });
          } else {
            tx.set(ref, { propertyId, ownerId, userId, channels: [channel], count: 1, firstAt: at, lastAt: at });
          }
        });
      },
    },

    saved: {
      async listByUser(userId) {
        const snap = await col("saved").where("userId", "==", userId).get();
        return snap.docs.map((d) => data<SavedProperty>(d)!);
      },
      async save(userId, propertyId, at) {
        await col("saved").doc(`${userId}_${propertyId}`).set({ userId, propertyId, createdAt: at });
      },
      async remove(userId, propertyId) {
        await col("saved").doc(`${userId}_${propertyId}`).delete();
      },
    },

    views: {
      async recordUnique(propertyId, viewerKey, day, at) {
        const viewRef = col("views").doc(`${propertyId}_${safeKey(viewerKey)}_${day}`);
        const dailyRef = col("dailyViews").doc(`${propertyId}_${day}`);
        const propRef = col("properties").doc(propertyId);
        return fs.runTransaction(async (tx) => {
          if ((await tx.get(viewRef)).exists) return false;
          tx.create(viewRef, { propertyId, viewerKey, date: day, createdAt: at });
          tx.set(dailyRef, { propertyId, date: day, count: FieldValue.increment(1) }, { merge: true });
          tx.update(propRef, { viewCount: FieldValue.increment(1) });
          return true;
        });
      },
      async dailyCounts(propertyId, days) {
        const snaps = await getAllDocs(fs, COLLECTIONS.dailyViews, days.map((d) => `${propertyId}_${d}`));
        const byDay = new Map(snaps.filter((s) => s.exists).map((s) => [s.get("date") as string, s.get("count") as number]));
        return days.map<DailyViews>((date) => ({ propertyId, date, count: byDay.get(date) ?? 0 }));
      },
    },
  };
}

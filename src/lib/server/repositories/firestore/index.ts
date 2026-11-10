/**
 * Firestore adapter (Admin SDK) over the document format shared with the
 * EasyStay Android app — see ./schema.ts for the layout and the mapping.
 * Services never see this format: they get and give domain entities.
 */
import { FieldValue, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { summarize } from "@/lib/domain/rating";
import type { SearchFilters } from "@/lib/domain/search";
import type { ContactEvent, DailyViews, Property, Rating, SavedProperty, User } from "@/lib/domain/types";
import { adminDb } from "../../firebase-admin";
import type { NewProperty, PropertyPatch, Repositories, UserPatch } from "../types";
import { firestoreBatch, firestoreDocStore } from "../docstore";
import { createFirestoreContent } from "./content";
import {
  COLLECTIONS,
  cityIndex,
  contactOut,
  contactedIds,
  ms,
  ownerOut,
  phoneOut,
  propertyIn,
  propertyOut,
  ratingIn,
  ratingOut,
  reviewId,
  savedIds,
  STATUS,
  tintFor,
  userIn,
  utcDayKey,
  type CityIndex,
  type Doc,
} from "./schema";

export { COLLECTIONS } from "./schema";

const firestore = (): Firestore => adminDb();

/** Firestore document ids can't contain "/"; keep keys readable and bounded. */
const safeKey = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 120);
const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function createFirestoreRepositories(): Repositories {
  const fs = firestore();
  const users = fs.collection(COLLECTIONS.users);
  const props = fs.collection(COLLECTIONS.properties);
  const drafts = fs.collection(COLLECTIONS.drafts);
  const reviews = fs.collection(COLLECTIONS.reviews);
  const contactRef = (id: string) => props.doc(id).collection("private").doc("contact");
  const content = createFirestoreContent(fs);

  // City names on listings are translated through the `cities` collection (cached briefly).
  let citiesCache: { at: number; idx: Promise<CityIndex> } | null = null;
  const cities = () => {
    if (!citiesCache || Date.now() - citiesCache.at > 60_000) {
      const idx = content.listCities().then(cityIndex);
      idx.catch(() => (citiesCache = null));
      citiesCache = { at: Date.now(), idx };
    }
    return citiesCache.idx;
  };

  async function getAll(refs: FirebaseFirestore.DocumentReference[]) {
    const out: DocumentSnapshot[] = [];
    for (const part of chunks(refs, 100)) if (part.length) out.push(...(await fs.getAll(...part)));
    return out;
  }

  /** Ratings come from `reviews`, which Android writes too, so aggregates are derived on read. */
  async function withRatings(list: Property[]): Promise<Property[]> {
    if (!list.length) return list;
    const ids = list.map((p) => p.id);
    const snaps =
      ids.length > 30
        ? (await reviews.get()).docs
        : (await Promise.all(chunks(ids, 30).map((part) => reviews.where("propertyId", "in", part).get()))).flatMap((s) => s.docs);
    const byProperty = new Map<string, Rating[]>();
    for (const s of snaps) {
      const r = ratingIn(s.id, s.data());
      if (r) byProperty.set(r.propertyId, [...(byProperty.get(r.propertyId) ?? []), r]);
    }
    return list.map((p) => ({ ...p, ratingSummary: summarize(byProperty.get(p.id) ?? []) }));
  }

  const fromSnaps = async (snaps: DocumentSnapshot[]) => {
    const idx = await cities();
    return snaps.filter((s) => s.exists).map((s) => propertyIn(s.id, s.data()!, null, idx)).filter((p): p is Property => !!p);
  };

  /** Full listing (with private contact), whether published or a web draft. */
  async function load(id: string): Promise<{ property: Property; draft: boolean } | null> {
    const [snap, contact, idx] = await Promise.all([props.doc(id).get(), contactRef(id).get(), cities()]);
    if (snap.exists) {
      const p = propertyIn(id, snap.data()!, contact.exists ? contact.data()! : null, idx);
      return p ? { property: (await withRatings([p]))[0], draft: false } : null;
    }
    const d = await drafts.doc(id).get();
    const p = d.exists ? propertyIn(id, d.data()!, null, idx) : null;
    return p ? { property: p, draft: true } : null;
  }

  const draftDoc = (p: Omit<Property, "id">, idx: CityIndex) => ({ ...propertyOut(p, idx), contact: contactOut(p) });

  async function writeUser(id: string, patch: UserPatch) {
    const data: Doc = {};
    if (patch.displayName !== undefined) data.name = patch.displayName;
    if (patch.email !== undefined) data.email = patch.email;
    if (patch.phone !== undefined) data.phone = phoneOut(patch.phone);
    if (patch.photoUrl !== undefined) data.photoUrl = patch.photoUrl;
    if (patch.updatedAt !== undefined) data.updatedAt = ms(patch.updatedAt);
    if (patch.owner !== undefined) {
      // Android treats any `ownerSettings` as "owner tools on", so turned-off settings are parked aside.
      const o = patch.owner ? ownerOut(patch.owner) : null;
      data.ownerSettings = o && patch.owner?.enabled ? o : FieldValue.delete();
      data.ownerSettingsOff = o && !patch.owner?.enabled ? o : FieldValue.delete();
    }
    await users.doc(id).set(data, { merge: true });
  }

  return {
    docs: (path) => firestoreDocStore(fs, path),
    batch: (ops) => firestoreBatch(fs, ops),
    content,
    users: {
      async get(id) {
        const s = await users.doc(id).get();
        return s.exists ? userIn(id, s.data()!) : null;
      },
      async getMany(ids) {
        const snaps = await getAll([...new Set(ids)].filter(Boolean).map((id) => users.doc(id)));
        return snaps.filter((s) => s.exists).map((s) => userIn(s.id, s.data()!));
      },
      async createIfMissing(user: User) {
        const ref = users.doc(user.id);
        return fs.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists) return userIn(user.id, snap.data()!);
          tx.set(ref, {
            name: user.displayName,
            email: user.email,
            photoUrl: user.photoUrl,
            phone: phoneOut(user.phone),
            lastSignInAt: Date.now(),
            createdAt: ms(user.createdAt),
            updatedAt: ms(user.updatedAt),
          });
          return user;
        });
      },
      update: writeUser,
    },

    properties: {
      async get(id) {
        return (await load(id))?.property ?? null;
      },
      async getMany(ids) {
        const unique = [...new Set(ids)].filter(Boolean);
        return withRatings(await fromSnaps(await getAll(unique.map((id) => props.doc(id)))));
      },
      async create(input: NewProperty) {
        const idx = await cities();
        if (input.status === "draft") {
          const ref = drafts.doc();
          await ref.set({ ...draftDoc(input, idx), tint: tintFor(ref.id) });
          return { ...input, id: ref.id };
        }
        const ref = props.doc();
        const batch = fs.batch();
        batch.set(ref, { ...propertyOut(input, idx), tint: tintFor(ref.id), totalViews: input.viewCount, periodViews: 0, dailyViews: {} });
        batch.set(contactRef(ref.id), contactOut(input));
        await batch.commit();
        return { ...input, id: ref.id };
      },
      async update(id, patch: PropertyPatch) {
        const found = await load(id);
        if (!found) throw new Error(`Property ${id} not found`);
        const { property: current, draft } = found;
        const next = { ...current, ...patch };
        const idx = await cities();

        if (draft && next.status !== "draft") {
          // Publishing a draft: it becomes a regular listing Android can see.
          const batch = fs.batch();
          batch.set(props.doc(id), { ...propertyOut(next, idx), tint: tintFor(id), totalViews: 0, periodViews: 0, dailyViews: {} });
          batch.set(contactRef(id), contactOut(next));
          batch.delete(drafts.doc(id));
          await batch.commit();
          return;
        }
        if (draft) {
          await drafts.doc(id).set(draftDoc(next, idx), { merge: true });
          return;
        }

        const before = propertyOut(current, idx);
        const after = propertyOut(next, idx);
        const changed: Doc = {};
        for (const [k, v] of Object.entries(after)) if (!sameValue(before[k], v)) changed[k] = v;
        // Android-only fields only move when the web value really changed.
        if ("houseNumber" in changed && !("landmark" in changed)) changed.landmark = "";
        if ("city" in changed) changed.state = after.state;
        if (patch.publishedAt !== undefined && !sameValue(ms(current.publishedAt), ms(next.publishedAt))) {
          changed.periodViews = 0; // a new 15-day window, as Android's repost does
        }
        const batch = fs.batch();
        if (Object.keys(changed).length) batch.update(props.doc(id), changed);
        if (!sameValue(contactOut(current), contactOut(next))) batch.set(contactRef(id), contactOut(next));
        await batch.commit();
      },
      async delete(id) {
        const batch = fs.batch();
        batch.delete(contactRef(id));
        batch.delete(props.doc(id));
        batch.delete(drafts.doc(id));
        await batch.commit();
      },
      async listByOwner(ownerId) {
        const [live, unpublished] = await Promise.all([
          props.where("ownerId", "==", ownerId).get(),
          drafts.where("ownerId", "==", ownerId).get(),
        ]);
        return [...(await withRatings(await fromSnaps(live.docs))), ...(await fromSnaps(unpublished.docs))];
      },
      async findCandidates(_f: SearchFilters, limit) {
        // City and text are matched in memory: Android stores display names
        // ("Mumbai Metropolitan Region (MMR)") and no search tokens.
        const snap = await props.where("status", "==", STATUS.out("active")).orderBy("publishedAt", "desc").limit(limit).get();
        return withRatings(await fromSnaps(snap.docs));
      },
      async setRatingSummary() {
        // Derived from `reviews` on every read (Android writes reviews directly).
      },
    },

    ratings: {
      async get(propertyId, userId) {
        const s = await reviews.doc(reviewId(propertyId, userId)).get();
        return s.exists ? ratingIn(s.id, s.data()!) : null;
      },
      async upsert(rating) {
        const id = reviewId(rating.propertyId, rating.userId);
        await reviews.doc(id).set(ratingOut(rating));
        return { ...rating, id };
      },
      async listByProperty(propertyId) {
        const snap = await reviews.where("propertyId", "==", propertyId).get();
        return snap.docs.map((d) => ratingIn(d.id, d.data())).filter((r): r is Rating => !!r);
      },
      async listByUser(userId) {
        const snap = await reviews.where("userId", "==", userId).get();
        return snap.docs.map((d) => ratingIn(d.id, d.data())).filter((r): r is Rating => !!r);
      },
    },

    contacts: {
      async get(propertyId, userId) {
        const s = await users.doc(userId).get();
        if (!contactedIds(s.data()).includes(propertyId)) return null;
        // Android keeps only the list of contacted listings, not when or how.
        const at = new Date(0);
        const event: ContactEvent = { id: `${propertyId}_${userId}`, propertyId, ownerId: "", userId, channels: [], count: 1, firstAt: at, lastAt: at };
        return event;
      },
      async record({ propertyId, userId }) {
        // `users.contacted` is also what the shared rules check before a rating.
        await users.doc(userId).set({ contacted: FieldValue.arrayUnion(propertyId) }, { merge: true });
      },
    },

    saved: {
      async listByUser(userId) {
        const d = (await users.doc(userId).get()).data();
        const times = (d?.savedAt as Record<string, number> | undefined) ?? {};
        // Android appends to `saved`; without a web timestamp, list order stands in for time.
        return savedIds(d).map<SavedProperty>((propertyId, i) => ({
          id: `${userId}_${propertyId}`,
          userId,
          propertyId,
          createdAt: new Date(times[propertyId] ?? i),
        }));
      },
      async save(userId, propertyId, at) {
        await users.doc(userId).set({ saved: FieldValue.arrayUnion(propertyId), savedAt: { [propertyId]: at.getTime() } }, { merge: true });
      },
      async remove(userId, propertyId) {
        await users.doc(userId).set({ saved: FieldValue.arrayRemove(propertyId), savedAt: { [propertyId]: FieldValue.delete() } }, { merge: true });
      },
    },

    views: {
      async recordUnique(propertyId, viewerKey, day, at) {
        const viewRef = fs.collection(COLLECTIONS.views).doc(`${propertyId}_${safeKey(viewerKey)}_${day}`);
        return fs.runTransaction(async (tx) => {
          if ((await tx.get(viewRef)).exists) return false;
          tx.create(viewRef, { propertyId, viewerKey, date: day, createdAt: at.getTime() });
          // Same counters Android's Details screen bumps.
          tx.update(props.doc(propertyId), {
            totalViews: FieldValue.increment(1),
            periodViews: FieldValue.increment(1),
            [`dailyViews.${utcDayKey(at)}`]: FieldValue.increment(1),
          });
          return true;
        });
      },
      async dailyCounts(propertyId, days) {
        const daily = ((await props.doc(propertyId).get()).get("dailyViews") as Record<string, number> | undefined) ?? {};
        return days.map<DailyViews>((date) => ({ propertyId, date, count: daily[date.replace(/-/g, "")] ?? 0 }));
      },
    },
  };
}

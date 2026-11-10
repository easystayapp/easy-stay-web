/**
 * Storage ports. Services depend only on these interfaces, never on a
 * database SDK. To move to another database (Postgres, MongoDB, DynamoDB…)
 * implement `Repositories` and `FileStorage` for it and register the adapter
 * in `./index.ts` — nothing else changes.
 *
 * Contract for every adapter:
 * - Accept and return domain entities from `lib/domain/types` (ids are
 *   strings, times are `Date`). Convert at the adapter boundary.
 * - `null` and missing optional values round-trip as `null`.
 * - Methods documented as atomic must be atomic in the backing store.
 */
import type { AppConfig, City, HomeContent, Page, WelcomeContent } from "@/lib/domain/content";
import type { SearchFilters } from "@/lib/domain/search";
import type {
  ContactChannel,
  ContactEvent,
  DailyViews,
  ID,
  Property,
  Rating,
  RatingSummary,
  SavedProperty,
  User,
} from "@/lib/domain/types";

export type NewProperty = Omit<Property, "id">;
export type PropertyPatch = Partial<Omit<Property, "id" | "ownerId" | "createdAt">>;
export type UserPatch = Partial<Omit<User, "id" | "createdAt">>;

export interface UserRepository {
  get(id: ID): Promise<User | null>;
  getMany(ids: ID[]): Promise<User[]>;
  /** Creates the user if missing; returns the stored user either way. */
  createIfMissing(user: User): Promise<User>;
  update(id: ID, patch: UserPatch): Promise<void>;
}

export interface PropertyRepository {
  get(id: ID): Promise<Property | null>;
  getMany(ids: ID[]): Promise<Property[]>;
  create(data: NewProperty): Promise<Property>;
  update(id: ID, patch: PropertyPatch): Promise<void>;
  delete(id: ID): Promise<void>;
  listByOwner(ownerId: ID): Promise<Property[]>;
  /**
   * Candidate listings for a search. Adapters may use any of the filters to
   * narrow the result in the database, but must never drop a listing that
   * `matchesFilters` would accept. Services re-apply every filter, sort and
   * paginate in memory, so returning a superset is always safe.
   */
  findCandidates(filters: SearchFilters, limit: number): Promise<Property[]>;
  /** Atomic replace of the rating aggregate. */
  setRatingSummary(id: ID, summary: RatingSummary): Promise<void>;
}

export interface RatingRepository {
  get(propertyId: ID, userId: ID): Promise<Rating | null>;
  /** Insert or replace the single rating for (propertyId, userId). */
  upsert(rating: Omit<Rating, "id">): Promise<Rating>;
  listByProperty(propertyId: ID): Promise<Rating[]>;
  listByUser(userId: ID): Promise<Rating[]>;
}

export interface ContactRepository {
  get(propertyId: ID, userId: ID): Promise<ContactEvent | null>;
  /** Atomic upsert: first contact creates, later ones bump count/lastAt. */
  record(e: { propertyId: ID; ownerId: ID; userId: ID; channel: ContactChannel; at: Date }): Promise<void>;
}

export interface SavedRepository {
  listByUser(userId: ID): Promise<SavedProperty[]>;
  /** Idempotent. */
  save(userId: ID, propertyId: ID, at: Date): Promise<void>;
  /** Idempotent. */
  remove(userId: ID, propertyId: ID): Promise<void>;
}

export interface ViewRepository {
  /**
   * Atomically records one view per (property, viewer, day). Returns true
   * when the view is new, in which case the day's count and the property's
   * `viewCount` are both incremented in the same operation.
   */
  recordUnique(propertyId: ID, viewerKey: string, day: string, at: Date): Promise<boolean>;
  dailyCounts(propertyId: ID, days: string[]): Promise<DailyViews[]>;
}

/** Single-document content, keyed by name. */
export interface ContentDocs {
  app: AppConfig;
  home: HomeContent;
  welcome: WelcomeContent;
}

/**
 * Reference data and editable content (cities, home sections, pages).
 * Read on every page, so services cache it; written by the seed/migration
 * script or an admin tool.
 */
export interface ContentRepository {
  listCities(): Promise<City[]>;
  upsertCity(city: City): Promise<void>;
  getDoc<K extends keyof ContentDocs>(key: K): Promise<ContentDocs[K] | null>;
  putDoc<K extends keyof ContentDocs>(key: K, value: ContentDocs[K]): Promise<void>;
  getPage(slug: string): Promise<Page | null>;
  putPage(page: Page): Promise<void>;
}

/* ------------------------------------------------------------ doc stores */

export type Where = [field: string, op: "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "array-contains", value: unknown];

export interface Query {
  where?: Where[];
  orderBy?: [field: string, dir: "asc" | "desc"];
  limit?: number;
  /** Cursor: the `orderBy` field value of the last row of the previous page. */
  after?: unknown;
}

/** Atomic numeric increment, usable as a value in `merge`/batch ops. */
export interface Increment {
  __inc: number;
}
export const inc = (n: number): Increment => ({ __inc: n });

export interface DocStore<T extends { id: string }> {
  get(id: string): Promise<T | null>;
  getMany(ids: string[]): Promise<T[]>;
  /** Replace the whole document. */
  set(id: string, data: Omit<T, "id">): Promise<void>;
  /** Create only if absent. Returns false when it already existed (idempotent creates). */
  create(id: string, data: Omit<T, "id">): Promise<boolean>;
  /** Shallow merge; `inc()` values increment atomically. */
  merge(id: string, patch: Record<string, unknown>): Promise<void>;
  delete(id: string): Promise<void>;
  query(q: Query): Promise<T[]>;
  /** Read-modify-write in one transaction. Return `undefined` to leave the doc unchanged. */
  update<R>(id: string, fn: (current: T | null) => { next?: Omit<T, "id">; result: R }): Promise<R>;
}

export type BatchOp =
  | { op: "set"; path: string; id: string; data: Record<string, unknown> }
  | { op: "merge"; path: string; id: string; data: Record<string, unknown> }
  | { op: "delete"; path: string; id: string };

/** Collection layout for the transactional layer. All server-only (rules deny clients). */
export const PATHS = {
  userMeta: "userMeta",
  enquiries: "enquiries",
  messages: (enquiryId: string) => `enquiries/${enquiryId}/messages`,
  verifications: "verifications",
  safety: "propertySafety",
  cases: "cases",
  audit: "auditLog",
  notifications: "notifications",
} as const;

export interface Repositories {
  /** Typed document store over any collection path (see `PATHS`). */
  docs<T extends { id: string }>(path: string): DocStore<T>;
  /** Several writes across collections, committed atomically. */
  batch(ops: BatchOp[]): Promise<void>;
  content: ContentRepository;
  users: UserRepository;
  properties: PropertyRepository;
  ratings: RatingRepository;
  contacts: ContactRepository;
  saved: SavedRepository;
  views: ViewRepository;
}

export interface StoredFile {
  url: string;
  path: string;
}

export interface FileStat {
  size: number;
  contentType: string | null;
}

/** A short-lived URL the browser uploads to directly (no app-server hop). */
export interface PresignedUpload {
  uploadUrl: string;
  method: "PUT";
  /** Headers the browser must send with the PUT, exactly as given. */
  headers: Record<string, string>;
  path: string;
  url: string;
  expiresIn: number;
}

/**
 * Media storage port (listing photos and any future media). Objects are
 * addressed by a storage key (`path`); public URLs are always derived from
 * the key by the adapter, never accepted from clients.
 */
export interface FileStorage {
  /** Public URL for a stored object. */
  publicUrl(path: string): string;
  /** Server-side upload (used when direct uploads aren't available). */
  upload(path: string, data: Uint8Array, contentType: string): Promise<StoredFile>;
  /** Direct browser upload URL, or null if this backend can't presign. */
  presignUpload(path: string, contentType: string): Promise<PresignedUpload | null>;
  /** Object metadata, or null if it doesn't exist. */
  /** Short-lived read URL for private objects (KYC / NOC documents). */
  signedUrl?(path: string, expiresIn: number): Promise<string>;
  stat(path: string): Promise<FileStat | null>;
  delete(path: string): Promise<void>;
}

/**
 * Domain entities.
 *
 * These types are the single source of truth for the data model. They are
 * deliberately free of any database concepts (no Firestore Timestamps, no
 * ObjectIds, no DocumentReferences): ids are plain strings and times are
 * `Date`. Every storage adapter maps its own representation to and from
 * these shapes at its boundary, so swapping the database never touches
 * business logic or UI.
 */

export type ID = string;

/* ------------------------------------------------------------------ enums */

export const PROPERTY_TYPES = ["pg", "room", "flat", "hotel"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const SHARING_OPTIONS = [
  "1_sharing",
  "2_sharing",
  "3_sharing",
  "4_sharing",
  "5_sharing",
  "6_sharing",
  "single_room",
  "1rk",
  "1bhk",
  "2bhk",
  "3bhk",
  "4bhk",
] as const;
export type SharingOption = (typeof SHARING_OPTIONS)[number];

export const GENDERS = ["male", "female", "anyone"] as const;
export type Gender = (typeof GENDERS)[number];

export const FURNISHINGS = ["furnished", "semi", "unfurnished"] as const;
export type Furnishing = (typeof FURNISHINGS)[number];

export const AMENITIES = ["wifi", "ac", "parking", "attached_bath"] as const;
export type Amenity = (typeof AMENITIES)[number];

export const ELECTRICITY_BILLING = ["included", "metered", "fixed"] as const;
export type ElectricityBilling = (typeof ELECTRICITY_BILLING)[number];

/**
 * Stored listing status. `expired` is also *derived*: an `active` listing
 * whose `expiresAt` has passed is treated as expired everywhere (see
 * `effectiveStatus`), so correctness never depends on a background job.
 */
export const LISTING_STATUSES = ["draft", "active", "paused", "rented", "expired"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const CONTACT_METHODS = ["call", "whatsapp", "both"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const CONTACT_CHANNELS = ["call", "whatsapp"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const RATING_RELATIONS = ["visited", "stayed", "living"] as const;
export type RatingRelation = (typeof RATING_RELATIONS)[number];

export const RATING_FACTORS = ["property", "owner", "environment", "value", "food"] as const;
export type RatingFactor = (typeof RATING_FACTORS)[number];

/* --------------------------------------------------------- value objects */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Location {
  city: string;
  locality: string;
  address: string;
  geo: GeoPoint | null;
}

export interface Photo {
  /** Public URL used to render the image. */
  url: string;
  /** Storage key, used to delete the object later. */
  path: string;
}

export interface ListingContact {
  /** E.164, e.g. +919876543210. Never exposed before the seeker logs in. */
  phone: string;
  /** Separate WhatsApp number, or null to use `phone`. */
  whatsapp: string | null;
}

export interface FactorTotals {
  sum: number;
  count: number;
}

/** Denormalised rating aggregate kept on the property for fast reads. */
export interface RatingSummary {
  count: number;
  /** Mean of the combined score of every rating, or null with no ratings. */
  average: number | null;
  factors: Record<RatingFactor, FactorTotals>;
}

/* -------------------------------------------------------------- entities */

export interface OwnerNotificationPrefs {
  expiryReminders: boolean;
  newRating: boolean;
  weeklySummary: boolean;
}

/**
 * Owner tools are a setting on the single account type, not a separate
 * account. `null` means the user has never turned them on.
 */
export interface OwnerSettings {
  enabled: boolean;
  enabledAt: Date | null;
  /** Mobile number seekers call (E.164). */
  contactPhone: string;
  whatsappPhone: string | null;
  contactMethod: ContactMethod;
  /** Custom WhatsApp greeting; null uses the default for the property type. */
  greeting: string | null;
  notify: OwnerNotificationPrefs;
}

export interface User {
  id: ID;
  displayName: string;
  email: string | null;
  /** Mobile number (E.164) the user gave us, if any. */
  phone: string | null;
  photoUrl: string | null;
  owner: OwnerSettings | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: ID;
  ownerId: ID;
  type: PropertyType;
  sharing: SharingOption;
  title: string;
  /** Monthly rent in whole rupees (per bed for PG / Hostel). */
  rent: number;
  deposit: number | null;
  location: Location;
  photos: Photo[];
  availableFor: Gender;
  contact: ListingContact;
  furnishing: Furnishing | null;
  food: boolean;
  amenities: Amenity[];
  electricity: ElectricityBilling | null;
  /** null = available immediately. */
  availableFrom: Date | null;
  description: string;
  status: ListingStatus;
  publishedAt: Date | null;
  expiresAt: Date | null;
  /** Owner answered "still available" to an expiry reminder. */
  availabilityConfirmedAt: Date | null;
  viewCount: number;
  ratingSummary: RatingSummary;
  createdAt: Date;
  updatedAt: Date;
}

export type RatingScores = Record<Exclude<RatingFactor, "food">, number> & { food: number | null };

/** One rating per (property, user). Editable; never deletable by the owner. */
export interface Rating {
  id: ID;
  propertyId: ID;
  userId: ID;
  /** First name only, captured at rating time. */
  authorName: string;
  relation: RatingRelation;
  scores: RatingScores;
  /** Average of the rated factors. */
  combined: number;
  review: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Records that a seeker reached out to an owner through EasyStay. It is what
 * makes the seeker eligible to rate the property.
 */
export interface ContactEvent {
  id: ID;
  propertyId: ID;
  ownerId: ID;
  userId: ID;
  channels: ContactChannel[];
  count: number;
  firstAt: Date;
  lastAt: Date;
}

export interface SavedProperty {
  id: ID;
  userId: ID;
  propertyId: ID;
  createdAt: Date;
}

/** Views aggregated per property per calendar day (YYYY-MM-DD, IST). */
export interface DailyViews {
  propertyId: ID;
  date: string;
  count: number;
}

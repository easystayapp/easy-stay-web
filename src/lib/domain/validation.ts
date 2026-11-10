/**
 * Property form validation, shared by the browser form and the API so both
 * enforce exactly the same rules.
 */
import { MAX_PHOTOS, MIN_PHOTOS, SHARING_BY_TYPE } from "./catalog";
import { DomainError } from "./errors";
import { normalizeIndianMobile } from "./format";
import { parseDayKey } from "./time";
import {
  AMENITIES,
  ELECTRICITY_BILLING,
  FURNISHINGS,
  GENDERS,
  PROPERTY_TYPES,
  type Amenity,
  type ElectricityBilling,
  type Furnishing,
  type Gender,
  type GeoPoint,
  type Photo,
  type PropertyType,
  type SharingOption,
} from "./types";

/** What an owner submits when creating or editing a listing. */
export interface PropertyInput {
  type: PropertyType;
  sharing: SharingOption;
  title: string;
  rent: number | null;
  deposit: number | null;
  city: string;
  locality: string;
  address: string;
  geo: GeoPoint | null;
  photos: Photo[];
  availableFor: Gender;
  /** Separate WhatsApp number (any format) or empty to use the contact number. */
  whatsapp: string;
  furnishing: Furnishing | null;
  food: boolean;
  amenities: Amenity[];
  electricity: ElectricityBilling | null;
  /** YYYY-MM-DD, or null for immediately. */
  availableFrom: string | null;
  description: string;
}

export type ValidationMode = "draft" | "publish";
export type FieldErrors = Partial<Record<keyof PropertyInput, string>>;

export function emptyPropertyInput(city = ""): PropertyInput {
  return {
    type: "pg",
    sharing: "2_sharing",
    title: "",
    rent: null,
    deposit: null,
    city,
    locality: "",
    address: "",
    geo: null,
    photos: [],
    availableFor: "male",
    whatsapp: "",
    furnishing: null,
    food: false,
    amenities: [],
    electricity: null,
    availableFrom: null,
    description: "",
  };
}

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const money = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

/** Coerces untrusted JSON into a PropertyInput and reports field errors. */
export function checkPropertyInput(
  raw: unknown,
  mode: ValidationMode,
): { value: PropertyInput; errors: FieldErrors } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const type: PropertyType = oneOf(r.type, PROPERTY_TYPES) ? r.type : "pg";
  if (!oneOf(r.type, PROPERTY_TYPES)) errors.type = "Choose a property type.";
  const sharingOpts = SHARING_BY_TYPE[type];
  const sharing = (sharingOpts as string[]).includes(r.sharing as string)
    ? (r.sharing as SharingOption)
    : sharingOpts[0];
  if (!(sharingOpts as string[]).includes(r.sharing as string)) errors.sharing = "Choose an option.";

  const photos: Photo[] = Array.isArray(r.photos)
    ? r.photos
        .filter((p): p is Photo => !!p && typeof p.url === "string" && typeof p.path === "string")
        .slice(0, MAX_PHOTOS)
        .map((p) => ({ url: p.url, path: p.path }))
    : [];

  const geoRaw = r.geo as GeoPoint | null | undefined;
  const geo =
    geoRaw && Number.isFinite(geoRaw.lat) && Number.isFinite(geoRaw.lng) &&
    Math.abs(geoRaw.lat) <= 90 && Math.abs(geoRaw.lng) <= 180
      ? { lat: Number(geoRaw.lat), lng: Number(geoRaw.lng) }
      : null;

  const availableFrom =
    typeof r.availableFrom === "string" && parseDayKey(r.availableFrom) ? r.availableFrom : null;

  const value: PropertyInput = {
    type,
    sharing,
    title: str(r.title, 80),
    rent: money(r.rent),
    deposit: money(r.deposit),
    city: str(r.city, 60),
    locality: str(r.locality, 60),
    address: str(r.address, 200),
    geo,
    photos,
    availableFor: oneOf(r.availableFor, GENDERS) ? r.availableFor : "anyone",
    whatsapp: str(r.whatsapp, 20),
    furnishing: oneOf(r.furnishing, FURNISHINGS) ? r.furnishing : null,
    food: r.food === true,
    amenities: Array.isArray(r.amenities) ? [...new Set(r.amenities.filter((a) => oneOf(a, AMENITIES)))] as Amenity[] : [],
    electricity: oneOf(r.electricity, ELECTRICITY_BILLING) ? r.electricity : null,
    availableFrom,
    description: str(r.description, 1500),
  };

  if (value.title.length < 3) errors.title = "Give the property a name.";
  if (mode === "publish") {
    if (!value.rent || value.rent < 500) errors.rent = "Enter the monthly rent.";
    else if (value.rent > 1_000_000) errors.rent = "That rent looks too high.";
    if (!value.city) errors.city = "Enter the city.";
    if (!value.locality) errors.locality = "Enter the locality.";
    if (!value.address && !value.geo) errors.address = "Add the address or pin it on the map.";
    if (photos.length < MIN_PHOTOS) errors.photos = `Add at least ${MIN_PHOTOS} photos.`;
    if (!oneOf(r.availableFor, GENDERS)) errors.availableFor = "Choose who it's available for.";
  }
  if (value.whatsapp && !normalizeIndianMobile(value.whatsapp)) errors.whatsapp = "Enter a valid 10-digit mobile number.";
  if (value.deposit != null && value.deposit > 10_000_000) errors.deposit = "That deposit looks too high.";

  return { value, errors };
}

export function assertPropertyInput(raw: unknown, mode: ValidationMode): PropertyInput {
  const { value, errors } = checkPropertyInput(raw, mode);
  const keys = Object.keys(errors) as (keyof PropertyInput)[];
  if (keys.length) {
    throw new DomainError("invalid_input", errors[keys[0]]!, errors as Record<string, string>);
  }
  return value;
}

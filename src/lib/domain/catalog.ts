/**
 * Labels and option catalogs shared by UI, validation and search.
 */
import type {
  Amenity,
  ContactMethod,
  ElectricityBilling,
  Furnishing,
  Gender,
  ListingStatus,
  PropertyType,
  RatingFactor,
  RatingRelation,
  SharingOption,
} from "./types";

export const LISTING_DAYS = 15;
/** Reminder schedule, in days before expiry. */
export const REMINDER_DAYS_BEFORE = [3, 1] as const;
export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 5;
/** Below this many ratings a property shows "New" instead of a score. */
export const MIN_RATINGS_TO_SHOW = 3;

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  pg: "PG / Hostel",
  room: "Room",
  flat: "Flat",
};

export const PROPERTY_TYPE_SHORT: Record<PropertyType, string> = {
  pg: "PG",
  room: "Room",
  flat: "Flat",
};

export const SHARING_BY_TYPE: Record<PropertyType, SharingOption[]> = {
  pg: ["1_sharing", "2_sharing", "3_sharing", "4_sharing", "5_sharing", "6_sharing"],
  room: ["single_room", "1rk"],
  flat: ["1bhk", "2bhk", "3bhk", "4bhk"],
};

export const SHARING_FIELD_LABEL: Record<PropertyType, string> = {
  pg: "Sharing type",
  room: "Room type",
  flat: "Flat size (BHK)",
};

export const SHARING_LABEL: Record<SharingOption, string> = {
  "1_sharing": "1 sharing",
  "2_sharing": "2 sharing",
  "3_sharing": "3 sharing",
  "4_sharing": "4 sharing",
  "5_sharing": "5 sharing",
  "6_sharing": "6 sharing",
  single_room: "Single room",
  "1rk": "1 RK",
  "1bhk": "1 BHK",
  "2bhk": "2 BHK",
  "3bhk": "3 BHK",
  "4bhk": "4 BHK",
};

export const GENDER_LABEL: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  anyone: "Anyone",
};

export const FURNISHING_LABEL: Record<Furnishing, string> = {
  furnished: "Furnished",
  semi: "Semi-furnished",
  unfurnished: "Unfurnished",
};

export const AMENITY_LABEL: Record<Amenity, string> = {
  wifi: "Wi-Fi",
  ac: "AC",
  parking: "Parking",
  attached_bath: "Attached bathroom",
};

export const ELECTRICITY_LABEL: Record<ElectricityBilling, string> = {
  included: "Included in rent",
  metered: "Extra, as per meter",
  fixed: "Fixed monthly",
};

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "DRAFT",
  active: "ACTIVE",
  paused: "PAUSED",
  rented: "RENTED",
  expired: "EXPIRED",
};

export const CONTACT_METHOD_LABEL: Record<ContactMethod, string> = {
  call: "Call only",
  whatsapp: "WhatsApp only",
  both: "Both",
};

export const RATING_FACTOR_LABEL: Record<RatingFactor, string> = {
  property: "Property",
  owner: "Owner",
  environment: "Environment",
  value: "Value for money",
  food: "Food",
};

export const RATING_FACTOR_HINT: Record<RatingFactor, string> = {
  property: "Cleanliness, condition, matches photos",
  owner: "Responsive, honest, easy to deal with",
  environment: "Area, safety, noise, transport",
  value: "Rent vs what you get",
  food: "Taste & hygiene · only if food is served",
};

export const RATING_RELATION_LABEL: Record<RatingRelation, string> = {
  visited: "Visited",
  stayed: "Stayed here",
  living: "Living here",
};

// Cities, localities, home content, greetings and pages live in the database (see ./content.ts).

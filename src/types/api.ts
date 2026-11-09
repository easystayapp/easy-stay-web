/**
 * API contract: JSON-safe shapes the server returns and the browser reads.
 * Dates are ISO strings. These never expose storage details, and owner
 * contact numbers only appear in `ContactInfo` (after login).
 */
import type { ListingAction, ReminderKind } from "@/lib/domain/listing";
import type { PropertyInput } from "@/lib/domain/validation";
import type {
  Amenity,
  ContactChannel,
  ContactMethod,
  ElectricityBilling,
  Furnishing,
  Gender,
  GeoPoint,
  ListingStatus,
  OwnerNotificationPrefs,
  PropertyType,
  RatingFactor,
  RatingRelation,
  RatingScores,
  SharingOption,
} from "@/lib/domain/types";

export interface RatingBadge {
  average: number | null;
  count: number;
}

export interface PropertyCard {
  id: string;
  title: string;
  type: PropertyType;
  sharing: SharingOption;
  rent: number;
  locality: string;
  city: string;
  availableFor: Gender;
  furnishing: Furnishing | null;
  food: boolean;
  amenities: Amenity[];
  coverUrl: string | null;
  availableFrom: string | null;
  publishedAt: string | null;
  rating: RatingBadge;
}

export interface PropertyDetail extends PropertyCard {
  status: ListingStatus;
  deposit: number | null;
  address: string;
  geo: GeoPoint | null;
  photos: string[];
  electricity: ElectricityBilling | null;
  description: string;
  factors: Record<RatingFactor, number | null>;
  contactChannels: ContactChannel[];
  owner: { name: string; ownerRating: number | null };
  viewerIsOwner: boolean;
  expiresAt: string | null;
}

export interface SearchResponse {
  items: PropertyCard[];
  total: number;
  page: number;
  pageCount: number;
}

export interface Suggestion {
  kind: "locality" | "type";
  label: string;
  sub: string;
  query: { q: string; type?: PropertyType };
}

export interface ContactInfo {
  channel: ContactChannel;
  phone: string;
  whatsapp: string;
  message: string;
  telUrl: string;
  whatsappUrl: string;
}

export interface RatingItem {
  id: string;
  authorName: string;
  relation: RatingRelation;
  scores: RatingScores;
  combined: number;
  review: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingsResponse {
  items: RatingItem[];
  average: number | null;
  count: number;
  factors: Record<RatingFactor, number | null>;
}

export interface MyRatingResponse {
  eligible: boolean;
  reason: string | null;
  foodServed: boolean;
  rating: RatingItem | null;
  property: { id: string; title: string; locality: string };
}

export interface RatingInput {
  relation: RatingRelation;
  scores: Partial<Record<RatingFactor, number>>;
  review: string;
}

export interface MyRatingListItem extends RatingItem {
  property: { id: string; title: string; locality: string };
}

export interface OwnerSettingsDTO {
  enabled: boolean;
  enabledAt: string | null;
  contactPhone: string;
  whatsappPhone: string | null;
  contactMethod: ContactMethod;
  greeting: string | null;
  notify: OwnerNotificationPrefs;
}

export interface Me {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  owner: OwnerSettingsDTO | null;
  ownerToolsOn: boolean;
  savedCount: number;
}

export interface ProfileUpdate {
  displayName?: string;
}

export interface OwnerSettingsUpdate {
  whatsappPhone?: string | null;
  contactMethod?: ContactMethod;
  greeting?: string | null;
  notify?: Partial<OwnerNotificationPrefs>;
}

export interface OwnerListing extends PropertyCard {
  status: ListingStatus;
  viewCount: number;
  daysLeft: number | null;
  expiresAt: string | null;
}

export interface ReminderItem {
  id: string;
  kind: ReminderKind;
  propertyId: string;
  propertyTitle: string;
  at: string;
  daysLeft: number;
}

export interface OwnerListingsResponse {
  items: OwnerListing[];
  counts: Record<ListingStatus | "total", number>;
  reminder: ReminderItem | null;
}

export interface EditableProperty {
  id: string;
  status: ListingStatus;
  contactPhone: string;
  publishedAt: string | null;
  expiresAt: string | null;
  viewCount: number;
  input: PropertyInput;
}

export interface ListingActionRequest {
  action: ListingAction;
}

export interface PropertyStats {
  id: string;
  title: string;
  locality: string;
  status: ListingStatus;
  totalViews: number;
  periodViews: number;
  last7: { date: string; count: number }[];
  daysLeft: number | null;
  listingDay: number | null;
  publishedAt: string | null;
  expiresAt: string | null;
  rating: RatingBadge;
  factors: Record<RatingFactor, number | null>;
}

export interface SavedItem {
  property: PropertyCard;
  /** False once the listing is rented, paused or expired. */
  available: boolean;
  savedAt: string;
}

/** Response to an upload request: upload straight to storage, or via the API. */
export type UploadTicket =
  | {
      mode: "direct";
      uploadUrl: string;
      method: "PUT";
      headers: Record<string, string>;
      path: string;
      url: string;
      expiresIn: number;
    }
  | { mode: "server" };

export interface UploadedPhoto {
  url: string;
  path: string;
}

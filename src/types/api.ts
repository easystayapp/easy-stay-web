/**
 * API contract: JSON-safe shapes the server returns and the browser reads.
 * Dates are ISO strings. These never expose storage details, and owner
 * contact numbers only appear in `ContactInfo` (after login).
 */
import type { ListingAction, ReminderKind } from "@/lib/domain/listing";
import type {
  CaseKind,
  CaseStatus,
  CaseTarget,
  Enquiry,
  Message,
  ReportReason,
  SafetyBadge,
  Verification,
  VerificationKind,
} from "@/lib/domain/ops";
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

/** Safety facts small enough for a result card. */
export interface CardSafety {
  /** Published 0–100 health score, or null. */
  healthScore: number | null;
  womenFirst: boolean;
  ownerVerified: boolean;
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
  /** All photo URLs, cover first. */
  photos: string[];
  availableFrom: string | null;
  publishedAt: string | null;
  /** Last time the owner touched the listing (edit, repost or "still available"), for "Updated X ago". */
  freshAt: string | null;
  rating: RatingBadge;
  safety: CardSafety | null;
}

/** A home-carousel stay (the card already carries every photo). */
export type FeaturedStay = PropertyCard;

/** Public facts about a listing's owner (never contact details: those stay behind login). */
export interface OwnerProfile {
  name: string;
  /** Average "owner" score across all their listings' ratings. */
  ownerRating: number | null;
  ratingCount: number;
  /** Live listings right now. */
  listings: number;
  /** ISO date the account was created. */
  memberSince: string | null;
}

/** A highly rated owner for the home page. */
export interface TopOwner {
  name: string;
  rating: number;
  ratingCount: number;
  listings: number;
  locality: string;
  /** Their best-rated live listing, to open from the card. */
  propertyId: string;
  coverUrl: string | null;
}

export interface PropertyDetail extends PropertyCard {
  status: ListingStatus;
  deposit: number | null;
  address: string;
  geo: GeoPoint | null;
  electricity: ElectricityBilling | null;
  description: string;
  factors: Record<RatingFactor, number | null>;
  contactChannels: ContactChannel[];
  owner: OwnerProfile;
  viewerIsOwner: boolean;
  expiresAt: string | null;
  /** Full safety badge: health score, NOC expiry, KYC, Women-First. */
  safetyDetail: SafetyBadge | null;
}

export interface SearchResponse {
  items: PropertyCard[];
  total: number;
  page: number;
  pageCount: number;
}

export interface Suggestion {
  kind: "locality" | "type" | "property";
  label: string;
  sub: string;
  query: { q: string; type?: PropertyType };
  /** Listing suggestions open the listing directly. */
  href?: string;
  /** Cover photo for listing suggestions. */
  imageUrl?: string | null;
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

/** Turning owner tools on: the number seekers call (optional when re-enabling). */
export interface OwnerToolsRequest {
  contactPhone?: string;
}

export interface OwnerSettingsUpdate {
  contactPhone?: string;
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

/* ------------------------------------------------- enquiries & chat */

export type InboxSide = "seeker" | "owner";

export interface InboxItem extends Enquiry {
  unread: number;
  counterpart: string;
}

export interface InboxResponse {
  items: InboxItem[];
  next: number | null;
}

export interface ThreadResponse {
  enquiry: Enquiry;
  side: InboxSide;
  /** Shared only after the owner accepts. */
  contact: { name: string; phone: string | null; whatsapp: string | null } | null;
}

export interface MessagesResponse {
  items: Message[];
  next: number | null;
}

export type EnquiryAction = "accept" | "decline" | "close" | "reschedule" | "propose";

/* ------------------------------------------------- reports & grievances */

export interface CaseRequest {
  kind: "report" | "grievance";
  targetType: CaseTarget;
  targetId?: string;
  reason: ReportReason;
  details?: string;
}

export interface MyCase {
  id: string;
  kind: CaseKind;
  status: CaseStatus;
  reason: ReportReason;
  details: string;
  targetType: CaseTarget;
  targetId: string;
  targetTitle: string | null;
  acknowledgeBy: number;
  resolveBy: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
  resolution: string | null;
  createdAt: number;
  overdue: boolean;
}

/* ------------------------------------------------------ verification */

/** A submission as the owner sees it (file keys are never returned). */
export type MyVerification = Omit<Verification, "files">;

export interface VerificationRequest {
  kind: VerificationKind;
  /** Listing id for NOCs and photos; omitted for KYC. */
  subjectId?: string;
  files: string[];
  documentType?: "aadhaar" | "pan";
  /** NOC expiry (epoch ms). */
  expiresAt?: number;
}

export type DocUploadTicket =
  | { mode: "direct"; uploadUrl: string; method: "PUT"; headers: Record<string, string>; path: string; expiresIn: number }
  | { mode: "unsupported"; path: string };

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

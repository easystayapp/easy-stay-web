/** Domain entity → API DTO mapping. The only place DTOs are built. */
import type {
  EditableProperty,
  Me,
  OwnerListing,
  PropertyCard,
  PropertyDetail,
  RatingItem,
} from "@/types/api";
import { firstName } from "@/lib/domain/format";
import { daysLeft, effectiveStatus } from "@/lib/domain/listing";
import { factorAverage } from "@/lib/domain/rating";
import { dayKey } from "@/lib/domain/time";
import {
  RATING_FACTORS,
  type ContactChannel,
  type Property,
  type Rating,
  type RatingFactor,
  type User,
} from "@/lib/domain/types";
import type { PropertyInput } from "@/lib/domain/validation";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function factorAverages(p: Property): Record<RatingFactor, number | null> {
  const out = {} as Record<RatingFactor, number | null>;
  for (const f of RATING_FACTORS) out[f] = factorAverage(p.ratingSummary, f);
  return out;
}

export function toCard(p: Property): PropertyCard {
  return {
    id: p.id,
    title: p.title,
    type: p.type,
    sharing: p.sharing,
    rent: p.rent,
    locality: p.location.locality,
    city: p.location.city,
    availableFor: p.availableFor,
    furnishing: p.furnishing,
    food: p.food,
    amenities: p.amenities,
    coverUrl: p.photos[0]?.url ?? null,
    photos: p.photos.map((x) => x.url),
    availableFrom: iso(p.availableFrom),
    publishedAt: iso(p.publishedAt),
    rating: { average: p.ratingSummary.average, count: p.ratingSummary.count },
  };
}

export function contactChannelsFor(owner: User | null): ContactChannel[] {
  const m = owner?.owner?.contactMethod ?? "both";
  return m === "both" ? ["whatsapp", "call"] : [m];
}

export function toDetail(p: Property, owner: User | null, viewerId: string | null, now = new Date()): PropertyDetail {
  return {
    ...toCard(p),
    status: effectiveStatus(p, now),
    deposit: p.deposit,
    address: p.location.address,
    geo: p.location.geo,
    electricity: p.electricity,
    description: p.description,
    factors: factorAverages(p),
    contactChannels: contactChannelsFor(owner),
    owner: { name: firstName(owner?.displayName ?? "Owner"), ownerRating: factorAverage(p.ratingSummary, "owner") },
    viewerIsOwner: viewerId === p.ownerId,
    expiresAt: iso(p.expiresAt),
  };
}

export function toOwnerListing(p: Property, now = new Date()): OwnerListing {
  return {
    ...toCard(p),
    status: effectiveStatus(p, now),
    viewCount: p.viewCount,
    daysLeft: daysLeft(p, now),
    expiresAt: iso(p.expiresAt),
  };
}

export function toRatingItem(r: Rating): RatingItem {
  return {
    id: r.id,
    authorName: r.authorName,
    relation: r.relation,
    scores: r.scores,
    combined: r.combined,
    review: r.review,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toMe(u: User, savedCount: number): Me {
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    phone: u.phone,
    photoUrl: u.photoUrl,
    owner: u.owner ? { ...u.owner, enabledAt: iso(u.owner.enabledAt) } : null,
    ownerToolsOn: !!u.owner?.enabled,
    savedCount,
  };
}

export function toInput(p: Property): PropertyInput {
  return {
    type: p.type,
    sharing: p.sharing,
    title: p.title,
    rent: p.rent,
    deposit: p.deposit,
    city: p.location.city,
    locality: p.location.locality,
    address: p.location.address,
    geo: p.location.geo,
    photos: p.photos,
    availableFor: p.availableFor,
    whatsapp: p.contact.whatsapp ?? "",
    furnishing: p.furnishing,
    food: p.food,
    amenities: p.amenities,
    electricity: p.electricity,
    availableFrom: p.availableFrom ? dayKey(p.availableFrom) : null,
    description: p.description,
  };
}

export function toEditable(p: Property, now = new Date()): EditableProperty {
  return {
    id: p.id,
    status: effectiveStatus(p, now),
    contactPhone: p.contact.phone,
    publishedAt: iso(p.publishedAt),
    expiresAt: iso(p.expiresAt),
    viewCount: p.viewCount,
    input: toInput(p),
  };
}

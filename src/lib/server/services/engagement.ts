/** Seeker-side engagement: contacting owners, rating, saving. */
import type {
  ContactInfo,
  MyRatingListItem,
  MyRatingResponse,
  RatingInput,
  RatingsResponse,
  SavedItem,
} from "@/types/api";
import { DomainError } from "@/lib/domain/errors";
import { firstName } from "@/lib/domain/format";
import { isPubliclyVisible } from "@/lib/domain/listing";
import { combinedScore, summarize, validateScores } from "@/lib/domain/rating";
import { CONTACT_CHANNELS, RATING_RELATIONS, type ContactChannel, type Property } from "@/lib/domain/types";
import type { AuthUser } from "../auth";
import type { Repositories } from "../repositories";
import { greeting } from "./content";
import { contactChannelsFor, factorAverages, toCard, toRatingItem } from "./mappers";
import { getUser } from "./users";

async function loadVisible(repos: Repositories, id: string): Promise<Property> {
  const p = await repos.properties.get(id);
  if (!p || !isPubliclyVisible(p)) {
    throw new DomainError("not_found", "This property is no longer available.");
  }
  return p;
}

/* ------------------------------------------------------------- contact */

/**
 * Reveals the owner's number to a logged-in seeker and records the contact,
 * which is what later allows that seeker to rate the property.
 */
export async function contactOwner(
  repos: Repositories,
  auth: AuthUser,
  propertyId: string,
  channel: unknown,
): Promise<ContactInfo> {
  if (!CONTACT_CHANNELS.includes(channel as ContactChannel)) {
    throw new DomainError("invalid_input", "Choose call or WhatsApp.");
  }
  const p = await loadVisible(repos, propertyId);
  const owner = await repos.users.get(p.ownerId);
  if (!contactChannelsFor(owner).includes(channel as ContactChannel)) {
    throw new DomainError("forbidden", "The owner prefers a different contact method.");
  }
  const phone = owner?.owner?.contactPhone ?? p.contact.phone;
  const whatsapp = p.contact.whatsapp ?? owner?.owner?.whatsappPhone ?? phone;
  const message = owner?.owner?.greeting ?? (await greeting(repos, p.type));

  if (auth.uid !== p.ownerId) {
    await repos.contacts.record({
      propertyId: p.id,
      ownerId: p.ownerId,
      userId: auth.uid,
      channel: channel as ContactChannel,
      at: new Date(),
    });
  }
  return {
    channel: channel as ContactChannel,
    phone,
    whatsapp,
    message,
    telUrl: `tel:${phone}`,
    whatsappUrl: `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
  };
}

/* -------------------------------------------------------------- ratings */

export async function listRatings(repos: Repositories, propertyId: string): Promise<RatingsResponse> {
  const p = await repos.properties.get(propertyId);
  if (!p) throw new DomainError("not_found", "This property no longer exists.");
  const ratings = await repos.ratings.listByProperty(propertyId);
  ratings.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return {
    items: ratings.map(toRatingItem),
    average: p.ratingSummary.average,
    count: p.ratingSummary.count,
    factors: factorAverages(p),
  };
}

async function eligibility(repos: Repositories, auth: AuthUser, p: Property): Promise<string | null> {
  if (p.ownerId === auth.uid) return "You can't rate your own property.";
  const contact = await repos.contacts.get(p.id, auth.uid);
  if (!contact) return "Only people who contacted the owner through EasyStay can rate this property.";
  return null;
}

export async function getMyRating(repos: Repositories, auth: AuthUser, propertyId: string): Promise<MyRatingResponse> {
  const p = await repos.properties.get(propertyId);
  if (!p) throw new DomainError("not_found", "This property no longer exists.");
  const [reason, rating] = await Promise.all([eligibility(repos, auth, p), repos.ratings.get(p.id, auth.uid)]);
  return {
    eligible: !reason,
    reason,
    foodServed: p.food,
    rating: rating ? toRatingItem(rating) : null,
    property: { id: p.id, title: p.title, locality: p.location.locality },
  };
}

export async function upsertRating(
  repos: Repositories,
  auth: AuthUser,
  propertyId: string,
  body: RatingInput,
): Promise<MyRatingResponse> {
  // Ratings stay with a property across reposts, so rented/expired listings can still be rated.
  const p = await repos.properties.get(propertyId);
  if (!p) throw new DomainError("not_found", "This property no longer exists.");
  const reason = await eligibility(repos, auth, p);
  if (reason) throw new DomainError("not_eligible", reason);
  if (!RATING_RELATIONS.includes(body?.relation)) {
    throw new DomainError("invalid_input", "Tell us how you know this place.", { relation: "required" });
  }
  const scores = validateScores(body.scores ?? {}, p.food);
  const [user, existing] = await Promise.all([getUser(repos, auth), repos.ratings.get(p.id, auth.uid)]);
  const now = new Date();
  await repos.ratings.upsert({
    propertyId: p.id,
    userId: auth.uid,
    authorName: firstName(user.displayName || "Member"),
    relation: body.relation,
    scores,
    combined: combinedScore(scores),
    review: typeof body.review === "string" ? body.review.trim().slice(0, 1000) : "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  // Recompute from source so the aggregate can never drift.
  await repos.properties.setRatingSummary(p.id, summarize(await repos.ratings.listByProperty(p.id)));
  return getMyRating(repos, auth, propertyId);
}

export async function listMyRatings(repos: Repositories, auth: AuthUser): Promise<MyRatingListItem[]> {
  const ratings = await repos.ratings.listByUser(auth.uid);
  const props = new Map((await repos.properties.getMany(ratings.map((r) => r.propertyId))).map((p) => [p.id, p]));
  return ratings
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((r) => {
      const p = props.get(r.propertyId);
      return {
        ...toRatingItem(r),
        property: { id: r.propertyId, title: p?.title ?? "Removed listing", locality: p?.location.locality ?? "" },
      };
    });
}

/* ---------------------------------------------------------------- saved */

export async function listSaved(repos: Repositories, auth: AuthUser): Promise<SavedItem[]> {
  const saved = await repos.saved.listByUser(auth.uid);
  const props = new Map((await repos.properties.getMany(saved.map((s) => s.propertyId))).map((p) => [p.id, p]));
  const now = new Date();
  return saved
    .filter((s) => props.has(s.propertyId))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((s) => {
      const p = props.get(s.propertyId)!;
      return { property: toCard(p), available: isPubliclyVisible(p, now), savedAt: s.createdAt.toISOString() };
    });
}

export async function listSavedIds(repos: Repositories, auth: AuthUser): Promise<string[]> {
  return (await repos.saved.listByUser(auth.uid)).map((s) => s.propertyId);
}

export async function saveProperty(repos: Repositories, auth: AuthUser, propertyId: string): Promise<void> {
  const p = await repos.properties.get(propertyId);
  if (!p) throw new DomainError("not_found", "This property no longer exists.");
  await repos.saved.save(auth.uid, propertyId, new Date());
}

export async function unsaveProperty(repos: Repositories, auth: AuthUser, propertyId: string): Promise<void> {
  await repos.saved.remove(auth.uid, propertyId);
}

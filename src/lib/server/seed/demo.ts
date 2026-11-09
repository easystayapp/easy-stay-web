/**
 * Demo data written through the repository interfaces, so the same seed
 * works for every backend (`npm run seed` for Firestore; automatic for the
 * in-memory backend).
 */
import { combinedScore, summarize } from "@/lib/domain/rating";
import { addDays } from "@/lib/domain/time";
import type {
  Amenity,
  Furnishing,
  Gender,
  Property,
  PropertyType,
  Rating,
  RatingRelation,
  SharingOption,
  User,
} from "@/lib/domain/types";
import { emptySummary } from "@/lib/domain/rating";
import type { Repositories } from "../repositories/types";

const OWNER_ID = "demo-owner-rahul";

interface Seed {
  title: string;
  type: PropertyType;
  sharing: SharingOption;
  rent: number;
  deposit: number | null;
  locality: string;
  gender: Gender;
  furnishing: Furnishing | null;
  food: boolean;
  amenities: Amenity[];
  availableInDays: number;
  publishedDaysAgo: number;
  ratings: [number, number, number, number, number | null][];
  description: string;
}

const SEEDS: Seed[] = [
  { title: "Single Sharing PG", type: "pg", sharing: "1_sharing", rent: 8000, deposit: 8000, locality: "Madhapur", gender: "male", furnishing: "furnished", food: true, amenities: ["wifi", "ac", "parking", "attached_bath"], availableInDays: 0, publishedDaysAgo: 10, ratings: [[5, 5, 4, 5, 4], [4, 5, 3, 4, null], [5, 4, 4, 4, 4], [4, 5, 5, 4, 5]], description: "Walking distance to Hitech City metro. Daily housekeeping, home-style meals twice a day, power backup and 24×7 security." },
  { title: "2 BHK Flat", type: "flat", sharing: "2bhk", rent: 18000, deposit: 50000, locality: "Kondapur", gender: "anyone", furnishing: "semi", food: false, amenities: ["parking", "attached_bath"], availableInDays: 0, publishedDaysAgo: 12, ratings: [[4, 4, 4, 4, null], [4, 5, 4, 4, null], [4, 4, 5, 4, null]], description: "Bright east-facing flat on the 3rd floor with lift, covered parking and a balcony. Close to Botanical Garden." },
  { title: "Double Sharing Room", type: "room", sharing: "single_room", rent: 6000, deposit: 6000, locality: "Gachibowli", gender: "anyone", furnishing: "furnished", food: false, amenities: ["wifi"], availableInDays: 0, publishedDaysAgo: 3, ratings: [], description: "Spacious room near DLF Cyber City, shared kitchen, Wi-Fi included." },
  { title: "Girls Hostel, 3 Sharing", type: "pg", sharing: "3_sharing", rent: 5500, deposit: 5000, locality: "Kukatpally", gender: "female", furnishing: "furnished", food: true, amenities: ["wifi"], availableInDays: 0, publishedDaysAgo: 1, ratings: [[4, 4, 4, 4, 4], [5, 4, 4, 5, 4], [4, 4, 3, 4, 3]], description: "Safe, CCTV-monitored hostel 5 minutes from KPHB metro. Veg and non-veg meals." },
  { title: "Double Sharing PG", type: "pg", sharing: "2_sharing", rent: 6500, deposit: 6500, locality: "Gachibowli", gender: "male", furnishing: "furnished", food: true, amenities: ["ac"], availableInDays: 6, publishedDaysAgo: 4, ratings: [[4, 4, 4, 4, 4], [4, 4, 4, 4, 4], [4, 4, 4, 4, 4]], description: "AC rooms, washing machine, RO water and meals included." },
  { title: "Executive PG, Single", type: "pg", sharing: "1_sharing", rent: 9500, deposit: 10000, locality: "Gachibowli", gender: "male", furnishing: "furnished", food: true, amenities: ["wifi", "parking"], availableInDays: 0, publishedDaysAgo: 2, ratings: [], description: "Premium single rooms near DLF with gym access and housekeeping." },
  { title: "Single PG with AC", type: "pg", sharing: "1_sharing", rent: 9000, deposit: 9000, locality: "Gachibowli", gender: "anyone", furnishing: "furnished", food: true, amenities: ["wifi", "ac", "attached_bath"], availableInDays: 0, publishedDaysAgo: 5, ratings: [[5, 4, 4, 5, 4], [4, 5, 5, 4, 4], [5, 4, 4, 4, 5]], description: "Co-living PG with AC rooms, attached bathrooms and a rooftop lounge." },
  { title: "1 RK near Hitech City", type: "room", sharing: "1rk", rent: 9000, deposit: 18000, locality: "Hitech City", gender: "anyone", furnishing: "semi", food: false, amenities: ["wifi", "parking"], availableInDays: 0, publishedDaysAgo: 6, ratings: [], description: "Independent 1 RK with a kitchenette, 10 minutes walk to Mindspace." },
  { title: "3 BHK Family Flat", type: "flat", sharing: "3bhk", rent: 32000, deposit: 100000, locality: "Madhapur", gender: "anyone", furnishing: "furnished", food: false, amenities: ["ac", "parking", "attached_bath"], availableInDays: 10, publishedDaysAgo: 7, ratings: [[5, 5, 5, 4, null], [4, 5, 5, 4, null], [5, 4, 4, 4, null]], description: "Gated community with pool and clubhouse. Fully furnished with appliances." },
];

const RELATIONS: RatingRelation[] = ["stayed", "visited", "living", "visited"];
const REVIEWERS = ["Arjun", "Priya", "Sneha", "Vikram"];
const REVIEWS = [
  "Clean rooms and the owner responds quickly. Food is homely.",
  "Visited before deciding. Matches the photos, good location.",
  "Living here for 3 months — quiet area, easy commute.",
  "",
];

/** Writes the demo owner, listings and ratings. Returns the listings created. */
export async function seedDemoData(repos: Repositories, now = new Date()): Promise<Property[]> {
  const owner: User = {
    id: OWNER_ID,
    displayName: "Rahul",
    email: "rahul@example.com",
    phone: "+919876543210",
    photoUrl: null,
    owner: {
      enabled: true,
      enabledAt: now,
      contactPhone: "+919876543210",
      whatsappPhone: null,
      contactMethod: "both",
      greeting: null,
      notify: { expiryReminders: true, newRating: true, weeklySummary: false },
    },
    createdAt: now,
    updatedAt: now,
  };
  await repos.users.createIfMissing(owner);

  const created: Property[] = [];
  for (const s of SEEDS) {
    const publishedAt = addDays(now, -s.publishedDaysAgo);
    const property = await repos.properties.create({
      ownerId: OWNER_ID,
      type: s.type,
      sharing: s.sharing,
      title: s.title,
      rent: s.rent,
      deposit: s.deposit,
      location: { city: "Hyderabad", locality: s.locality, address: "", geo: null },
      photos: [],
      availableFor: s.gender,
      contact: { phone: owner.phone!, whatsapp: null },
      furnishing: s.furnishing,
      food: s.food,
      amenities: s.amenities,
      electricity: "included",
      availableFrom: s.availableInDays ? addDays(now, s.availableInDays) : null,
      description: s.description,
      status: "active",
      publishedAt,
      expiresAt: addDays(publishedAt, 15),
      availabilityConfirmedAt: null,
      viewCount: 20 + s.publishedDaysAgo * 17,
      ratingSummary: emptySummary(),
      createdAt: publishedAt,
      updatedAt: publishedAt,
    });

    const ratings: Rating[] = [];
    for (const [i, [property_, owner_, environment, value, food]] of s.ratings.entries()) {
      const userId = `demo-reviewer-${i}`;
      const scores = { property: property_, owner: owner_, environment, value, food: s.food ? food : null };
      const at = addDays(now, -i - 1);
      await repos.contacts.record({ propertyId: property.id, ownerId: OWNER_ID, userId, channel: "whatsapp", at });
      ratings.push(
        await repos.ratings.upsert({
          propertyId: property.id,
          userId,
          authorName: REVIEWERS[i % REVIEWERS.length],
          relation: RELATIONS[i % RELATIONS.length],
          scores,
          combined: combinedScore(scores),
          review: REVIEWS[i % REVIEWS.length],
          createdAt: at,
          updatedAt: at,
        }),
      );
    }
    if (ratings.length) await repos.properties.setRatingSummary(property.id, summarize(ratings));
    created.push(property);
  }
  return created;
}

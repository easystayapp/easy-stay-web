/**
 * Rating rules.
 * - Combined rating = average of Property, Owner, Environment, Value for money
 *   and Food (Food only when the place serves meals).
 * - Only people who contacted the owner via EasyStay can rate; one rating per
 *   person, editable. Ratings stay with the property across reposts.
 * - Show "New" until a property has MIN_RATINGS_TO_SHOW ratings.
 */
import { MIN_RATINGS_TO_SHOW } from "./catalog";
import { DomainError } from "./errors";
import { RATING_FACTORS, type Rating, type RatingFactor, type RatingScores, type RatingSummary } from "./types";

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function ratedFactors(foodServed: boolean): RatingFactor[] {
  return RATING_FACTORS.filter((f) => f !== "food" || foodServed);
}

export function combinedScore(scores: RatingScores): number {
  const vals = RATING_FACTORS.map((f) => scores[f]).filter((v): v is number => typeof v === "number" && v > 0);
  return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

export function validateScores(raw: Partial<Record<RatingFactor, unknown>>, foodServed: boolean): RatingScores {
  const out = { food: null } as RatingScores;
  for (const f of ratedFactors(foodServed)) {
    const v = Number(raw[f]);
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      throw new DomainError("invalid_input", `Rate ${f === "value" ? "value for money" : f} from 1 to 5 stars.`, {
        [f]: "required",
      });
    }
    (out as Record<RatingFactor, number | null>)[f] = v;
  }
  return out;
}

export function emptySummary(): RatingSummary {
  const factors = {} as RatingSummary["factors"];
  for (const f of RATING_FACTORS) factors[f] = { sum: 0, count: 0 };
  return { count: 0, average: null, factors };
}

export function summarize(ratings: Pick<Rating, "scores" | "combined">[]): RatingSummary {
  const s = emptySummary();
  let total = 0;
  for (const r of ratings) {
    s.count += 1;
    total += r.combined;
    for (const f of RATING_FACTORS) {
      const v = r.scores[f];
      if (typeof v === "number" && v > 0) {
        s.factors[f].sum += v;
        s.factors[f].count += 1;
      }
    }
  }
  s.average = s.count ? round1(total / s.count) : null;
  return s;
}

export function factorAverage(s: RatingSummary, f: RatingFactor): number | null {
  const t = s.factors[f];
  return t && t.count ? round1(t.sum / t.count) : null;
}

export function isNewListing(s: Pick<RatingSummary, "count">): boolean {
  return s.count < MIN_RATINGS_TO_SHOW;
}

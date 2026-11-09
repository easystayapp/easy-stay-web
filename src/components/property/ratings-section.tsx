import Link from "next/link";
import { FactorBar, StarIcon, StarRow } from "@/components/ui/primitives";
import { RATING_FACTOR_LABEL, RATING_RELATION_LABEL } from "@/lib/domain/catalog";
import type { RatingItem, RatingsResponse } from "@/types/api";
import { RATING_FACTORS } from "@/lib/domain/types";

const SHORT: Record<string, string> = { property: "Property", owner: "Owner", environment: "Environment", value: "Value", food: "Food" };

function breakdown(r: RatingItem) {
  return RATING_FACTORS.filter((f) => r.scores[f] != null)
    .map((f) => `${SHORT[f]} ${r.scores[f]}`)
    .join(" · ");
}

/** Combined rating, factor bars and reviews (06 / W3). */
export function RatingsSection({
  ratings,
  foodServed,
  onRate,
}: {
  ratings: RatingsResponse;
  foodServed: boolean;
  onRate: () => void;
}) {
  const hasScore = ratings.count >= 3 && ratings.average != null;
  return (
    <section id="ratings" className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">Ratings</h2>
        <button type="button" onClick={onRate} className="text-sm font-bold text-brand hover:text-brand-dark">
          Rate this property
        </button>
      </div>

      <div className="grid gap-6 rounded-[20px] bg-surface p-5 sm:grid-cols-[160px_1fr] md:p-6">
        <div className="flex flex-col items-start gap-1.5">
          {hasScore ? (
            <>
              <span className="text-[44px] leading-none font-extrabold">{ratings.average!.toFixed(1)}</span>
              <StarRow value={ratings.average!} />
              <span className="text-xs font-semibold text-muted-foreground">
                Combined rating
                <br />
                from {ratings.count} {ratings.count === 1 ? "person" : "people"} who contacted the owner
              </span>
            </>
          ) : (
            <>
              <span className="rounded-lg bg-ok-bg px-2.5 py-1 text-sm font-extrabold text-ok">New</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {ratings.count === 0 ? "No ratings yet." : `${ratings.count} of 3 ratings needed to show a score.`}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3">
          {RATING_FACTORS.filter((f) => f !== "food" || foodServed).map((f) => (
            <FactorBar key={f} label={RATING_FACTOR_LABEL[f]} value={hasScore ? ratings.factors[f] : null} />
          ))}
        </div>
      </div>

      {ratings.items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {ratings.items.slice(0, 10).map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">
                  {r.authorName} <span className="font-semibold text-muted-foreground">· {RATING_RELATION_LABEL[r.relation]}</span>
                </span>
                <span className="flex items-center gap-1 text-[13px] font-extrabold">
                  <StarIcon />
                  {r.combined.toFixed(1)}
                </span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{breakdown(r)}</span>
              {r.review && <p className="text-sm leading-relaxed text-muted-2">{r.review}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Only people who contacted the owner through EasyStay can rate. One rating per person, editable anytime.{" "}
        <Link href="/help#ratings">How ratings work</Link>
      </p>
    </section>
  );
}

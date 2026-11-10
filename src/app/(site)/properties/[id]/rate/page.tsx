"use client";

import { Info, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { useToast } from "@/hooks/use-toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorNote, OptionGrid } from "@/components/ui/primitives";
import { Textarea } from "@/components/ui/textarea";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { RATING_FACTOR_HINT, RATING_FACTOR_LABEL, RATING_RELATION_LABEL } from "@/lib/domain/catalog";
import type { MyRatingResponse } from "@/types/api";
import { ratedFactors, round1 } from "@/lib/domain/rating";
import { RATING_RELATIONS, type RatingFactor, type RatingRelation } from "@/lib/domain/types";

function RateForm({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<MyRatingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Partial<Record<RatingFactor, number>>>({});
  const [relation, setRelation] = useState<RatingRelation>("visited");
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .myRating(id)
      .then((r) => {
        setData(r);
        if (r.rating) {
          const s: Partial<Record<RatingFactor, number>> = {};
          for (const [k, v] of Object.entries(r.rating.scores)) if (v) s[k as RatingFactor] = v;
          setScores(s);
          setRelation(r.rating.relation);
          setReview(r.rating.review);
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error && !data) return <div className="container-page py-10"><ErrorNote>{error}</ErrorNote></div>;
  if (!data) return <PageSpinner />;
  if (!data.eligible) {
    return (
      <div className="container-page py-12">
        <EmptyState
          icon={<Info className="size-7" />}
          title="You can't rate this place yet"
          body={data.reason ?? ""}
          action={<ButtonLink href={`/properties/${id}`} size="sm">Back to property</ButtonLink>}
        />
      </div>
    );
  }

  const factors = ratedFactors(data.foodServed);
  const vals = factors.map((f) => scores[f] ?? 0).filter((v) => v > 0);
  const combined = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "–";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (factors.some((f) => !scores[f])) return setError("Rate every factor from 1 to 5 stars.");
    setError(null);
    setBusy(true);
    try {
      await api.rate(id, { relation, scores, review });
      toast(data.rating ? "Your rating was updated" : "Thanks for rating!");
      router.push(`/properties/${id}#ratings`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pt-5 pb-32 sm:px-6 md:py-10" noValidate>
      <PageHeader back={`/properties/${id}`} title={data.rating ? "Edit your rating" : "Rate this property"} subtitle={`${data.property.title} · ${data.property.locality}`} />

      <div className="flex items-center gap-4 rounded-[20px] bg-blush p-4">
        <div className="flex h-16 w-20 items-center justify-center gap-1 rounded-2xl bg-white text-[26px] font-extrabold">
          <Star aria-hidden className="size-5 fill-star text-star" />
          {combined}
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-extrabold">Your combined rating</span>
          <span className="text-xs text-muted-foreground">Average of the factors you rate below</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label>How do you know this place?</Label>
        <OptionGrid
          label="How do you know this place?"
          options={RATING_RELATIONS.map((r) => ({ value: r, label: RATING_RELATION_LABEL[r] }))}
          value={relation}
          onChange={setRelation}
        />
      </div>

      <div className="flex flex-col divide-y divide-line-3 rounded-[20px] border border-line">
        {factors.map((f) => (
          <div key={f} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-col">
              <span className="text-[15px] font-bold">{RATING_FACTOR_LABEL[f]}</span>
              <span className="text-xs text-muted-foreground">{RATING_FACTOR_HINT[f]}</span>
            </div>
            <div role="radiogroup" aria-label={RATING_FACTOR_LABEL[f]} className="flex">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = n <= (scores[f] ?? 0);
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={scores[f] === n}
                    aria-label={`${RATING_FACTOR_LABEL[f]}: ${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setScores((s) => ({ ...s, [f]: n }))}
                    className="flex size-11 items-center justify-center"
                  >
                    <Star aria-hidden className={cx("size-7", on ? "fill-star text-star" : "fill-line-2 text-line-2")} strokeWidth={1} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Field>
        <FieldLabel htmlFor="review">Write a review (optional)</FieldLabel>
        <Textarea
          id="review"
          rows={4}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={1000}
          placeholder="What should others know about this place?"
          className="resize-none"
        />
      </Field>

      <p className="text-xs leading-relaxed text-muted-foreground">
        You can rate because you contacted this owner through EasyStay. Your name shows as first name only; your number is never shown.
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white px-5 pt-3.5 pb-6 md:static md:border-0 md:p-0">
        <Button type="submit" size="lg" block loading={busy}>
          {data.rating ? "Update rating" : "Submit rating"}
        </Button>
      </div>
    </form>
  );
}

/** 11b · Rate property */
export default function RatePropertyPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth title="Log in to rate this property" subtitle="Ratings come only from people who contacted the owner.">
      {() => <RateForm id={id} />}
    </RequireAuth>
  );
}

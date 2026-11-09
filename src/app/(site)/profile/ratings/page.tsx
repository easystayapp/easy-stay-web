"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { ProfileShell } from "@/components/layout/profile-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorNote, StarIcon } from "@/components/ui/primitives";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api, errorMessage } from "@/lib/client/api";
import { RATING_RELATION_LABEL } from "@/lib/domain/catalog";
import type { MyRatingListItem } from "@/types/api";
import { formatDate } from "@/lib/domain/format";

function MyRatings() {
  const [items, setItems] = useState<MyRatingListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .myRatings()
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">My ratings</h1>
      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !items ? (
        <PageSpinner />
      ) : !items.length ? (
        <EmptyState
          icon={<Star className="size-7" />}
          title="No ratings yet"
          body="After you contact an owner through EasyStay, you can rate the property, the owner and the area."
          action={<ButtonLink href="/properties" size="sm">Find a place</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-[20px] border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <Link href={`/properties/${r.property.id}`} className="text-base font-bold text-ink hover:text-brand">
                    {r.property.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {r.property.locality} · {RATING_RELATION_LABEL[r.relation]} · {formatDate(new Date(r.updatedAt))}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-sm font-extrabold">
                  <StarIcon />
                  {r.combined.toFixed(1)}
                </span>
              </div>
              {r.review && <p className="text-sm text-muted-2">{r.review}</p>}
              <Link href={`/properties/${r.property.id}/rate`} className="self-start text-[13px] font-bold">
                Edit rating
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MyRatingsPage() {
  return (
    <RequireAuth title="Log in to see your ratings">
      {(me) => (
        <ProfileShell me={me}>
          <MyRatings />
        </ProfileShell>
      )}
    </RequireAuth>
  );
}

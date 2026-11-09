"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { useSaved } from "@/hooks/use-saved";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorNote } from "@/components/ui/primitives";
import { PropertyImage } from "@/components/ui/property-image";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api, errorMessage } from "@/lib/client/api";
import type { SavedItem } from "@/types/api";
import { formatRupees } from "@/lib/domain/format";

function SavedList() {
  const { isSaved, toggle } = useSaved();
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .saved()
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!items) return <PageSpinner />;
  const visible = items.filter((i) => isSaved(i.property.id));
  if (!visible.length) {
    return (
      <EmptyState
        icon={<Heart className="size-7" />}
        title="Nothing saved yet"
        body="Tap the heart on any listing to keep it here."
        action={<ButtonLink href="/properties" size="sm">Browse places</ButtonLink>}
      />
    );
  }
  return (
    <ul className="grid gap-3.5 md:grid-cols-2">
      {visible.map(({ property: p, available }) => (
        <li key={p.id} className="flex gap-4 rounded-[20px] border border-line p-3 shadow-[var(--shadow-card)]">
          <PropertyImage src={p.coverUrl} alt={p.title} seed={p.id} className="size-24 shrink-0 rounded-[14px]" iconSize={26} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={`self-start rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-[0.06em] ${available ? "bg-ok-bg text-ok" : "bg-pause-bg text-pause"}`}>
              {available ? "AVAILABLE" : "NO LONGER AVAILABLE"}
            </span>
            {available ? (
              <Link href={`/properties/${p.id}`} className="truncate text-base font-bold text-ink hover:text-brand">
                {p.title}
              </Link>
            ) : (
              <span className="truncate text-base font-bold text-muted-foreground">{p.title}</span>
            )}
            <span className="text-[13px] text-muted-foreground">
              {p.locality}, {p.city}
              {!available && " · rented or expired"}
            </span>
            {available ? (
              <span className="text-base font-extrabold text-brand">
                {formatRupees(p.rent)}
                <span className="text-xs font-semibold text-muted-foreground">/month</span>
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => toggle(p.id)}
            aria-label={available ? `Remove ${p.title} from saved` : `Remove ${p.title}`}
            className="flex h-10 shrink-0 items-center self-start rounded-full px-2 text-brand hover:text-brand-dark"
          >
            {available ? <Heart aria-hidden className="size-5 fill-brand" /> : <span className="text-[13px] font-bold">Remove</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** 11 · Saved properties */
export default function SavedPage() {
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">Saved properties</h1>
        <p className="text-sm text-muted-foreground">Places you liked, in one spot.</p>
      </div>
      <RequireAuth title="Log in to see saved places" subtitle="Your saved places stay in one spot, on every device.">
        {() => <SavedList />}
      </RequireAuth>
    </div>
  );
}

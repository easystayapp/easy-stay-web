"use client";

import { BellOff, CalendarClock, Clock, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageSpinner } from "@/components/ui/page-spinner";
import { EmptyState, ErrorNote } from "@/components/ui/primitives";
import { useListingActions } from "@/hooks/use-listing-actions";
import { api, errorMessage } from "@/lib/client/api";
import { LISTING_DAYS } from "@/lib/domain/catalog";
import { dayKey, addDays } from "@/lib/domain/time";
import type { OwnerListing, ReminderItem } from "@/types/api";

function groupOf(at: string): "Today" | "Yesterday" | "Earlier" {
  const k = dayKey(new Date(at));
  const now = new Date();
  if (k === dayKey(now)) return "Today";
  if (k === dayKey(addDays(now, -1))) return "Yesterday";
  return "Earlier";
}

export function NotificationsSection({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<ReminderItem[] | null>(null);
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.notifications(), api.myListings()])
      .then(([n, l]) => {
        setItems(n.items);
        setListings(l.items);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);
  const actions = useListingActions(load);

  if (error) return <div className={embedded ? "" : "container-page py-10"}><ErrorNote>{error}</ErrorNote></div>;
  if (!items) return <PageSpinner />;

  const listing = (id: string) => listings.find((l) => l.id === id);
  const groups = (["Today", "Yesterday", "Earlier"] as const)
    .map((g) => ({ g, list: items.filter((i) => groupOf(i.at) === g) }))
    .filter((x) => x.list.length);

  return (
    <div className={embedded ? "flex flex-col gap-6" : "mx-auto flex max-w-[680px] flex-col gap-6 px-4 py-5 sm:px-6 md:py-10"}>
      {embedded ? <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">Notifications</h1> : <PageHeader back="/my-listings" title="Notifications" />}

      <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-5">
        <span className="text-sm font-bold">Every listing&apos;s {LISTING_DAYS} days</span>
        <div aria-hidden className="relative h-2.5 rounded-full bg-line-2">
          <div className="absolute inset-y-0 left-0 w-[80%] rounded-full bg-ok/70" />
          <div className="absolute inset-y-0 left-[80%] w-[14%] bg-star" />
          <div className="absolute inset-y-0 right-0 w-[6%] rounded-r-full bg-brand" />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
          <span>Day 1<br />Live</span>
          <span className="text-center">Day 12–14<br />Reminders</span>
          <span className="text-right">Day {LISTING_DAYS}<br />Expires</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={<BellOff className="size-7" />} title="You're all caught up" body="We'll remind you 3 days and 1 day before a listing expires." />
      ) : (
        groups.map(({ g, list }) => (
          <section key={g} className="flex flex-col gap-2.5">
            <h2 className="eyebrow">{g}</h2>
            {list.map((n) => {
              const l = listing(n.propertyId);
              return (
                <div key={n.id} className="flex gap-3 rounded-[20px] border border-line p-4">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${n.kind === "expired" ? "bg-warn-bg text-warn" : "bg-blush text-brand"}`}
                  >
                    {n.kind === "expired" ? <TriangleAlert aria-hidden className="size-5" /> : n.kind === "expires_tomorrow" ? <Clock aria-hidden className="size-5" /> : <CalendarClock aria-hidden className="size-5" />}
                  </span>
                  <div className="flex flex-1 flex-col gap-2.5 text-sm">
                    <span className="leading-relaxed">
                      <b>{n.propertyTitle}</b>{" "}
                      {n.kind === "expired"
                        ? "has expired and is hidden from search."
                        : n.kind === "expires_tomorrow"
                          ? "expires tomorrow. Repost it to continue receiving enquiries."
                          : `expires in ${n.daysLeft} days. Is your property still available?`}
                    </span>
                    {l && n.kind === "expired" && l.status === "expired" && (
                      <Button size="sm" className="self-start" onClick={() => actions.ask("repost", l)}>
                        Repost
                      </Button>
                    )}
                    {l && n.kind === "expiring" && l.status === "active" && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="neutral" size="sm" loading={actions.isBusy(l.id, "confirm_available")} onClick={() => actions.run(l.id, "confirm_available")}>
                          Still available
                        </Button>
                        <Button variant="soft" size="sm" onClick={() => actions.ask("mark_rented", l)}>
                          Mark as rented
                        </Button>
                      </div>
                    )}
                    {l && n.kind === "expires_tomorrow" && l.status === "active" && (
                      <ButtonLink href={`/my-listings/${l.id}/stats`} variant="text" size="sm" className="self-start">
                        View statistics
                      </ButtonLink>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}
      {actions.dialog}
    </div>
  );
}

/** 21 · Expiry reminders */

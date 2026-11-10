"use client";

import { Bell, Clock, Eye, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useListingActions } from "@/hooks/use-listing-actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { EmptyState, ErrorNote, StatusBadge } from "@/components/ui/primitives";
import { PropertyImage } from "@/components/ui/property-image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "@/lib/client/api";
import type { Me, OwnerListing, OwnerListingsResponse } from "@/types/api";
import { firstName, formatRupees } from "@/lib/domain/format";
import type { ListingStatus } from "@/lib/domain/types";

type FilterKey = "all" | ListingStatus;

function timeLeft(l: OwnerListing): string {
  if (l.status === "active") return l.daysLeft === 1 ? "1 day" : `${l.daysLeft} days`;
  if (l.status === "expired") return "Expired";
  if (l.status === "paused") return "Paused";
  if (l.status === "draft") return "Not published";
  return "—";
}

export function MyListingsSection({ me, embedded = false }: { me: Me; embedded?: boolean }) {
  const [data, setData] = useState<OwnerListingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(() => {
    api
      .myListings()
      .then(setData)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);
  const actions = useListingActions(load);

  if (error) return <div className={embedded ? "" : "container-page py-10"}><ErrorNote>{error}</ErrorNote></div>;
  if (!data) return <PageSpinner />;

  const items = filter === "all" ? data.items : data.items.filter((l) => l.status === filter);
  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: `All (${data.counts.total})` },
    { key: "active", label: "Active" },
    { key: "expired", label: "Expired" },
    { key: "rented", label: "Rented" },
    { key: "paused", label: "Paused" },
    ...(data.counts.draft ? [{ key: "draft" as const, label: "Drafts" }] : []),
  ];

  const rowActions = (l: OwnerListing, compact = false) => {
    const sz = compact ? "sm" : "sm";
    switch (l.status) {
      case "active":
        return (
          <>
            <ButtonLink href={`/my-listings/${l.id}/edit`} variant="neutral" size={sz}>Edit</ButtonLink>
            <Button variant="neutral" size={sz} loading={actions.isBusy(l.id, "pause")} onClick={() => actions.run(l.id, "pause")}>Pause</Button>
            <Button variant="soft" size={sz} onClick={() => actions.ask("mark_rented", l)}>Mark rented</Button>
          </>
        );
      case "paused":
        return (
          <>
            <ButtonLink href={`/my-listings/${l.id}/edit`} variant="neutral" size={sz}>Edit</ButtonLink>
            <Button variant="primary" size={sz} loading={actions.isBusy(l.id, "resume")} onClick={() => actions.run(l.id, "resume")}>Resume</Button>
            <Button variant="soft" size={sz} onClick={() => actions.ask("mark_rented", l)}>Mark rented</Button>
          </>
        );
      case "expired":
      case "rented":
        return (
          <>
            <ButtonLink href={`/my-listings/${l.id}/edit`} variant="neutral" size={sz}>Edit</ButtonLink>
            <Button variant="primary" size={sz} onClick={() => actions.ask("repost", l)}>Repost</Button>
          </>
        );
      case "draft":
        return <ButtonLink href={`/my-listings/${l.id}/edit`} variant="primary" size={sz}>Finish & publish</ButtonLink>;
    }
  };

  const r = data.reminder;
  return (
    <div className={embedded ? "flex flex-col gap-6" : "container-page flex flex-col gap-6 py-6 md:py-10"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ok">Hi, {firstName(me.displayName || "there")}</span>
          <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">My listings</h1>
          <span className="text-sm text-muted-foreground">Each listing stays live for 15 days. Repost anytime.</span>
        </div>
        <ButtonLink href="/my-listings/new" size="lg" className="max-sm:w-full">
          <Plus aria-hidden />
          Add Property
        </ButtonLink>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          ["Total properties", data.counts.total, "text-ink"],
          ["Active", data.counts.active, "text-ok"],
          ["Expired", data.counts.expired, "text-warn"],
          ["Rented", data.counts.rented, "text-info"],
        ] as const).map(([k, v, c]) => (
          <div key={k} className="rounded-[20px] border border-line p-4">
            <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
            <dd className={`mt-1 text-[28px] font-extrabold ${c}`}>{v}</dd>
          </div>
        ))}
      </dl>

      {r && (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-[#F5E2B8] bg-warn-bg p-4 text-sm text-warn">
          <Bell aria-hidden className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <b>{r.propertyTitle}</b> {r.kind === "expires_tomorrow" ? "expires tomorrow" : `expires in ${r.daysLeft} days`}. Is your property still available?
          </span>
          <div className="flex gap-2">
            <Button variant="neutral" size="sm" loading={actions.isBusy(r.propertyId, "confirm_available")} onClick={() => actions.run(r.propertyId, "confirm_available")}>
              Still available
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const l = data.items.find((x) => x.id === r.propertyId);
                if (l) actions.ask("mark_rented", l);
              }}
            >
              Mark as rented
            </Button>
          </div>
        </div>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList className="h-auto! w-fit max-w-full justify-start gap-1 overflow-x-auto rounded-full bg-surface p-1">
          {filters.map((f) => (
            <TabsTrigger
              key={f.key}
              value={f.key}
              className="h-9 flex-none rounded-full px-4 text-[13px] font-semibold text-muted-2 hover:text-ink data-active:bg-white data-active:font-bold data-active:text-brand data-active:shadow-[var(--shadow-card)]"
            >
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="size-7" />}
          title="No listings yet"
          body="Add your first PG, room or flat. It takes about 2 minutes and stays live for 15 days."
          action={<ButtonLink href="/my-listings/new" size="sm">Add property</ButtonLink>}
        />
      ) : items.length === 0 ? (
        <p className="rounded-[20px] bg-surface px-6 py-10 text-center text-sm text-muted-foreground">No {filter} listings.</p>
      ) : (
        <>
          {/* Phone cards (14) */}
          <ul className="flex flex-col gap-3.5 md:hidden">
            {items.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 rounded-[20px] border border-line p-3.5 shadow-[var(--shadow-card)]">
                <div className="flex gap-3">
                  <PropertyImage src={l.coverUrl} alt={l.title} seed={l.id} className="size-[84px] shrink-0 rounded-[14px]" iconSize={24} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/properties/${l.id}`} className="truncate text-[15px] font-bold text-ink">{l.title}</Link>
                      <StatusBadge status={l.status} />
                    </div>
                    <span className="text-xs text-muted-foreground">{l.locality}, {l.city}</span>
                    <span className="text-base font-extrabold text-brand">
                      {formatRupees(l.rent)}<span className="text-xs font-semibold text-muted-foreground">/month</span>
                    </span>
                  </div>
                </div>
                {l.status === "expired" ? (
                  <span className="text-xs font-semibold text-muted-foreground">Hidden from search · {l.viewCount} views kept</span>
                ) : (
                  <div className="flex gap-2 text-[13px]">
                    <Link href={`/my-listings/${l.id}/stats`} className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-ink">
                      <Eye aria-hidden className="size-4 text-brand" />
                      <span><b>{l.viewCount}</b> views</span>
                    </Link>
                    <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3 py-2.5">
                      <Clock aria-hidden className="size-4 text-brand" />
                      <span><b>{timeLeft(l)}</b>{l.status === "active" ? " left" : ""}</span>
                    </div>
                  </div>
                )}
                <div className="grid auto-cols-fr grid-flow-col gap-2 [&>*]:w-full">{rowActions(l, true)}</div>
              </li>
            ))}
          </ul>

          {/* Web table (W5) */}
          <div className="hidden overflow-hidden rounded-[20px] border border-line md:block">
            <Table>
              <TableHeader className="bg-surface-2">
                <TableRow>
                  {["Property", "Status", "Rent", "Views", "Rating", "Time left", "Actions"].map((h) => (
                    <TableHead key={h} className="h-11 px-4 text-xs font-bold text-muted-foreground">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PropertyImage src={l.coverUrl} alt={l.title} seed={l.id} className="size-12 shrink-0 rounded-xl" iconSize={18} />
                        <div className="flex flex-col">
                          <Link href={`/properties/${l.id}`} className="text-sm font-bold text-ink hover:text-brand">{l.title}</Link>
                          <span className="text-xs text-muted-foreground">{l.locality}, {l.city}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4"><StatusBadge status={l.status} /></TableCell>
                    <TableCell className="px-4 text-sm font-bold">{formatRupees(l.rent)}</TableCell>
                    <TableCell className="px-4 text-sm"><Link href={`/my-listings/${l.id}/stats`} className="font-bold">{l.viewCount}</Link></TableCell>
                    <TableCell className="px-4 text-sm font-semibold">
                      {l.rating.count >= 3 && l.rating.average != null ? `★ ${l.rating.average.toFixed(1)}` : <span className="text-muted-foreground">New</span>}
                    </TableCell>
                    <TableCell className="px-4 text-sm">{timeLeft(l)}</TableCell>
                    <TableCell className="px-4">
                      <div className="flex gap-2">{rowActions(l)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {actions.dialog}
    </div>
  );
}

/** 14 · My listings · W5 · with 20 Mark rented and 22 Repost */

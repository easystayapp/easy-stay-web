"use client";

import { KeyRound, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { PropertyImage } from "@/components/ui/property-image";
import { StatusBadge } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/client/api";
import { LISTING_DAYS } from "@/lib/domain/catalog";
import type { OwnerListing } from "@/types/api";
import { formatRupees } from "@/lib/domain/format";
import type { ListingAction } from "@/lib/domain/listing";

type Confirm = { kind: "mark_rented" | "repost"; listing: Pick<OwnerListing, "id" | "title" | "locality" | "rent" | "viewCount" | "status" | "coverUrl"> };

const DONE: Partial<Record<ListingAction, string>> = {
  pause: "Listing paused — hidden from search",
  resume: "Listing is live again",
  mark_rented: "Marked as rented. Congrats!",
  repost: `Reposted — live for ${LISTING_DAYS} days`,
  confirm_available: "Thanks — we've noted it's still available",
};

/**
 * Runs owner listing actions. Mark-rented (20) and repost (22) ask for
 * confirmation; the rest run immediately.
 */
export function useListingActions(onDone: () => void) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (id: string, action: ListingAction) => {
    setBusy(`${id}:${action}`);
    try {
      await api.listingAction(id, action);
      toast(DONE[action] ?? "Done");
      setConfirm(null);
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const ask = (kind: Confirm["kind"], listing: Confirm["listing"]) => setConfirm({ kind, listing });
  const isBusy = (id: string, action: ListingAction) => busy === `${id}:${action}`;

  const l = confirm?.listing;
  const dialog = (
    <AppDialog
      open={!!confirm}
      onClose={() => setConfirm(null)}
      title={confirm?.kind === "repost" ? "Is this property still available?" : "Mark as rented?"}
    >
      {confirm && l && (
        <div className="mt-2 flex flex-col gap-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-blush text-brand">
            {confirm.kind === "repost" ? <RotateCcw aria-hidden className="size-7" /> : <KeyRound aria-hidden className="size-7" />}
          </span>
          <p className="text-sm leading-relaxed text-muted-2">
            {confirm.kind === "repost"
              ? `Reposting makes it visible to seekers again for the next ${LISTING_DAYS} days.`
              : "Congrats! The listing will be hidden from search and seekers can no longer contact you about it. You can repost it anytime from your dashboard."}
          </p>
          <div className="flex gap-3 rounded-2xl border border-line p-3">
            <PropertyImage src={l.coverUrl} alt={l.title} seed={l.id} className="size-16 shrink-0 rounded-xl" iconSize={22} />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-bold">{l.title}</span>
              <span className="text-xs text-muted-foreground">
                {l.locality} · {formatRupees(l.rent)}/month
              </span>
              {confirm.kind === "repost" ? (
                <StatusBadge status={l.status} className="self-start" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {l.viewCount} views · status becomes <b className="text-info">RENTED</b>
                </span>
              )}
            </div>
          </div>
          {confirm.kind === "repost" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface p-3.5">
                <div className="text-xs text-muted-foreground">Goes live</div>
                <div className="text-[15px] font-extrabold">Today</div>
              </div>
              <div className="rounded-2xl bg-surface p-3.5">
                <div className="text-xs text-muted-foreground">Expires</div>
                <div className="text-[15px] font-extrabold">In {LISTING_DAYS} days</div>
              </div>
            </div>
          )}
          <Button size="lg" block loading={isBusy(l.id, confirm.kind)} onClick={() => run(l.id, confirm.kind)}>
            {confirm.kind === "repost" ? "Yes, repost property" : "Yes, it's rented"}
          </Button>
          <Button variant="neutral" block onClick={() => setConfirm(null)}>
            {confirm.kind === "repost" ? "Cancel" : "Not yet"}
          </Button>
          {confirm.kind === "repost" && (
            <p className="text-center text-xs text-muted-foreground">Your details and past views are kept — no duplicate listing.</p>
          )}
        </div>
      )}
    </AppDialog>
  );

  return { run, ask, isBusy, dialog };
}

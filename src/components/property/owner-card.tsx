import { BadgeCheck } from "lucide-react";
import { Avatar, StarIcon } from "@/components/ui/primitives";
import type { OwnerProfile } from "@/types/api";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <dt className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">{label}</dt>
      <dd className="flex items-center gap-1.5 text-[15px] font-extrabold">{children}</dd>
    </div>
  );
}

/** Public owner facts. Phone and WhatsApp stay behind the login-gated contact flow. */
export function OwnerCard({ owner, verified }: { owner: OwnerProfile; verified?: boolean }) {
  const since = owner.memberSince
    ? new Date(owner.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    : "—";
  const rated = owner.ownerRating != null;
  return (
    <div className="flex h-full flex-col gap-5 rounded-[22px] border border-line bg-white p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="flex items-center gap-4">
        <Avatar name={owner.name} size={60} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-xl leading-tight font-extrabold">{owner.name}</span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground">
            <span>Listed directly by owner</span>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-[11px] font-extrabold text-ok">
                <BadgeCheck aria-hidden className="size-3.5" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-auto divide-y divide-line-3 border-t border-line-3">
        <Row label="Owner rating">
          {rated ? (
            <>
              <StarIcon className="size-4" />
              {owner.ownerRating!.toFixed(1)}
              <span className="text-xs font-semibold text-muted-foreground">
                ({owner.ratingCount} {owner.ratingCount === 1 ? "rating" : "ratings"})
              </span>
            </>
          ) : (
            <span className="font-semibold text-muted-foreground">No ratings yet</span>
          )}
        </Row>
        <Row label="Live listings">{owner.listings}</Row>
        <Row label="On EasyStay since">{since}</Row>
      </dl>
    </div>
  );
}

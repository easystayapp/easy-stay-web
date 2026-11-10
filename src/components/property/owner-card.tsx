import { CalendarDays, Home, ShieldCheck } from "lucide-react";
import { Avatar, StarIcon } from "@/components/ui/primitives";
import type { OwnerProfile } from "@/types/api";

/** Public owner facts. Phone and WhatsApp stay behind the login-gated contact flow. */
export function OwnerCard({ owner }: { owner: OwnerProfile }) {
  const since = owner.memberSince ? new Date(owner.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="owner-title">
      <h2 id="owner-title" className="text-xl font-extrabold">About the owner</h2>
      <div className="flex flex-wrap items-center gap-4 rounded-[20px] border border-line p-4 sm:p-5">
        <Avatar name={owner.name} size={56} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-lg font-extrabold">{owner.name}</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-2">
            {owner.ownerRating != null ? (
              <span className="flex items-center gap-1 font-bold text-ink">
                <StarIcon className="size-4 text-star" />
                {owner.ownerRating.toFixed(1)}
                <span className="font-medium text-muted-foreground">owner rating · {owner.ratingCount} {owner.ratingCount === 1 ? "rating" : "ratings"}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <ShieldCheck aria-hidden className="size-4" /> No ratings yet
              </span>
            )}
            <span className="flex items-center gap-1">
              <Home aria-hidden className="size-4 text-brand" />
              {owner.listings} live {owner.listings === 1 ? "listing" : "listings"}
            </span>
            {since && (
              <span className="flex items-center gap-1">
                <CalendarDays aria-hidden className="size-4 text-brand" />
                On EasyStay since {since}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

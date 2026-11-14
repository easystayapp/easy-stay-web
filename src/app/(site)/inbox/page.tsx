"use client";

import { CalendarClock, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { PropertyImage } from "@/components/ui/property-image";
import { PageSpinner } from "@/components/ui/page-spinner";
import { EmptyState, ErrorNote, Segmented } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { formatVisit } from "@/lib/domain/format";
import type { InboxItem, InboxSide, Me } from "@/types/api";
import { ENQUIRY_STATUS_LABEL, VISIT_STATUS_LABEL } from "@/components/enquiry/labels";

const ago = (ms: number) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

const upcomingVisit = (e: InboxItem, now = Date.now()) =>
  e.visit && ["requested", "confirmed", "rescheduled"].includes(e.visit.status) && e.visit.at > now ? e.visit : null;

function Row({ e }: { e: InboxItem }) {
  const upcoming = upcomingVisit(e);
  return (
    <li>
      <Link href={`/inbox/${encodeURIComponent(e.id)}`} className="flex gap-3.5 px-4 py-3.5 text-ink hover:bg-surface hover:text-ink">
        <PropertyImage src={e.propertyThumb} alt="" seed={e.propertyId} className="size-14 shrink-0 rounded-xl" iconSize={20} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cx("truncate text-[15px]", e.unread ? "font-extrabold" : "font-bold")}>{e.counterpart}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{ago(e.lastMessageAt)}</span>
          </span>
          <span className="truncate text-xs font-semibold text-muted-2">{e.propertyTitle}</span>
          <span className="flex items-center gap-2">
            <span className={cx("min-w-0 flex-1 truncate text-[13px]", e.unread ? "font-semibold text-ink" : "text-muted-foreground")}>
              {e.lastMessage || "New enquiry"}
            </span>
            {e.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-extrabold text-white">
                {e.unread}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-bold text-muted-2">{ENQUIRY_STATUS_LABEL[e.status]}</span>
            {upcoming && (
              <span className="inline-flex items-center gap-1 rounded-md bg-info-bg px-1.5 py-0.5 text-[11px] font-bold text-info">
                <CalendarClock aria-hidden className="size-3" />
                {VISIT_STATUS_LABEL[upcoming.status]} · {formatVisit(upcoming.at)}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

function Inbox({ me }: { me: Me }) {
  const params = useSearchParams();
  const router = useRouter();
  const side: InboxSide = me.ownerToolsOn && params.get("as") === "owner" ? "owner" : "seeker";
  const [data, setData] = useState<{ side: InboxSide; items: InboxItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await api.enquiries(side);
        if (cancelled) return;
        setData({ side, items: r.items });
        setError(null);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      }
    };
    void load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [side]);

  const items = data?.side === side ? data.items : null;

  return (
    <div className="container-page flex max-w-3xl flex-col gap-5 py-6 md:py-10">
      <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">Inbox</h1>
      {me.ownerToolsOn && (
        <Segmented<InboxSide>
          label="Conversations"
          value={side}
          onChange={(v) => router.replace(v === "owner" ? "/inbox?as=owner" : "/inbox", { scroll: false })}
          options={[
            { value: "seeker", label: "Places I asked about" },
            { value: "owner", label: "My listings" },
          ]}
        />
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      {!items ? (
        !error && <PageSpinner label="Loading conversations" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="size-7" />}
          title={side === "owner" ? "No enquiries yet" : "No conversations yet"}
          body={
            side === "owner"
              ? "When seekers message you or ask to visit, it shows up here."
              : "Find a place you like and tap “Book a visit” to start chatting with the owner."
          }
          action={side === "seeker" ? <ButtonLink href="/properties" size="sm">Find a stay</ButtonLink> : undefined}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[20px] border border-line">
          {items.map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Enquiries, visit requests and chats, for seekers and owners. */
export default function InboxPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RequireAuth title="Log in to see your messages">{(me) => <Inbox me={me} />}</RequireAuth>
    </Suspense>
  );
}

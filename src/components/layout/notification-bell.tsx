"use client";

import { Bell, BellOff, CalendarClock, Clock, MessageCircle, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, type InboxNotification } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import type { ReminderItem } from "@/types/api";

type Row = {
  id: string;
  at: number;
  title: string;
  body: string;
  href: string | null;
  tone: "warn" | "brand" | "plain";
  icon: typeof Bell;
  unread: boolean;
};

const ago = (ms: number) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

function reminderRow(r: ReminderItem): Row {
  const expired = r.kind === "expired";
  return {
    id: `r_${r.id}`,
    at: new Date(r.at).getTime(),
    title: r.propertyTitle,
    body: expired ? "Expired · hidden from search" : r.kind === "expires_tomorrow" ? "Expires tomorrow · repost to keep enquiries" : `Expires in ${r.daysLeft} days · still available?`,
    href: "/profile?tab=notifications",
    tone: expired ? "warn" : "brand",
    icon: expired ? TriangleAlert : r.kind === "expires_tomorrow" ? Clock : CalendarClock,
    unread: true, // reminders stay until acted on
  };
}

const ICON: Record<InboxNotification["type"], typeof Bell> = {
  new_enquiry: UserRound,
  visit_update: CalendarClock,
  new_message: MessageCircle,
  verification: ShieldCheck,
  case_update: ShieldCheck,
};

function inboxRow(n: InboxNotification): Row {
  return {
    id: n.id,
    at: n.at,
    title: n.title,
    body: n.body,
    // Only link to pages that exist.
    href: n.href.startsWith("/inbox") ? null : n.href,
    tone: "plain",
    icon: ICON[n.type] ?? Bell,
    unread: !n.read,
  };
}

/** Header bell: a popover with the latest notifications, newest first. */
export function NotificationBell() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [rem, inbox] = await Promise.allSettled([api.notifications(), api.inbox()]);
    const list = [
      ...(rem.status === "fulfilled" ? rem.value.items.map(reminderRow) : []),
      ...(inbox.status === "fulfilled" ? inbox.value.items.map(inboxRow) : []),
    ].sort((a, b) => b.at - a.at);
    setRows(list);
    return inbox.status === "fulfilled" ? inbox.value.items.filter((n) => !n.read).map((n) => n.id) : [];
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const unread = rows?.filter((r) => r.unread).length ?? 0;

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    const unreadIds = await load();
    if (unreadIds.length) {
      // Opening the popover counts as reading the in-app ones (reminders stay until handled).
      api.markInboxRead(unreadIds).then(() => setRows((r) => r && r.map((x) => (unreadIds.includes(x.id) ? { ...x, unread: false } : x)))).catch(() => {});
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} need attention` : "Notifications"}
          className="relative flex size-11 items-center justify-center rounded-xl text-ink hover:bg-surface"
        >
          <Bell aria-hidden className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-brand px-1 text-[10px] leading-[14px] font-extrabold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-24px))] gap-0 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[15px] font-extrabold">Notifications</span>
          <Link href="/profile?tab=notifications" onClick={() => setOpen(false)} className="text-xs font-bold">
            View all
          </Link>
        </div>
        <div className="max-h-[420px] overflow-y-auto overscroll-contain">
          {rows === null ? (
            <div className="flex flex-col gap-2 p-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-surface" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-surface text-muted-foreground"><BellOff aria-hidden className="size-5" /></span>
              <span className="text-sm font-bold">You&apos;re all caught up</span>
              <span className="text-xs text-muted-foreground">New enquiries and reminders will show up here.</span>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.slice(0, 8).map((r) => {
                const inner = (
                  <>
                    <span
                      className={cx(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        r.tone === "warn" ? "bg-warn-bg text-warn" : r.tone === "brand" ? "bg-blush text-brand" : "bg-surface text-ink",
                      )}
                    >
                      <r.icon aria-hidden className="size-[18px]" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold">{r.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{ago(r.at)}</span>
                      </span>
                      <span className="line-clamp-2 text-[13px] leading-snug text-muted-2">{r.body}</span>
                    </span>
                    {r.unread && <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                  </>
                );
                const cls = "flex items-start gap-3 px-4 py-3 text-ink";
                return (
                  <li key={r.id}>
                    {r.href ? (
                      <Link href={r.href} onClick={() => setOpen(false)} className={cx(cls, "hover:bg-surface hover:text-ink")}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={cls}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

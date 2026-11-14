"use client";

import { CalendarClock, ChevronLeft, Lock, MessageCircle, Phone, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { ENQUIRY_STATUS_LABEL, VISIT_STATUS_LABEL } from "@/components/enquiry/labels";
import { VisitPicker } from "@/components/enquiry/visit-picker";
import { SosButton } from "@/components/safety/sos-button";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button, buttonClass } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { EmptyState } from "@/components/ui/primitives";
import { PropertyImage } from "@/components/ui/property-image";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { formatPhone, formatVisit } from "@/lib/domain/format";
import { MAX_MESSAGE_LENGTH, type Message } from "@/lib/domain/ops";
import type { EnquiryAction, ThreadResponse } from "@/types/api";

const POLL_MS = 8_000;

const time = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  if (m.side === "system") {
    return <li className="self-center rounded-full bg-surface px-3 py-1 text-center text-xs font-semibold text-muted-2">{m.text}</li>;
  }
  return (
    <li className={cx("flex max-w-[80%] flex-col gap-0.5", mine ? "items-end self-end" : "items-start self-start")}>
      <span
        className={cx(
          "rounded-[16px] px-3.5 py-2.5 text-sm leading-normal whitespace-pre-line",
          mine ? "rounded-br-[4px] bg-brand text-white" : "rounded-bl-[4px] bg-surface text-ink",
        )}
      >
        {m.text}
      </span>
      <span className="px-1 text-[11px] text-muted-foreground">{time(m.at)}</span>
    </li>
  );
}

/** Pick a new visit time and send it as a reschedule (owner) or proposal (seeker). */
function TimeDialog({ title, onPick, onClose }: { title: string; onPick: (at: number, note: string) => Promise<void>; onClose: () => void }) {
  const [at, setAt] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <AppDialog open onClose={onClose} title={title} wide>
      <div className="mt-4 flex flex-col gap-4">
        <VisitPicker value={at} onChange={setAt} />
        <Textarea value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" className="min-h-16" />
        <Button
          size="lg"
          block
          disabled={!at}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onPick(at!, note.trim()).finally(() => setBusy(false));
          }}
        >
          {at ? `Send ${formatVisit(at)}` : "Pick a time"}
        </Button>
      </div>
    </AppDialog>
  );
}

function Thread({ id }: { id: string }) {
  const toast = useToast();
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState<EnquiryAction | null>(null);
  const [picking, setPicking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([api.thread(id), api.messages(id)]);
      setThread(t);
      setMessages(m.items);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const t = setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  const act = async (action: EnquiryAction, extra: { visitAt?: number; note?: string } = {}): Promise<boolean> => {
    setActing(action);
    try {
      await api.enquiryAction(id, { action, ...extra });
      await refresh();
      return true;
    } catch (e) {
      toast(errorMessage(e), "error");
      return false;
    } finally {
      setActing(null);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await api.postMessage(id, t);
      setText("");
      await refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  };

  if (error && !thread) {
    return (
      <div className="container-page py-12">
        <EmptyState icon={<MessageCircle className="size-7" />} title="Conversation not found" body={error} action={<Link href="/inbox" className="font-bold">Back to inbox</Link>} />
      </div>
    );
  }
  if (!thread) return <PageSpinner label="Loading conversation" />;

  const { enquiry: e, side, contact } = thread;
  const owner = side === "owner";
  const closed = e.status === "declined" || e.status === "closed";
  const v = e.visit;
  const visitLive = v && ["requested", "confirmed", "rescheduled"].includes(v.status);
  const waitingOnMe = v && ((v.status === "requested" && owner) || (v.status === "rescheduled" && !owner));
  const counterpart = owner ? e.seekerName : e.ownerName;

  return (
    <div className="container-page flex max-w-3xl flex-col gap-4 py-4 pb-32 md:py-8">
      {/* header */}
      <div className="flex items-center gap-3">
        <Link href={owner ? "/inbox?as=owner" : "/inbox"} aria-label="Back to inbox" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-line text-ink">
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <PropertyImage src={e.propertyThumb} alt="" seed={e.propertyId} className="size-11 shrink-0 rounded-xl" iconSize={18} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-extrabold">{counterpart}</span>
          <Link href={`/properties/${e.propertyId}`} className="truncate text-xs font-semibold text-muted-2 hover:text-brand">
            {e.propertyTitle}
          </Link>
        </div>
        <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-[11px] font-bold text-muted-2">{ENQUIRY_STATUS_LABEL[e.status]}</span>
      </div>

      {/* owner decision */}
      {owner && e.status === "open" && (
        <div className="flex flex-col gap-3 rounded-[20px] border border-blush-line bg-blush p-4">
          <span className="text-sm font-bold text-brand-dark">
            Accept to share phone numbers{v?.status === "requested" ? " and confirm the visit" : ""}. Decline if it isn&apos;t a fit.
          </span>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" loading={acting === "accept"} onClick={() => act("accept")}>Accept</Button>
            <Button size="sm" variant="neutral" className="flex-1" loading={acting === "decline"} onClick={() => act("decline")}>Decline</Button>
          </div>
        </div>
      )}

      {/* visit card */}
      {(v || (!owner && !closed)) && (
        <div className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-bg text-info">
              <CalendarClock aria-hidden className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              {v ? (
                <>
                  <span className="text-[15px] font-extrabold">{formatVisit(v.at)}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {VISIT_STATUS_LABEL[v.status]}
                    {waitingOnMe ? " · waiting for you" : visitLive && v.status !== "confirmed" ? ` · waiting for ${counterpart}` : ""}
                  </span>
                  {v.note && <span className="mt-1 text-[13px] text-muted-2">“{v.note}”</span>}
                </>
              ) : (
                <>
                  <span className="text-[15px] font-extrabold">No visit booked</span>
                  <span className="text-xs text-muted-foreground">Pick a time to see the place.</span>
                </>
              )}
            </div>
            {!owner && v?.status === "confirmed" && <SosButton place={e.propertyTitle} compact />}
          </div>
          {!closed && (
            <div className="flex flex-wrap gap-2">
              {!owner && v?.status === "rescheduled" && (
                <>
                  <Button size="sm" loading={acting === "accept"} onClick={() => act("accept")}>Confirm this time</Button>
                  <Button size="sm" variant="neutral" loading={acting === "decline"} onClick={() => act("decline")}>Cancel visit</Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
                {owner ? "Suggest another time" : v && visitLive ? "Change time" : "Request a visit"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* contact reveal */}
      {contact && (contact.phone || contact.whatsapp) && (
        <div className="flex flex-wrap items-center gap-2 rounded-[20px] bg-ok-bg p-4">
          <span className="mr-auto text-sm font-bold text-ok">
            {contact.name}&apos;s number · {formatPhone(contact.phone ?? contact.whatsapp)}
          </span>
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className={buttonClass("outline", "sm")}>
              <Phone aria-hidden className="size-4" /> Call
            </a>
          )}
          {contact.whatsapp && (
            <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp", "sm")}>
              <MessageCircle aria-hidden className="size-4" /> WhatsApp
            </a>
          )}
        </div>
      )}

      {/* messages */}
      <ol aria-label="Messages" className="flex flex-col gap-3 py-2">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={m.side === side} />
        ))}
      </ol>
      <div ref={endRef} />

      {owner && e.status === "accepted" && (
        <button type="button" onClick={() => act("close")} className="self-center text-xs font-bold text-muted-2 hover:text-brand-dark">
          {acting === "close" ? "Closing…" : "Close this conversation"}
        </button>
      )}

      {/* composer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="container-page max-w-3xl py-3">
          {closed ? (
            <p className="text-center text-sm font-semibold text-muted-foreground">This conversation is closed.</p>
          ) : (
            <form onSubmit={send} className="flex items-end gap-2">
              <Textarea
                aria-label="Message"
                value={text}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={1}
                placeholder="Write a message"
                onChange={(ev) => setText(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    ev.currentTarget.form?.requestSubmit();
                  }
                }}
                className="max-h-32 min-h-11 py-2.5"
              />
              <Button type="submit" size="icon" aria-label="Send" loading={sending} disabled={!text.trim()}>
                {!sending && <SendHorizontal aria-hidden className="size-5" />}
              </Button>
            </form>
          )}
          {!e.acceptedAt && !closed && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock aria-hidden className="size-3" /> Numbers and UPI ids are hidden until the owner accepts.
            </p>
          )}
        </div>
      </div>

      {picking && (
        <TimeDialog
          title={owner ? "Suggest another time" : "Pick a visit time"}
          onClose={() => setPicking(false)}
          onPick={async (at, note) => {
            if (await act(owner ? "reschedule" : "propose", { visitAt: at, note: note || undefined })) setPicking(false);
          }}
        />
      )}
    </div>
  );
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireAuth title="Log in to see this conversation">{() => <Thread id={id} />}</RequireAuth>;
}

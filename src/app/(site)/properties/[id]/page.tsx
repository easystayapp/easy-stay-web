"use client";

import { Bath, Car, ChevronLeft, Info, MapPin, MessageCircle, Phone, Snowflake, Utensils, Wifi, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContactSheet } from "@/components/property/contact-sheet";
import { Gallery } from "@/components/property/gallery";
import { SaveButton } from "@/components/property/property-card";
import { RatingsSection } from "@/components/property/ratings-section";
import { useAuth } from "@/hooks/use-auth";
import { useSaved } from "@/hooks/use-saved";
import { useToast } from "@/hooks/use-toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar, EmptyState, StarIcon, StatusBadge, Tag } from "@/components/ui/primitives";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { deviceId } from "@/lib/client/prefs";
import {
  AMENITY_LABEL,
  ELECTRICITY_LABEL,
  FURNISHING_LABEL,
  GENDER_LABEL,
  PROPERTY_TYPE_SHORT,
  SHARING_LABEL,
} from "@/lib/domain/catalog";
import type { ContactInfo, PropertyDetail, RatingsResponse } from "@/types/api";
import { availabilityLabel, formatDate, formatRupees } from "@/lib/domain/format";
import type { Amenity, ContactChannel } from "@/lib/domain/types";

const AMENITY_ICON: Record<Amenity, LucideIcon> = { wifi: Wifi, ac: Snowflake, parking: Car, attached_bath: Bath };

const LOGIN_COPY = {
  title: "Login to connect directly with the property owner",
  subtitle: "We'll bring you right back to this property.",
};

/** 06 · Property details + ratings · W3 · 07–09 contact flow */
export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { requireLogin } = useAuth();
  const { isSaved, toggle } = useSaved();
  const [p, setP] = useState<PropertyDetail | null>(null);
  const [ratings, setRatings] = useState<RatingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [busy, setBusy] = useState<ContactChannel | null>(null);
  const viewed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.property(id), api.ratings(id)])
      .then(([d, r]) => {
        if (cancelled) return;
        setP(d);
        setRatings(r);
        if (!viewed.current) {
          viewed.current = true;
          api.recordView(id, deviceId()).catch(() => {});
        }
      })
      .catch((e) => !cancelled && setError(e instanceof ApiError && e.status === 404 ? e.message : errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const connect = useCallback(
    async (channel: ContactChannel) => {
      if (!(await requireLogin(LOGIN_COPY))) return;
      setBusy(channel);
      try {
        setContact(await api.contact(id, channel));
      } catch (e) {
        toast(errorMessage(e), "error");
      } finally {
        setBusy(null);
      }
    },
    [id, requireLogin, toast],
  );

  const rate = async () => {
    if (!(await requireLogin({ title: "Log in to rate this property", subtitle: "Ratings come only from people who contacted the owner." }))) return;
    router.push(`/properties/${id}/rate`);
  };

  if (error) {
    return (
      <div className="container-page py-12">
        <EmptyState
          icon={<Info className="size-7" />}
          title="This place isn't available"
          body={error}
          action={<ButtonLink href="/properties" size="sm">Find similar places</ButtonLink>}
        />
      </div>
    );
  }
  if (!p || !ratings) return <PageSpinner label="Loading property" />;

  const avail = availabilityLabel(p.availableFrom ? new Date(p.availableFrom) : null);
  const canCall = p.contactChannels.includes("call");
  const canWa = p.contactChannels.includes("whatsapp");
  const facts: [string, string][] = [
    ["Property type", PROPERTY_TYPE_SHORT[p.type]],
    [p.type === "flat" ? "Size" : "Sharing", SHARING_LABEL[p.sharing]],
    ["Furnishing", p.furnishing ? FURNISHING_LABEL[p.furnishing] : "Not specified"],
    ["Food", p.food ? "Available" : "Not provided"],
    ["Preferred", GENDER_LABEL[p.availableFor]],
    ["Available from", avail === "Available now" ? "Immediately" : avail.replace("From ", "")],
  ];
  if (p.electricity) facts.push(["Electricity", ELECTRICITY_LABEL[p.electricity]]);

  const ownerControls = p.viewerIsOwner && (
    <div className="flex flex-col gap-3 rounded-[20px] border border-blush-line bg-blush p-4">
      <span className="text-sm font-bold text-brand-dark">This is your listing{p.status !== "active" ? ` · ${p.status}` : ""}</span>
      <div className="flex gap-2">
        <ButtonLink href={`/my-listings/${p.id}/edit`} variant="primary" size="sm" className="flex-1">
          Edit
        </ButtonLink>
        <ButtonLink href={`/my-listings/${p.id}/stats`} variant="outline" size="sm" className="flex-1">
          Statistics
        </ButtonLink>
      </div>
    </div>
  );

  const contactButtons = (layout: "stack" | "row") => (
    <>
      {canWa && (
        <Button variant="whatsapp" size="lg" block={layout === "stack"} className={layout === "row" ? "flex-1" : ""} loading={busy === "whatsapp"} onClick={() => connect("whatsapp")}>
          {busy !== "whatsapp" && <MessageCircle aria-hidden className="size-5" />}
          {layout === "stack" ? "WhatsApp owner" : "WhatsApp"}
        </Button>
      )}
      {canCall && (
        <Button variant="outline" size="lg" block={layout === "stack"} className={layout === "row" ? "flex-1" : ""} loading={busy === "call"} onClick={() => connect("call")}>
          {busy !== "call" && <Phone aria-hidden className="size-5" />}
          {layout === "stack" ? "Call owner" : "Call Owner"}
        </Button>
      )}
    </>
  );

  return (
    <div className="container-page pb-32 md:py-6 md:pb-16">
      <nav aria-label="Breadcrumb" className="mb-4 hidden flex-wrap items-center gap-2 text-[13px] font-semibold text-muted-foreground md:flex">
        <Link href="/" className="text-muted-foreground hover:text-ink">Home</Link>
        <span aria-hidden>/</span>
        <Link href={`/properties?city=${encodeURIComponent(p.city)}&q=${encodeURIComponent(p.locality)}&type=${p.type}`} className="text-muted-foreground hover:text-ink">
          {p.locality} {PROPERTY_TYPE_SHORT[p.type]}s
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">{p.title}</span>
      </nav>

      <Gallery
        photos={p.photos}
        title={p.title}
        seed={p.id}
        overlay={
          <>
            <button type="button" aria-label="Back" onClick={() => router.back()} className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-[14px] bg-white/95 text-ink">
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <SaveButton id={p.id} className="absolute top-4 right-4 size-11" />
          </>
        }
      />

      <div className="mt-6 grid gap-10 md:mt-8 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {p.status === "active" ? (
                <span className="rounded-lg bg-ok-bg px-2.5 py-1 text-[11px] font-extrabold tracking-[0.06em] text-ok">AVAILABLE</span>
              ) : (
                <StatusBadge status={p.status} />
              )}
              <Tag>
                {PROPERTY_TYPE_SHORT[p.type]} · {GENDER_LABEL[p.availableFor]}
              </Tag>
            </div>
            <h1 className="text-[26px] leading-tight font-extrabold tracking-tight md:text-[34px]">{p.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {p.rating.count >= 3 && p.rating.average != null ? (
                <>
                  <span className="flex items-center gap-1 font-extrabold text-ink">
                    <StarIcon />
                    {p.rating.average.toFixed(1)}
                  </span>
                  <a href="#ratings" className="font-bold">
                    {p.rating.count} ratings
                  </a>
                </>
              ) : (
                <span className="rounded-md bg-ok-bg px-1.5 py-0.5 text-xs font-extrabold text-ok">New</span>
              )}
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                <MapPin aria-hidden className="size-4 text-brand" />
                {p.locality}, {p.city}
              </span>
            </div>
            {p.address && <p className="text-sm text-muted-2">{p.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:hidden">
            <div className="rounded-2xl bg-blush p-4">
              <div className="text-xs font-bold text-brand-dark">Monthly rent</div>
              <div className="text-[22px] font-extrabold text-brand">{formatRupees(p.rent)}</div>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <div className="text-xs font-bold text-muted-foreground">Security deposit</div>
              <div className="text-[22px] font-extrabold">{p.deposit != null ? formatRupees(p.deposit) : "Ask owner"}</div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-line p-4">
                <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-[15px] font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          {(p.amenities.length > 0 || p.food) && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {p.amenities.map((a) => {
                  const Icon = AMENITY_ICON[a];
                  return (
                    <span key={a} className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold">
                      <Icon aria-hidden className="size-4 text-brand" />
                      {AMENITY_LABEL[a]}
                    </span>
                  );
                })}
                {p.food && (
                  <span className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold">
                    <Utensils aria-hidden className="size-4 text-brand" />
                    Food
                  </span>
                )}
              </div>
            </section>
          )}

          {p.description && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold">About this place</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-muted-2">{p.description}</p>
            </section>
          )}

          <RatingsSection ratings={ratings} foodServed={p.food} onRate={rate} />

          <div className="flex items-center gap-3 rounded-[20px] bg-surface p-4 lg:hidden">
            <Avatar name={p.owner.name} />
            <div className="flex flex-col">
              <span className="text-sm font-bold">Listed directly by owner</span>
              <span className="text-xs text-muted-foreground">Contact details shared once you connect</span>
            </div>
          </div>
        </div>

        {/* Web contact card */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-4 rounded-[24px] border border-line p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-baseline gap-1">
              <span className="text-[30px] font-extrabold text-brand">{formatRupees(p.rent)}</span>
              <span className="text-sm font-semibold text-muted-foreground">/month</span>
            </div>
            <div className="flex justify-between rounded-xl bg-surface px-4 py-3 text-sm">
              <span className="font-semibold text-muted-foreground">Security deposit</span>
              <span className="font-bold">{p.deposit != null ? formatRupees(p.deposit) : "Ask owner"}</span>
            </div>
            {ownerControls || contactButtons("stack")}
            {!p.viewerIsOwner && (
              <Button variant="neutral" block onClick={() => toggle(p.id)}>
                {isSaved(p.id) ? "♥ Saved" : "♡ Save property"}
              </Button>
            )}
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <Avatar name={p.owner.name} />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Listed directly by owner</span>
                <span className="text-xs text-muted-foreground">
                  {p.owner.ownerRating != null && p.rating.count >= 3 ? `Owner rated ${p.owner.ownerRating.toFixed(1)} · ` : ""}
                  number shown after login
                </span>
              </div>
            </div>
            {p.expiresAt && p.viewerIsOwner && (
              <span className="text-xs text-muted-foreground">Listing period ends {formatDate(new Date(p.expiresAt))}</span>
            )}
          </div>
        </aside>
      </div>

      {/* Phone action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-line bg-white px-5 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
        {ownerControls ? <div className="flex-1">{ownerControls}</div> : contactButtons("row")}
      </div>

      {contact && (
        <ContactSheet
          info={contact}
          canCall={canCall}
          canWhatsapp={canWa}
          onClose={() => setContact(null)}
          onSwitch={(c) => {
            setContact(null);
            void connect(c);
          }}
        />
      )}
    </div>
  );
}

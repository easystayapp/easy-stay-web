"use client";

import {
  Bath, BadgeCheck, Building2, CalendarClock, CalendarPlus, Car, ChevronLeft, Flag, Heart, Info, MapPin, MessageCircle, Phone, PhoneCall,
  ShieldCheck, Snowflake, Sofa, User, Users, Utensils, Wallet, Wifi, Zap, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContactSheet } from "@/components/property/contact-sheet";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { AboutCard, InfoTile, OfferGrid, Section, SectionHeading, SectionTabs, ShareButton, SimilarStays, type Offer, type Tab } from "@/components/property/detail-sections";
import { Gallery } from "@/components/property/gallery";
import { LocationMap } from "@/components/property/location-map";
import { OwnerCard } from "@/components/property/owner-card";
import { RatingsSection } from "@/components/property/ratings-section";
import { ReportDialog } from "@/components/property/report-dialog";
import { FreshnessLabel, HealthPill, SafetySection, WomenFirstPill } from "@/components/property/safety-badges";
import { SaveButton } from "@/components/property/property-card";
import { SosButton } from "@/components/safety/sos-button";
import { useAuth } from "@/hooks/use-auth";
import { useSaved } from "@/hooks/use-saved";
import { useToast } from "@/hooks/use-toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, StarIcon, StatusBadge } from "@/components/ui/primitives";
import { PropertyDetailSkeleton } from "@/components/ui/skeleton";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { areaName } from "@/lib/domain/landing";
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
export function PropertyDetails() {
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
  const [enquiry, setEnquiry] = useState<"visit" | "message" | null>(null);
  const [reporting, setReporting] = useState(false);
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

  const openEnquiry = async (mode: "visit" | "message") => {
    if (!(await requireLogin({ title: "Log in to book a visit", subtitle: "Chat with the owner and pick a time. Your number stays private until they accept." }))) return;
    setEnquiry(mode);
  };

  const report = async () => {
    if (!(await requireLogin({ title: "Log in to report this listing", subtitle: "Reports are reviewed by EasyStay within 24 hours." }))) return;
    setReporting(true);
  };

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
  if (!p || !ratings) return <PropertyDetailSkeleton />;

  const avail = availabilityLabel(p.availableFrom ? new Date(p.availableFrom) : null);
  const availText = avail === "Available now" ? "Immediately" : avail.replace("From ", "");
  const live = p.status === "active";
  const soldOut = p.status === "rented";
  const canCall = p.contactChannels.includes("call");
  const canWa = p.contactChannels.includes("whatsapp");
  const saved = isSaved(p.id);

  /** Headline numbers in the highlights card. */
  const stats: [LucideIcon, string, string][] = [
    [Users, p.type === "flat" ? "Size" : "Sharing", SHARING_LABEL[p.sharing]],
    [Sofa, "Furnishing", p.furnishing ? FURNISHING_LABEL[p.furnishing] : "Not specified"],
    [CalendarClock, "Available", availText],
  ];
  /** Smaller facts as chips under the numbers. */
  const chips: [LucideIcon, string][] = [
    [Building2, PROPERTY_TYPE_SHORT[p.type]],
    [User, `For ${GENDER_LABEL[p.availableFor].toLowerCase()}`],
    [Utensils, p.food ? "Food available" : "No food"],
  ];
  if (p.electricity) chips.push([Zap, ELECTRICITY_LABEL[p.electricity]]);
  if (p.safetyDetail?.ownerKycVerified) chips.push([BadgeCheck, "Verified owner"]);

  const offers: Offer[] = [
    ...p.amenities.map((a) => {
      const Icon = AMENITY_ICON[a];
      return { icon: <Icon aria-hidden />, label: AMENITY_LABEL[a] };
    }),
    ...(p.furnishing ? [{ icon: <Sofa aria-hidden />, label: FURNISHING_LABEL[p.furnishing] }] : []),
    ...(p.food ? [{ icon: <Utensils aria-hidden />, label: "Food available" }] : []),
    ...(p.electricity === "included" ? [{ icon: <Zap aria-hidden />, label: "Electricity included" }] : []),
  ];

  const tabs: Tab[] = [
    ...(p.description ? [{ id: "about", label: "About" }] : []),
    ...(offers.length ? [{ id: "amenities", label: "Amenities" }] : []),
    { id: "location", label: "Location" },
    { id: "policies", label: "Safety & rules" },
    { id: "host", label: "Owner" },
    { id: "reviews", label: "Reviews" },
  ];

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

  const soldOutPanel = (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl bg-surface p-4">
      <span className="text-sm font-extrabold">{soldOut ? "Sold out — this place has been rented" : "Not taking enquiries right now"}</span>
      <ButtonLink href={`/properties?city=${encodeURIComponent(p.city)}&q=${encodeURIComponent(p.locality)}&type=${p.type}`} size="sm" variant="outline">
        See similar places nearby
      </ButtonLink>
    </div>
  );

  const contactButtons = () =>
    !live ? (
      soldOutPanel
    ) : (
      <>
        <Button size="lg" block onClick={() => openEnquiry("visit")}>
          <CalendarPlus aria-hidden className="size-5" />
          Book a visit
        </Button>
        {canWa && (
          <Button variant="whatsapp" size="lg" block loading={busy === "whatsapp"} onClick={() => connect("whatsapp")}>
            {busy !== "whatsapp" && <MessageCircle aria-hidden className="size-5" />}
            WhatsApp owner
          </Button>
        )}
        {canCall && (
          <Button variant="outline" size="lg" block loading={busy === "call"} onClick={() => connect("call")}>
            {busy !== "call" && <Phone aria-hidden className="size-5" />}
            Call owner
          </Button>
        )}
      </>
    );

  /** Title, badges and freshness: above the gallery on desktop, below it on phones. */
  const titleBlock = (
    <div className="flex flex-col gap-2.5">
      <h1 className="text-[26px] leading-tight font-extrabold tracking-tight md:text-[34px]">{p.title}</h1>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin aria-hidden className="size-4 text-brand" />
          {areaName(p.locality)}, {p.city}
        </span>
        <span aria-hidden>·</span>
        {p.rating.count >= 3 && p.rating.average != null ? (
          <a href="#reviews" className="flex items-center gap-1 font-bold text-ink">
            <StarIcon />
            {p.rating.average.toFixed(1)}
            <span className="font-semibold text-muted-foreground">({p.rating.count})</span>
          </a>
        ) : (
          <span className="rounded-md bg-ok-bg px-1.5 py-0.5 text-xs font-extrabold text-ok">New</span>
        )}
        <span aria-hidden>·</span>
        <FreshnessLabel at={p.freshAt} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {live ? (
          <span className="rounded-lg bg-ok-bg px-2.5 py-1 text-[11px] font-extrabold tracking-[0.06em] text-ok">
            {avail === "Available now" ? "AVAILABLE NOW" : avail.toUpperCase()}
          </span>
        ) : soldOut ? (
          <span className="rounded-lg bg-blush px-2.5 py-1 text-[11px] font-extrabold tracking-[0.06em] text-brand-dark">SOLD OUT</span>
        ) : (
          <StatusBadge status={p.status} />
        )}
        {p.safety?.healthScore != null && <HealthPill score={p.safety.healthScore} className="py-1" />}
        {p.safety?.womenFirst && <WomenFirstPill className="py-1" />}
      </div>
    </div>
  );

  return (
    <div className="container-page pb-32 md:py-6 md:pb-16">
      <nav aria-label="Breadcrumb" className="mb-4 hidden flex-wrap items-center gap-2 text-[13px] font-semibold text-muted-foreground md:flex">
        <Link href="/" className="text-muted-foreground hover:text-ink">Home</Link>
        <span aria-hidden>/</span>
        <Link href={`/properties?city=${encodeURIComponent(p.city)}&q=${encodeURIComponent(p.locality)}&type=${p.type}`} className="text-muted-foreground hover:text-ink">
          {areaName(p.locality)} {PROPERTY_TYPE_SHORT[p.type]}s
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">{p.title}</span>
      </nav>

      {/*
        One grid on desktop: title row, then the photos with the booking card beside them
        (card top lines up with the photos), then the rest of the page under the photos.
      */}
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[auto_auto_1fr] md:gap-x-10 md:gap-y-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="hidden min-w-0 md:block">{titleBlock}</div>
        <div className="hidden shrink-0 justify-end gap-2 pb-1 md:flex md:self-end">
          <ShareButton title={p.title} />
          {!p.viewerIsOwner && (
            <button
              type="button"
              onClick={() => toggle(p.id)}
              aria-pressed={saved}
              className="inline-flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-line bg-white px-4 text-[13px] font-bold hover:border-input"
            >
              <Heart aria-hidden className={cx("size-4 text-brand", saved && "fill-brand")} />
              {saved ? "Saved" : "Save"}
            </button>
          )}
        </div>

      <div className="md:col-span-2 lg:col-span-1">
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
      </div>

      {/* Phones: title under the photos */}
      <div className="mt-5 md:hidden">{titleBlock}</div>

        <div className="mt-6 flex min-w-0 flex-col gap-10 md:col-span-2 md:mt-3 lg:col-span-1 lg:col-start-1 lg:row-start-3">
          {/* Highlights */}
          <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <dl className="grid grid-cols-3 gap-3">
              {stats.map(([Icon, k, v]) => (
                <div key={k} className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blush text-brand">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <dt className="text-[10px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">{k}</dt>
                    <dd className="text-[15px] font-extrabold sm:truncate">{v}</dd>
                  </span>
                </div>
              ))}
            </dl>
            <ul className="flex flex-wrap gap-2 border-t border-line-3 pt-4">
              {chips.map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] font-semibold">
                  <Icon aria-hidden className="size-3.5 text-brand" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <SectionTabs tabs={tabs} />

          {p.description && (
            <Section id="about">
              <SectionHeading eyebrow="The stay" title="About this place" />
              <AboutCard text={p.description} />
            </Section>
          )}

          {offers.length > 0 && (
            <Section id="amenities">
              <SectionHeading eyebrow="Amenities" title="What this place offers" />
              <OfferGrid offers={offers} />
            </Section>
          )}

          <Section id="location">
            <SectionHeading eyebrow="Location" title="Where you'll be" />
            <LocationMap title={p.title} address={p.address} locality={p.locality} city={p.city} geo={p.geo} />
          </Section>

          <Section id="policies" className="gap-6">
            <SectionHeading eyebrow="Before you book" title="Safety & house rules" />
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile icon={<CalendarClock aria-hidden />} label="Available from" value={availText} />
              <InfoTile icon={<Wallet aria-hidden />} label="Security deposit" value={p.deposit != null ? formatRupees(p.deposit) : "Ask owner"} />
              <InfoTile icon={<Zap aria-hidden />} label="Electricity" value={p.electricity ? ELECTRICITY_LABEL[p.electricity] : "Ask owner"} />
            </div>
            <SafetySection safety={p.safetyDetail} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface-2 p-5">
              <span className="text-[11px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">Good to know</span>
              <ul className="grid gap-2.5 text-sm text-muted-2 sm:grid-cols-2">
                <li className="flex items-start gap-2.5"><ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" /> Your number stays private until the owner accepts your enquiry.</li>
                <li className="flex items-start gap-2.5"><ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" /> Visit in daylight and see the room before paying anything.</li>
                <li className="flex items-start gap-2.5"><ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" /> No brokerage. Never pay a token to someone who isn&apos;t the owner.</li>
                {p.expiresAt && p.viewerIsOwner && (
                  <li className="flex items-start gap-2.5"><CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" /> Listing period ends {formatDate(new Date(p.expiresAt))}.</li>
                )}
              </ul>
              {!p.viewerIsOwner && (
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="flex items-center gap-3">
                    <SosButton place={`${p.title}, ${p.locality}, ${p.city}`} compact />
                    <span className="text-[13px] text-muted-2">Visiting now and feel unsafe?</span>
                  </span>
                  <button type="button" onClick={report} className="flex items-center gap-1.5 text-[13px] font-bold text-muted-2 hover:text-brand-dark">
                    <Flag aria-hidden className="size-4" />
                    Report this listing
                  </button>
                </div>
              )}
            </div>
          </Section>

          <Section id="host">
            <SectionHeading eyebrow="Your host" title="About the owner" />
            <div className={cx("grid gap-4", !p.viewerIsOwner && live && "md:grid-cols-2")}>
              <OwnerCard owner={p.owner} verified={p.safetyDetail?.ownerKycVerified} />
              {!p.viewerIsOwner && live && (
                <div className="flex flex-col gap-4 rounded-[22px] bg-ink p-6 text-white">
                  <span className="text-[11px] font-extrabold tracking-[0.14em] text-coral uppercase">Personal assistance</span>
                  <h3 className="text-lg leading-snug font-extrabold">Have questions about this stay?</h3>
                  <ul className="flex flex-col gap-2 text-sm text-white/80">
                    <li className="flex items-center gap-2.5"><PhoneCall aria-hidden className="size-4 text-coral" /> Talk to the owner directly</li>
                    <li className="flex items-center gap-2.5"><Wallet aria-hidden className="size-4 text-coral" /> No brokerage, no commission</li>
                    <li className="flex items-center gap-2.5"><ShieldCheck aria-hidden className="size-4 text-coral" /> Safety-checked by EasyStay</li>
                  </ul>
                  <div className={cx("mt-auto grid gap-2.5 pt-1", canWa ? "grid-cols-2" : "grid-cols-1")}>
                    <Button variant="coral" size="md" block className="px-3" onClick={() => openEnquiry("message")}>
                      <MessageCircle aria-hidden className="size-[18px]" />
                      Chat
                    </Button>
                    {canWa && (
                      <Button variant="whatsapp" size="md" block className="px-3" loading={busy === "whatsapp"} onClick={() => connect("whatsapp")}>
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <div id="reviews" className="scroll-mt-36">
            <div className="flex flex-col gap-5">
              <SectionHeading eyebrow="What people say" title="Reviews" />
              <RatingsSection ratings={ratings} foodServed={p.food} onRate={rate} />
            </div>
          </div>
        </div>

        {/* Booking card: starts level with the photos and follows the scroll */}
        <aside className="hidden lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:block">
          <div className="sticky top-24 flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-[24px] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-[30px] font-extrabold text-brand">{formatRupees(p.rent)}</span>
                  <span className="text-sm font-semibold text-muted-foreground">/month</span>
                </div>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-1 text-[11px] font-extrabold text-ok">
                  <BadgeCheck aria-hidden className="size-3.5" /> Zero brokerage
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-surface px-4 py-3 text-sm">
                <span className="font-semibold text-muted-foreground">Security deposit</span>
                <span className="font-bold">{p.deposit != null ? formatRupees(p.deposit) : "Ask owner"}</span>
              </div>
              {ownerControls || contactButtons()}
              {!p.viewerIsOwner && live && (
                <button type="button" onClick={() => openEnquiry("message")} className="flex items-center justify-center gap-1.5 text-sm font-bold text-brand hover:text-brand-dark">
                  <MessageCircle aria-hidden className="size-4" />
                  Questions? Ask the owner
                </button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                {p.owner.ownerRating != null && p.rating.count >= 3 ? `Owner rated ${p.owner.ownerRating.toFixed(1)} · ` : ""}
                Number shown after login
              </p>
            </div>
            <ul className="grid grid-cols-3 gap-2 rounded-[20px] border border-line bg-white p-3 text-center shadow-[var(--shadow-card)]">
              {[
                [ShieldCheck, "Safety-checked listings"],
                [Wallet, "No brokerage ever"],
                [PhoneCall, "Direct owner contact"],
              ].map(([Icon, label]) => {
                const I = Icon as LucideIcon;
                return (
                  <li key={label as string} className="flex flex-col items-center gap-1.5 px-1 py-1">
                    <span className="flex size-9 items-center justify-center rounded-full bg-blush text-brand">
                      <I aria-hidden className="size-[18px]" />
                    </span>
                    <span className="text-[11px] leading-tight font-bold">{label as string}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      <SimilarStays p={p} />

      {/* Phone action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        {ownerControls ? (
          <div className="flex-1">{ownerControls}</div>
        ) : !live ? (
          soldOutPanel
        ) : (
          <>
            <div className="flex shrink-0 flex-col leading-tight">
              <span className="text-[19px] font-extrabold text-brand">{formatRupees(p.rent)}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">per month</span>
            </div>
            <Button size="lg" className="h-12 min-w-0 flex-1 px-3" onClick={() => openEnquiry("visit")}>
              Book a visit
            </Button>
            {canWa && (
              <Button variant="whatsapp" size="icon-lg" aria-label="WhatsApp owner" className="size-12 shrink-0" loading={busy === "whatsapp"} onClick={() => connect("whatsapp")}>
                {busy !== "whatsapp" && <MessageCircle aria-hidden className="size-5" />}
              </Button>
            )}
            {canCall && (
              <Button variant="outline" size="icon-lg" aria-label="Call owner" className="size-12 shrink-0" loading={busy === "call"} onClick={() => connect("call")}>
                {busy !== "call" && <Phone aria-hidden className="size-5" />}
              </Button>
            )}
          </>
        )}
      </div>

      {enquiry && <EnquiryDialog propertyId={p.id} propertyTitle={p.title} initialMode={enquiry} onClose={() => setEnquiry(null)} />}
      {reporting && <ReportDialog propertyId={p.id} onClose={() => setReporting(false)} />}

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

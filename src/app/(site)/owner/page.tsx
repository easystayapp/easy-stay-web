"use client";

import { BadgeCheck, ChartColumn, Info, PhoneCall, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleMark } from "@/components/auth/login-panel";
import { useAuth } from "@/hooks/use-auth";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/client/api";

/** 12 · Owner sign-in */
export default function OwnerLandingPage() {
  const router = useRouter();
  const { ready, user, me, configured, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me?.ownerToolsOn) router.replace("/my-listings");
  }, [me, router]);

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.push("/owner/setup");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const BENEFITS = [
    { icon: Wallet, title: "Free for 15 days", body: "List at no cost and repost in one tap when it expires." },
    { icon: PhoneCall, title: "Direct calls & WhatsApp", body: "Seekers contact you themselves. No middlemen, no brokerage." },
    { icon: ChartColumn, title: "See who's looking", body: "Track views and enquiries for every listing." },
    { icon: ShieldCheck, title: "You stay in control", body: "Pause, mark as rented or edit whenever you like." },
  ];
  const STEPS = ["Sign in with Google", "Add your contact number", "Post photos and details"];

  const cta = (
    <div className="flex flex-col gap-3">
      {error && <ErrorNote>{error}</ErrorNote>}
      {!ready ? (
        <div className="h-[54px] animate-pulse rounded-[14px] bg-surface" />
      ) : user ? (
        <ButtonLink href="/owner/setup" size="lg" block>
          Continue — add contact number
        </ButtonLink>
      ) : configured ? (
        <Button variant="neutral" size="lg" block onClick={google} loading={busy} className="border-line-2 shadow-[var(--shadow-card)]">
          {!busy && <GoogleMark />}
          Continue with Google
        </Button>
      ) : (
        <ErrorNote>Sign-in isn&apos;t configured yet. Add your Firebase keys to .env.local.</ErrorNote>
      )}
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to EasyStay&apos;s <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blush via-white to-blush-2/60">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-blush-2/70 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-10 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-dark shadow-[var(--shadow-card)]">
              <Image src="/brand/logo-mark.png" alt="" width={20} height={18} className="h-auto w-5" />
              For property owners
            </span>
            <div className="flex flex-col gap-3">
              <h1 className="text-[34px] leading-[1.08] font-extrabold tracking-tight md:text-[48px]">
                List your property in <span className="text-brand">about 2 minutes</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-2 md:text-lg">
                Reach people searching for a PG, room or flat right now. They call or WhatsApp you directly, with no middlemen and no brokerage.
              </p>
            </div>

            <div className="max-w-md rounded-[24px] border border-blush-line bg-white p-5 shadow-[var(--shadow-pop)]">
              <p className="mb-4 flex items-center gap-2 text-sm font-extrabold">
                <BadgeCheck aria-hidden className="size-5 text-brand" />
                Start listing for free
              </p>
              {cta}
            </div>
          </div>

          {/* Photo collage */}
          <div aria-hidden className="relative mx-auto hidden h-[440px] w-full max-w-[460px] lg:block">
            <div className="absolute top-0 right-0 h-[270px] w-[78%] overflow-hidden rounded-[28px] shadow-[var(--shadow-pop)]">
              <Image src="/demo/photos/apartment-building.jpg" alt="" fill sizes="360px" className="object-cover" priority />
            </div>
            <div className="absolute bottom-0 left-0 h-[220px] w-[62%] overflow-hidden rounded-[28px] border-4 border-white shadow-[var(--shadow-pop)]">
              <Image src="/demo/photos/hostel-bunk-room.jpg" alt="" fill sizes="290px" className="object-cover" />
            </div>
            <div className="absolute bottom-10 right-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-pop)]">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blush text-brand"><PhoneCall className="size-5" /></span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-extrabold">Direct enquiries</span>
                <span className="text-xs text-muted-foreground">Call or WhatsApp you</span>
              </span>
            </div>
            <div className="absolute top-[52%] left-2 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white shadow-[var(--shadow-pop)]">
              <RotateCcw className="size-3.5" /> Free · 15 days
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-page pt-12 md:pt-16">
        <h2 className="mb-5 text-[22px] font-extrabold tracking-tight md:text-[26px]">Why owners list on EasyStay</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="lift flex flex-col gap-3 rounded-[22px] border-[1.5px] border-line bg-white p-5 hover:border-blush-line hover:shadow-[var(--shadow-card)]">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-blush text-brand">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="text-[17px] font-extrabold">{title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{body}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Steps */}
      <section className="container-page pt-12 md:pt-16">
        <h2 className="mb-5 text-[22px] font-extrabold tracking-tight md:text-[26px]">Live in three steps</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((t, i) => (
            <li key={t} className="flex items-center gap-4 rounded-[22px] bg-surface p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand font-extrabold text-white">{i + 1}</span>
              <span className="text-[15px] font-bold">{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex gap-2.5 rounded-2xl bg-surface p-4 text-[13px] leading-relaxed text-muted-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
          Listing tools switch on once you add the mobile number seekers should call. You can still browse and contact other owners.
        </p>
      </section>

      {/* Closing call to action */}
      <section className="container-page py-12 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-ink p-8 text-white md:p-10">
          <div className="flex flex-[1_1_380px] flex-col gap-2">
            <span className="text-[24px] font-extrabold tracking-tight md:text-[28px]">Ready to fill your rooms?</span>
            <span className="text-base text-[#D9D2D4]">It takes about 2 minutes and costs nothing for 15 days.</span>
          </div>
          <div className="w-full max-w-sm">{cta}</div>
        </div>
      </section>
    </>
  );
}

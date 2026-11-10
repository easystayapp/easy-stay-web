"use client";

import { ChartColumn, Info, RotateCcw } from "lucide-react";
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

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-7 px-5 py-8 md:py-14">
      <div className="flex items-center gap-3">
        <Image src="/brand/logo-mark.png" alt="EasyStay" width={44} height={39} className="h-auto w-11" />
        <span className="rounded-full bg-blush px-3 py-1.5 text-xs font-bold text-brand-dark">For property owners</span>
      </div>
      <div className="flex flex-col gap-2.5">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight md:text-[36px]">List your property in about 2 minutes</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">Seekers contact you directly by call or WhatsApp. No middlemen.</p>
      </div>
      <ul className="flex flex-col gap-3">
        <li className="flex items-center gap-3 text-sm font-semibold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blush text-brand"><RotateCcw aria-hidden className="size-[18px]" /></span>
          Free 15-day listing, repost in one tap
        </li>
        <li className="flex items-center gap-3 text-sm font-semibold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blush text-brand"><ChartColumn aria-hidden className="size-[18px]" /></span>
          See how many people viewed it
        </li>
      </ul>
      <p className="flex gap-2.5 rounded-2xl bg-surface p-4 text-[13px] leading-relaxed text-muted-2">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        Listing tools are switched on for your account once you add the mobile number seekers should call. You can still browse and contact other owners.
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}
      {!ready ? null : user ? (
        <ButtonLink href="/owner/setup" size="lg" block>
          Continue — add contact number
        </ButtonLink>
      ) : configured ? (
        <div className="flex flex-col gap-3">
          <Button variant="neutral" size="lg" block onClick={google} loading={busy} className="border-line-2">
            {!busy && <GoogleMark />}
            Continue with Google
          </Button>
        </div>
      ) : (
        <ErrorNote>Sign-in isn&apos;t configured yet. Add your Firebase keys to .env.local.</ErrorNote>
      )}
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to EasyStay&apos;s <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}

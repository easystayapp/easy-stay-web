"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/client/api";
import { PhoneOtpFlow } from "./phone-otp-flow";
import type { LoginCopy } from "./login-dialog";

export function GoogleMark() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Google or mobile OTP, then a name prompt for phone-only accounts. */
export function LoginPanel({
  copy,
  step,
  onStep,
  onDone,
}: {
  copy?: LoginCopy;
  step: "choose" | "code" | "name";
  onStep: (s: "choose" | "code" | "name") => void;
  onDone: () => void;
}) {
  const { configured, signInWithGoogle, refreshMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const finish = async () => {
    const me = await refreshMe();
    if (me && !me.displayName) onStep("name");
    else onDone();
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      await finish();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.updateProfile({ displayName: name });
      await refreshMe();
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  if (step === "name") {
    return (
      <form onSubmit={saveName} className="flex flex-col gap-5 pt-2" noValidate>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px] font-extrabold tracking-tight">What should owners call you?</h2>
          <p className="text-sm text-muted-foreground">Only your first name is shown on ratings. Your number is never shown.</p>
        </div>
        <Field>
          <FieldLabel htmlFor="login-name">Your name</FieldLabel>
          <Input id="login-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" size="lg" block loading={busy}>
          Continue
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Image src="/brand/logo-mark.png" alt="EasyStay" width={44} height={39} className="h-auto w-11" />
      {step === "choose" && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] leading-tight font-extrabold tracking-tight">
            {copy?.title ?? "Login to connect directly with the property owner"}
          </h2>
          <p className="text-[15px] text-muted-foreground">{copy?.subtitle ?? "We'll bring you right back to this property."}</p>
        </div>
      )}

      {!configured ? (
        <ErrorNote>
          Sign-in isn&apos;t configured yet. Add your Firebase keys to <code>.env.local</code> (see .env.example).
        </ErrorNote>
      ) : (
        <>
          {step === "choose" && (
            <>
              <Button variant="neutral" size="lg" block onClick={google} loading={busy} className="border-line-2">
                {!busy && <GoogleMark />}
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                <span aria-hidden className="h-px flex-1 bg-line" />
                or use your mobile
                <span aria-hidden className="h-px flex-1 bg-line" />
              </div>
              {error && <ErrorNote>{error}</ErrorNote>}
            </>
          )}
          <PhoneOtpFlow mode="signin" onVerified={finish} onStepChange={(s) => onStep(s === "code" ? "code" : "choose")} />
        </>
      )}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Browsing never needs an account. By continuing you agree to EasyStay&apos;s{" "}
        <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}

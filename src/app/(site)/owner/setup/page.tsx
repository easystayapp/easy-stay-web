"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleMark } from "@/components/auth/login-panel";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar, ErrorNote } from "@/components/ui/primitives";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api, errorMessage } from "@/lib/client/api";
import { normalizeIndianMobile } from "@/lib/domain/format";

/** "+919876543210" → "98765 43210" for the +91 input. */
const national = (e164: string | null | undefined) => {
  const m = e164 ? /^\+91(\d{5})(\d{5})$/.exec(e164) : null;
  return m ? `${m[1]} ${m[2]}` : "";
};

/** 13 · Turn on owner tools: sign in, then the number seekers should call. */
export default function OwnerSetupPage() {
  const router = useRouter();
  const toast = useToast();
  const { ready, configured, user, me, refreshMe, signInWithGoogle } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Prefilled with the number used last time owner tools were on.
  const value = phone ?? national(me?.owner?.contactPhone ?? me?.phone);

  useEffect(() => {
    if (me?.ownerToolsOn) router.replace("/my-listings");
  }, [me, router]);

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    const contactPhone = normalizeIndianMobile(value);
    if (!contactPhone) return setError("Enter a valid 10-digit mobile number.");
    setError(null);
    setBusy(true);
    try {
      await api.enableOwnerTools({ contactPhone });
      await refreshMe();
      toast("Owner tools are on");
      router.replace("/my-listings");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  if (!ready || (user && !me)) return <PageSpinner />;

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-7 px-5 py-6 md:py-12">
      <PageHeader back="/owner" title="Turn on owner tools" />

      {user && me && (
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5">
          <Avatar name={me.displayName || "E"} />
          <div className="flex flex-col">
            <span className="text-sm font-bold">Signed in with Google</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-[0.08em] text-brand-dark uppercase">
          Owner setup · step {user ? 2 : 1} of 2
        </span>
        <h2 className="text-[26px] leading-tight font-extrabold tracking-tight">
          {user ? "Where should seekers reach you?" : "Sign in to continue"}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {user
            ? "Seekers will call and WhatsApp you on this number. It stays hidden until they log in."
            : "Owner tools are switched on for your regular EasyStay account."}
        </p>
      </div>

      {!configured ? (
        <ErrorNote>Sign-in isn&apos;t configured yet. Add your Firebase keys to .env.local.</ErrorNote>
      ) : !user ? (
        <div className="flex flex-col gap-3">
          <Button variant="neutral" size="lg" block onClick={google} loading={busy} className="border-line-2">
            {!busy && <GoogleMark />}
            Continue with Google
          </Button>
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      ) : (
        <form onSubmit={enable} className="flex flex-col gap-4" noValidate>
          <Field>
            <FieldLabel htmlFor="owner-phone">Mobile number</FieldLabel>
            <InputGroup className="h-[54px]">
              <InputGroupAddon>
                <InputGroupText className="border-r border-input pr-3 text-[15px] font-bold text-foreground">+91</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="owner-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={value}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!error || undefined}
                aria-describedby="owner-phone-hint"
                className="font-bold"
              />
            </InputGroup>
            <FieldDescription id="owner-phone-hint" className="text-xs">
              You can change it, or add a separate WhatsApp number, in owner settings.
            </FieldDescription>
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" size="lg" block loading={busy}>
            Turn on owner tools
          </Button>
        </form>
      )}
    </div>
  );
}

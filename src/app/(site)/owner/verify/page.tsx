"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneOtpFlow } from "@/components/auth/phone-otp-flow";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar, ErrorNote } from "@/components/ui/primitives";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api, errorMessage } from "@/lib/client/api";
import { formatPhone } from "@/lib/domain/format";

/** 13 · Turn on owner tools — verify a mobile number, then enable. */
export default function VerifyPhonePage() {
  const router = useRouter();
  const toast = useToast();
  const { ready, user, me, refreshMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enable = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.enableOwnerTools();
      await refreshMe();
      toast("Owner tools are on");
      router.replace("/my-listings");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  if (!ready || (user && !me)) return <PageSpinner />;
  const verifiedPhone = user?.phoneNumber ?? null;

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-7 px-5 py-6 md:py-12">
      <PageHeader back="/owner" title="Turn on owner tools" />
      {user && me && (
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5">
          <Avatar name={me.displayName || "E"} />
          <div className="flex flex-col">
            <span className="text-sm font-bold">Signed in{user.email ? " with Google" : ""}</span>
            <span className="text-xs text-muted-foreground">{user.email ?? formatPhone(user.phoneNumber)}</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-[0.08em] text-brand-dark uppercase">
          Owner verification · step {user ? 2 : 1} of 2
        </span>
        <h2 className="text-[26px] leading-tight font-extrabold tracking-tight">Verify your mobile number</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Seekers will call and WhatsApp you on this number. It stays hidden until they log in.
        </p>
      </div>

      {verifiedPhone ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-ok/30 bg-ok-bg p-4">
            <ShieldCheck aria-hidden className="size-6 text-ok" />
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold">{formatPhone(verifiedPhone)}</span>
              <span className="text-xs font-semibold text-ok">Verified on this account</span>
            </div>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button size="lg" block loading={busy} onClick={enable}>
            Turn on owner tools
          </Button>
        </div>
      ) : (
        <PhoneOtpFlow
          mode={user ? "link" : "signin"}
          verifyLabel="Verify & turn on owner tools"
          onVerified={enable}
        />
      )}
      {error && !verifiedPhone && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoginPanel } from "@/components/auth/login-panel";
import { useAuth } from "@/hooks/use-auth";

/** Only same-site relative paths are allowed as a return target. */
function safeNext(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { ready, user, me } = useAuth();
  const [step, setStep] = useState<"choose" | "code" | "name">("choose");

  useEffect(() => {
    if (ready && user && me?.displayName && step !== "name") router.replace(next);
  }, [ready, user, me, next, router, step]);

  return (
    <main className="flex min-h-dvh items-end justify-center bg-ink/45 md:items-center md:bg-blush md:p-6">
      <div role="dialog" aria-modal="true" aria-label="Log in" className="relative w-full rounded-t-[28px] bg-white px-[22px] pt-6 pb-8 md:max-w-[460px] md:rounded-[28px] md:px-8 md:pt-8">
        <Link
          href={next}
          aria-label="Close"
          className="absolute top-5 right-5 flex size-10 items-center justify-center rounded-xl border-[1.5px] border-line text-ink hover:text-ink"
        >
          <X aria-hidden className="size-[18px]" />
        </Link>
        <LoginPanel
          step={step}
          onStep={setStep}
          onDone={() => router.replace(next)}
          copy={{
            title: next === "/" ? "Log in to EasyStay" : undefined,
            subtitle: next === "/" ? "Save places, contact owners and rate where you've stayed." : "You'll come right back to where you were.",
          }}
        />
      </div>
    </main>
  );
}

/** 07 · Login to contact · W4 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}

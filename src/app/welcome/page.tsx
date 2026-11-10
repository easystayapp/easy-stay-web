"use client";

import { ChevronRight, KeyRound, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCatalog } from "@/hooks/use-catalog";
import { markWelcomeSeen } from "@/lib/client/prefs";
import type { Audience } from "@/lib/domain/content";

/** Where each audience goes, and its icon. The card text comes from the database. */
const DESTINATION: Record<Audience, { href: string; icon: typeof Search }> = {
  seeker: { href: "/", icon: Search },
  owner: { href: "/owner", icon: KeyRound },
};

/** 01 · Welcome — choose a starting point. Same account either way. */
export default function WelcomePage() {
  const { welcome } = useCatalog();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-5 rounded-[28px] bg-blush px-6 py-10 text-center">
        <Image src="/brand/logo-full.png" alt="EasyStay" width={170} height={155} priority className="h-auto w-[150px]" />
        <p className="text-[15px] font-bold text-brand-dark">Find your stay. Connect directly.</p>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold tracking-tight">Welcome to EasyStay</h1>
        <p className="text-[15px] text-muted-foreground">Find your perfect place or list your property.</p>
      </div>
      <div className="flex flex-col gap-3">
        {welcome.roles.map((r) => {
          const { href, icon: Icon } = DESTINATION[r.audience];
          return (
            <Link
              key={r.audience}
              href={href}
              onClick={markWelcomeSeen}
              className="flex items-center gap-4 rounded-[20px] border-[1.5px] border-line p-4 text-ink hover:border-brand hover:text-ink"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-blush text-brand">
                <Icon aria-hidden className="size-[22px]" />
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-base font-extrabold">{r.title}</span>
                <span className="text-[13px] text-muted-foreground">{r.body}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-brand" />
            </Link>
          );
        })}
      </div>
      <p className="mt-auto text-center text-[13px] leading-relaxed text-muted-foreground">
        Anyone can browse — no login needed.
        <br />
        Owners get extra listing tools on the same account.
      </p>
    </main>
  );
}

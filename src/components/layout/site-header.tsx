"use client";

import { Bell, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCity } from "@/hooks/use-city";
import { ButtonLink } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Avatar } from "@/components/ui/primitives";
import { cx } from "@/lib/client/cx";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink hover:text-ink" aria-label="EasyStay home">
      <Image src="/brand/logo-mark.png" alt="" width={34} height={30} className="h-auto w-[34px]" priority />
      <span className={cx("text-[22px] font-extrabold tracking-tight", compact && "max-sm:sr-only")}>EasyStay</span>
    </Link>
  );
}

function HeaderSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const { city } = useCity();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      className="order-last w-full md:order-none md:w-auto md:max-w-[420px] md:flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(params);
        if (q.trim()) next.set("q", q.trim());
        else next.delete("q");
        if (!next.get("city")) next.set("city", city);
        next.delete("page");
        router.push(`/properties?${next}`);
      }}
    >
      <InputGroup className="h-11 rounded-xl border-transparent bg-surface">
        <InputGroupAddon>
          <Search aria-hidden className="size-[18px] text-brand" />
        </InputGroupAddon>
        <InputGroupInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search area, PG, room or flat"
          placeholder="Search area, PG, room or flat"
          className="text-sm"
        />
      </InputGroup>
    </form>
  );
}

const navLink = (active: boolean) =>
  cx("text-sm font-semibold hover:text-brand", active ? "text-brand" : "text-ink");

export function SiteHeader() {
  const pathname = usePathname();
  const { ready, user, me } = useAuth();
  const ownerOn = !!me?.ownerToolsOn;
  const showSearch = pathname === "/properties";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex flex-wrap items-center gap-x-7 gap-y-3 py-3.5">
        <Logo compact={showSearch} />
        {showSearch && (
          <Suspense fallback={<div className="h-11 flex-1" />}>
            <HeaderSearch />
          </Suspense>
        )}
        <nav aria-label="Main" className={cx("hidden flex-wrap gap-x-6 gap-y-2 md:flex", !showSearch && "flex-1")}>
          {!showSearch && (
            <Link href="/properties" className={navLink(pathname.startsWith("/properties"))}>
              Find a stay
            </Link>
          )}
          {ownerOn ? (
            <Link
              href="/my-listings"
              aria-current={pathname.startsWith("/my-listings") ? "page" : undefined}
              className={navLink(pathname.startsWith("/my-listings"))}
            >
              My listings
            </Link>
          ) : (
            <Link href="/owner" className={navLink(pathname.startsWith("/owner"))}>
              List your property
            </Link>
          )}
          <Link href="/saved" className={navLink(pathname === "/saved")}>
            Saved
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {ownerOn && (
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="flex size-11 items-center justify-center rounded-xl text-ink hover:bg-surface hover:text-ink"
            >
              <Bell aria-hidden className="size-5" />
            </Link>
          )}
          {!ready ? (
            <span className="h-11 w-24" />
          ) : user ? (
            <Link href="/profile" aria-label="Profile" className="flex items-center gap-2.5 text-ink hover:text-ink">
              <Avatar name={me?.displayName || "E"} size={40} />
              {me?.displayName && (
                <span className="hidden flex-col leading-tight lg:flex">
                  <span className="text-sm font-bold">{me.displayName.split(" ")[0]}</span>
                  {ownerOn && <span className="text-[11px] font-bold text-ok">Owner tools on</span>}
                </span>
              )}
            </Link>
          ) : (
            <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} size="sm" className="h-11 rounded-xl px-5">
              Log in
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { Heart, MessagesSquare, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ButtonLink } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar, Pill } from "@/components/ui/primitives";
import { cx } from "@/lib/client/cx";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink hover:text-ink" aria-label="EasyStay home">
      <Image src="/brand/logo-mark.png" alt="" width={34} height={30} className="h-auto w-[34px]" priority />
      <span className={cx("text-[22px] font-extrabold tracking-tight", compact && "max-sm:sr-only")}>EasyStay</span>
    </Link>
  );
}

const navLink = (active: boolean) =>
  cx("text-sm font-semibold hover:text-brand", active ? "text-brand" : "text-ink");

export function SiteHeader() {
  const pathname = usePathname();
  const { ready, user, me } = useAuth();
  const ownerOn = !!me?.ownerToolsOn;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex flex-wrap items-center gap-x-7 gap-y-3 py-3.5">
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 flex-wrap gap-x-6 gap-y-2 md:flex">
          <Link href="/properties" className={navLink(pathname.startsWith("/properties"))}>
            Find a stay
          </Link>
          {ownerOn && (
            <Link
              href="/my-listings"
              aria-current={pathname.startsWith("/my-listings") ? "page" : undefined}
              className={navLink(pathname.startsWith("/my-listings"))}
            >
              My listings
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <Link
              href="/inbox"
              aria-label="Inbox"
              aria-current={pathname.startsWith("/inbox") ? "page" : undefined}
              className={cx(
                "flex size-11 items-center justify-center rounded-xl transition-colors hover:text-brand",
                pathname.startsWith("/inbox") ? "bg-blush text-brand" : "text-ink hover:bg-surface",
              )}
            >
              <MessagesSquare aria-hidden className="size-5" />
            </Link>
          )}
          {user && <NotificationBell />}
          <Link
            href="/saved"
            aria-label="Saved properties"
            aria-current={pathname === "/saved" ? "page" : undefined}
            className={cx(
              "hidden h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors hover:text-brand sm:flex md:px-4",
              pathname === "/saved" ? "bg-blush text-brand" : "text-ink hover:bg-surface",
            )}
          >
            <Heart aria-hidden className={cx("size-[18px]", pathname === "/saved" && "fill-current")} />
            <span className="max-md:sr-only">Saved</span>
          </Link>
          {!ready ? (
            <span className="h-11 w-24" />
          ) : user ? (
            <Link href="/profile" aria-label="Profile" className="flex items-center gap-2.5 text-ink hover:text-ink">
              <span className="relative">
                <Avatar name={me?.displayName || "E"} size={40} />
                {ownerOn && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-white bg-tag lg:hidden"
                  />
                )}
              </span>
              {me?.displayName && (
                <span className="hidden flex-col items-start gap-0.5 leading-tight lg:flex">
                  <span className="text-sm font-bold">{me.displayName.split(" ")[0]}</span>
                  {ownerOn && (
                    <Pill>Owner</Pill>
                  )}
                </span>
              )}
              {ownerOn && <span className="sr-only">Property owner</span>}
            </Link>
          ) : (
            <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="outline" size="sm" className="h-11 rounded-xl px-5">
              Log in
            </ButtonLink>
          )}
          {/* Primary call to action: owners already have "My listings" and their own Add property button */}
          {!ownerOn && (
            <ButtonLink
              href={ownerOn ? "/my-listings/new" : "/owner"}
              size="sm"
              aria-label="List property"
              className="ml-1 h-11 gap-1.5 rounded-xl px-4 font-bold shadow-[0_6px_16px_rgba(214,40,67,0.28)] sm:px-5"
            >
              <Plus aria-hidden className="size-[18px]" strokeWidth={2.5} />
              <span className="max-sm:hidden">List property</span>
              <span aria-hidden className="sm:hidden">List</span>
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}

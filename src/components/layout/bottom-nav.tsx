"use client";

import { Heart, House, LayoutGrid, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cx } from "@/lib/client/cx";

/** Screens with their own sticky action bar. */
const HIDE_ON = [/^\/properties\/[^/]+(\/rate)?$/, /^\/my-listings\/new$/, /^\/my-listings\/[^/]+\/edit$/, /^\/inbox\/[^/]+$/];

/** Phone navigation. Adds "My listings" when owner tools are on. */
export function BottomNav() {
  const pathname = usePathname();
  const { me } = useAuth();
  if (HIDE_ON.some((re) => re.test(pathname))) return null;
  const items = [
    { href: "/", label: "Home", icon: House, active: pathname === "/" },
    { href: "/search", label: "Search", icon: Search, active: pathname === "/search" || pathname === "/properties" },
    me?.ownerToolsOn
      ? { href: "/my-listings", label: "My listings", icon: LayoutGrid, active: pathname.startsWith("/my-listings") }
      : { href: "/saved", label: "Saved", icon: Heart, active: pathname === "/saved" },
    { href: "/profile", label: "Profile", icon: User, active: pathname.startsWith("/profile") },
  ];
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-4 items-center border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cx(
            "flex flex-col items-center gap-1 text-[11px] font-bold",
            active ? "text-brand hover:text-brand" : "text-muted-foreground hover:text-ink",
          )}
        >
          <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

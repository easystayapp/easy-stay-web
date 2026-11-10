"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/ui/primitives";
import { cx } from "@/lib/client/cx";
import type { Me } from "@/types/api";

/** W7 · account side navigation (desktop); content stacks on phones. */
export function ProfileShell({ me, children }: { me: Me; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const links = [
    { href: "/profile", label: "Personal details" },
    ...(me.ownerToolsOn
      ? [
          { href: "/profile/owner-settings", label: "Owner settings" },
          { href: "/my-listings", label: "My listings" },
          { href: "/notifications", label: "Notifications" },
        ]
      : [{ href: "/owner/setup", label: "Own a property?" }]),
    { href: "/saved", label: "Saved properties" },
    { href: "/profile/ratings", label: "My ratings" },
  ];
  return (
    <div className="container-page grid gap-8 py-6 md:grid-cols-[260px_1fr] md:py-10">
      <nav aria-label="Account" className="hidden self-start rounded-[22px] border border-line p-4 md:sticky md:top-24 md:block">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <Avatar name={me.displayName || "E"} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-extrabold">{me.displayName || "Your account"}</span>
            <span className={cx("text-[11px] font-extrabold tracking-[0.06em]", me.ownerToolsOn ? "text-ok" : "text-muted-foreground")}>
              {me.ownerToolsOn ? "OWNER TOOLS ON" : "OWNER TOOLS OFF"}
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={cx(
                  "block rounded-xl px-3 py-2.5 text-sm font-semibold",
                  pathname === l.href ? "bg-blush font-bold text-brand-dark" : "text-ink hover:bg-surface hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/welcome");
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brand-dark hover:bg-blush"
            >
              Log out
            </button>
          </li>
        </ul>
      </nav>
      <section className="min-w-0">{children}</section>
    </div>
  );
}

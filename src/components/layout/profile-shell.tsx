"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/ui/primitives";
import { cx } from "@/lib/client/cx";
import type { Me } from "@/types/api";

export const PROFILE_TABS = ["details", "owner-settings", "listings", "notifications", "saved", "ratings"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
export const tabHref = (t: ProfileTab) => (t === "details" ? "/profile" : `/profile?tab=${t}`);

/** W7 · account side navigation (desktop); every section opens inside this page. */
export function ProfileShell({ me, active, children }: { me: Me; active: ProfileTab; children: ReactNode }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const links: { tab: ProfileTab | null; href: string; label: string }[] = [
    { tab: "details", href: tabHref("details"), label: "Personal details" },
    ...(me.ownerToolsOn
      ? [
          { tab: "owner-settings" as const, href: tabHref("owner-settings"), label: "Owner settings" },
          { tab: "listings" as const, href: tabHref("listings"), label: "My listings" },
          { tab: "notifications" as const, href: tabHref("notifications"), label: "Notifications" },
          { tab: null, href: "/owner/verification", label: "Verification & safety" },
        ]
      : [{ tab: null, href: "/owner/setup", label: "Own a property?" }]),
    { tab: "saved", href: tabHref("saved"), label: "Saved properties" },
    { tab: "ratings", href: tabHref("ratings"), label: "My ratings" },
    { tab: null, href: "/inbox", label: "Messages & visits" },
    { tab: null, href: "/profile/reports", label: "Reports & grievances" },
  ];
  return (
    <div className="container-page grid gap-8 py-6 md:grid-cols-[260px_1fr] md:py-10">
      <nav aria-label="Account" className="hidden self-start rounded-[22px] border border-line p-4 md:sticky md:top-24 md:block">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <Avatar name={me.displayName || "E"} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-extrabold">{me.displayName || "Your account"}</span>
            <span className={cx("text-[11px] font-extrabold tracking-[0.06em]", me.ownerToolsOn ? "text-ok" : "text-muted-foreground")}>
              {me.ownerToolsOn ? "OWNER" : "SEEKER"}
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                scroll={false}
                aria-current={l.tab === active ? "page" : undefined}
                className={cx(
                  "block rounded-xl px-3 py-2.5 text-sm font-semibold",
                  l.tab === active ? "bg-blush font-bold text-brand-dark" : "text-ink hover:bg-surface hover:text-ink",
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

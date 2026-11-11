"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useCatalog } from "@/hooks/use-catalog";
import { useCity } from "@/hooks/use-city";

const linkClass = "text-[14px] text-muted-foreground hover:text-brand";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-[13px] font-extrabold tracking-[0.06em] text-ink uppercase">{title}</h2>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </nav>
  );
}

const find = (params: Record<string, string>) => `/properties?${new URLSearchParams(params)}`;

export function SiteFooter() {
  const { cities } = useCatalog();
  const { city } = useCity();
  const { me } = useAuth();
  const ownerOn = !!me?.ownerToolsOn;

  return (
    <footer className="mt-4 border-t border-line bg-surface max-md:pb-[76px]">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:grid-cols-[1.6fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-4 md:col-span-4 lg:col-span-1">
          <Link href="/" aria-label="EasyStay home" className="flex items-center gap-2.5 text-ink hover:text-ink">
            <Image src="/brand/logo-mark.png" alt="" width={34} height={30} className="h-auto w-[34px]" />
            <span className="text-[20px] font-extrabold tracking-tight">EasyStay</span>
          </Link>
          <p className="max-w-[300px] text-[14px] leading-relaxed text-muted-foreground">
            Find PGs, hostels, rooms and flats, and call or WhatsApp the owner directly. No brokers, no commission.
          </p>
          <p className="text-[13px] font-bold text-brand-dark">Find your stay. Connect directly.</p>
        </div>

        <Column title="Find a stay">
          <li><Link href={find({ city })} className={linkClass}>All properties</Link></li>
          <li><Link href={find({ city, type: "pg" })} className={linkClass}>PG / Hostel</Link></li>
          <li><Link href={find({ city, type: "room" })} className={linkClass}>Rooms</Link></li>
          <li><Link href={find({ city, type: "flat" })} className={linkClass}>Flats</Link></li>
          <li><Link href="/saved" className={linkClass}>Saved</Link></li>
        </Column>

        <Column title="Cities">
          {cities.map((c) => (
            <li key={c.id}>
              <Link href={`/pg/${c.id}`} className={linkClass}>
                PG in {c.label}
              </Link>
            </li>
          ))}
        </Column>

        <Column title="For owners">
          <li>
            <Link href={ownerOn ? "/my-listings/new" : "/owner"} className={linkClass}>
              List your property
            </Link>
          </li>
          {ownerOn && (
            <li>
              <Link href="/my-listings" className={linkClass}>My listings</Link>
            </li>
          )}
          <li><Link href="/help" className={linkClass}>How listing works</Link></li>
          <li><Link href="/help#ratings" className={linkClass}>How ratings work</Link></li>
        </Column>

        <Column title="Company">
          <li><Link href="/about" className={linkClass}>About</Link></li>
          <li><Link href="/help" className={linkClass}>Help &amp; support</Link></li>
          <li><Link href="/terms" className={linkClass}>Terms of use</Link></li>
          <li><Link href="/privacy" className={linkClass}>Privacy policy</Link></li>
        </Column>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-[13px] text-muted-foreground">
          <span>© {new Date().getFullYear()} EasyStay. All rights reserved.</span>
          <span>EasyStay connects seekers and owners. It isn&apos;t a party to any rental agreement.</span>
        </div>
      </div>
    </footer>
  );
}

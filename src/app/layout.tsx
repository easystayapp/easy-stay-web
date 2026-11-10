import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { EMPTY_CATALOG } from "@/components/providers/catalog-provider";
import { Providers } from "@/components/providers/providers";
import type { Catalog } from "@/lib/domain/content";
import { getRepositories } from "@/lib/server/repositories";
import { getCatalog } from "@/lib/server/services/content";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "EasyStay — Find your stay. Connect directly.", template: "%s · EasyStay" },
  description:
    "Find PGs, hostels, rooms and flats. Browse without signing up, then call or WhatsApp the owner directly — no brokers.",
  icons: { icon: "/brand/logo-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#D62843",
  width: "device-width",
  initialScale: 1,
};

/** Content changes in the database show up within a minute (ISR). */
export const revalidate = 60;

async function loadCatalog(): Promise<Catalog> {
  try {
    return await getCatalog(await getRepositories());
  } catch (err) {
    console.error("[easystay] Could not load content from the database", err);
    return EMPTY_CATALOG;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = await loadCatalog();
  return (
    <html lang="en" className={`${jakarta.variable} font-sans`}>
      <body>
        <Providers catalog={catalog}>{children}</Providers>
      </body>
    </html>
  );
}

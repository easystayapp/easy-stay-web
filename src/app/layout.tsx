import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { EMPTY_CATALOG } from "@/components/providers/catalog-provider";
import { Providers } from "@/components/providers/providers";
import type { Catalog } from "@/lib/domain/content";
import { getRepositories } from "@/lib/server/repositories";
import { getCatalog } from "@/lib/server/services/content";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  // Icons come from src/app/favicon.ico, icon.png and apple-icon.png (square, generated from the logo).
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/brand/logo-full.png", alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: DEFAULT_DESCRIPTION, images: ["/brand/logo-full.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
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
    <html lang="en-IN" className={`${jakarta.variable} font-sans`}>
      <body>
        <Providers catalog={catalog}>{children}</Providers>
      </body>
    </html>
  );
}

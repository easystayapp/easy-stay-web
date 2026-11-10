import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PGs, hostels, rooms & flats for rent",
  description: "Browse verified PGs, hostels, rooms and flats for rent. Filter by rent, sharing, gender, food and ratings, then contact owners directly — no brokerage.",
  // Filtered/sorted variants are the same content: point them all at one canonical page.
  alternates: { canonical: "/properties" },
};

export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage title="About EasyStay" intro="Find your stay. Connect directly.">
      <p>
        EasyStay helps people find PGs, hostels, rooms and flats, and talk to owners directly by call or WhatsApp — with no
        brokers in between.
      </p>
      <h2>For people looking for a place</h2>
      <p>Browse and filter freely without an account. Log in only when you want to contact an owner, save a place or rate it.</p>
      <h2>For owners</h2>
      <p>
        Turn on owner tools on your regular account by verifying your mobile number. Listings are free, stay live for 15 days and
        can be reposted in one tap.
      </p>
    </ProsePage>
  );
}

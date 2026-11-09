import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of use" intro="[Draft — have these reviewed by your legal advisor before launch.]">
      <h2>Listings</h2>
      <ul>
        <li>Owners must list only properties they own or are authorised to rent out.</li>
        <li>Listing details, photos and rent must be accurate and kept up to date.</li>
        <li>Listings are live for 15 days and can be reposted. EasyStay may remove listings that break these terms.</li>
      </ul>
      <h2>Contacting owners</h2>
      <ul>
        <li>Owner numbers are shown only to logged-in users and must be used only to enquire about the listing.</li>
        <li>EasyStay is not a party to any rental agreement between seekers and owners.</li>
      </ul>
      <h2>Ratings</h2>
      <ul>
        <li>Only people who contacted the owner through EasyStay can rate a property, once each.</li>
        <li>Ratings must be honest and based on your own experience. Owners cannot edit or delete ratings.</li>
      </ul>
    </ProsePage>
  );
}

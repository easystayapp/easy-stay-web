import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy policy" intro="[Draft — have this reviewed by your legal advisor before launch.]">
      <h2>What we collect</h2>
      <ul>
        <li>Your name, email (Google sign-in) and mobile number (OTP sign-in or owner verification).</li>
        <li>Listings you publish, places you save, owners you contact and ratings you give.</li>
        <li>A count of listing views, once per person or device per day. Who viewed a listing is never shown to owners.</li>
      </ul>
      <h2>What others see</h2>
      <ul>
        <li>Owner numbers are shown only to logged-in seekers who choose to call or WhatsApp.</li>
        <li>On ratings, only your first name is shown. Your number is never shown.</li>
      </ul>
    </ProsePage>
  );
}

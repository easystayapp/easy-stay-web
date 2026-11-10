import { ContentPage, contentMetadata } from "@/components/content/content-page";

/** Text lives in the database (pages/privacy); edits show up within a minute. */
export const revalidate = 60;

export const generateMetadata = () => contentMetadata("privacy");

export default function PrivacyPage() {
  return <ContentPage slug="privacy" />;
}

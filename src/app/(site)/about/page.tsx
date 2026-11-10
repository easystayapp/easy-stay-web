import { ContentPage, contentMetadata } from "@/components/content/content-page";

/** Text lives in the database (pages/about); edits show up within a minute. */
export const revalidate = 60;

export const generateMetadata = () => contentMetadata("about");

export default function AboutPage() {
  return <ContentPage slug="about" />;
}

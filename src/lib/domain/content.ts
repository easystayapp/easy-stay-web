/**
 * Reference data and editable content, stored in the database (not in code).
 * Enum codes, labels and business rules stay in `catalog.ts`/`types.ts`: they
 * are a contract with the Android app and the security rules.
 */
import type { Gender, PropertyType } from "./types";

/** A city the app serves. `name` is what listings store (same as the Android catalog). */
export interface City {
  /** Stable slug, e.g. "mumbai". */
  id: string;
  /** Canonical name stored on listings, e.g. "Mumbai Metropolitan Region (MMR)". */
  name: string;
  /** Short display name used across the web app and in URLs, e.g. "Mumbai". */
  label: string;
  state: string;
  /** Every locality offered when listing a property. */
  localities: string[];
  /** Shown as quick chips and first in suggestions. */
  popular: string[];
  order: number;
  active: boolean;
}

export interface BudgetPreset {
  label: string;
  minRent: number | null;
  maxRent: number | null;
}

/** Icon names the web maps to its icon set (unknown names fall back to a house). */
export const CATEGORY_ICONS = ["pg", "room", "flat", "female", "coliving", "food"] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** A home-page shortcut into search with preset filters. */
export interface Category {
  title: string;
  hint: string;
  icon: CategoryIcon;
  types: PropertyType[];
  genders: Gender[];
  food: boolean | null;
}

export interface Step {
  title: string;
  body: string;
}

/** Icon names the web maps to its icon set (unknown names fall back to a shield). */
export const HIGHLIGHT_ICONS = ["shield", "phone", "star", "calendar"] as const;
export type HighlightIcon = (typeof HIGHLIGHT_ICONS)[number];

/** A short promise shown in the strip under the hero. */
export interface Highlight {
  icon: HighlightIcon;
  title: string;
  body: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface HomeContent {
  budgets: BudgetPreset[];
  categories: Category[];
  steps: Step[];
  highlights: Highlight[];
  faqs: Faq[];
}

export type Audience = "seeker" | "owner";

export interface WelcomeRole {
  audience: Audience;
  title: string;
  body: string;
}

export interface WelcomeContent {
  roles: WelcomeRole[];
}

export interface AppConfig {
  defaultCityId: string;
  /** WhatsApp opening message per property type. `{noun}` → "PG" | "room" | "flat". */
  greetings: Record<PropertyType, string>;
}

/** A content page (help, about, terms, privacy). `**bold**` is supported in text. */
export interface PageSection {
  /** Optional anchor, e.g. "ratings" for /help#ratings. */
  anchor: string | null;
  heading: string | null;
  paragraphs: string[];
  items: string[];
}

export interface Page {
  slug: string;
  title: string;
  intro: string | null;
  sections: PageSection[];
}

/** Everything the UI needs on every page, loaded once and cached. */
export interface Catalog {
  cities: City[];
  defaultCity: string;
  home: HomeContent;
  welcome: WelcomeContent;
  greetings: Record<PropertyType, string>;
}

/* --------------------------------------------------------------- helpers */

export const cityByLabel = (cities: City[], label: string) => cities.find((c) => c.label === label) ?? null;

export const popularLocalities = (cities: City[], label: string) => cityByLabel(cities, label)?.popular ?? [];

const NOUN: Record<PropertyType, string> = { pg: "PG", room: "room", flat: "flat", hotel: "hotel room" };

export function greetingFor(greetings: Partial<Record<PropertyType, string>>, type: PropertyType): string {
  return (greetings[type] ?? "").replaceAll("{noun}", NOUN[type]);
}

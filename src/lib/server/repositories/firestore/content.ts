/**
 * Content collections (public read, server write — see firestore.rules):
 *
 *   cities/{id}        { name, label, state, localities[], popular[], order, active, updatedAt }
 *   config/app         { defaultCityId, greetings{PG_HOSTEL|ROOM|FLAT: text}, updatedAt }
 *   content/home       { budgets[], categories[{…, types[PG_HOSTEL…], genders[MALE…], food}], steps[], updatedAt }
 *   content/welcome    { roles[{ audience: "seeker"|"owner", title, body }], updatedAt }
 *   pages/{slug}       { title, intro, sections[{ anchor, heading, paragraphs[], items[] }], updatedAt }
 *
 * Enum values use the Android codes, so the mobile app can read the same documents.
 */
import type { Firestore } from "firebase-admin/firestore";
import type { AppConfig, Category, City, HomeContent, Page, WelcomeContent } from "@/lib/domain/content";
import { PROPERTY_TYPES, type Gender, type PropertyType } from "@/lib/domain/types";
import type { ContentDocs, ContentRepository } from "../types";
import { GENDER, TYPE, type Doc } from "./schema";

export const CONTENT_COLLECTIONS = { cities: "cities", config: "config", content: "content", pages: "pages" } as const;

const DOC_PATH: Record<keyof ContentDocs, [string, string]> = {
  app: [CONTENT_COLLECTIONS.config, "app"],
  home: [CONTENT_COLLECTIONS.content, "home"],
  welcome: [CONTENT_COLLECTIONS.content, "welcome"],
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const list = (v: unknown) => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Doc[]) : []);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function cityIn(id: string, d: Doc): City {
  return {
    id,
    name: str(d.name),
    label: str(d.label) || str(d.name),
    state: str(d.state),
    localities: strings(d.localities),
    popular: strings(d.popular),
    order: numOrNull(d.order) ?? 999,
    active: d.active !== false,
  };
}

function categoryIn(d: Doc): Category {
  return {
    title: str(d.title),
    hint: str(d.hint),
    icon: (str(d.icon) || "flat") as Category["icon"],
    types: strings(d.types).map((t) => TYPE.in(t)).filter((t): t is PropertyType => !!t),
    genders: strings(d.genders).map((g) => GENDER.in(g)).filter((g): g is Gender => !!g),
    food: typeof d.food === "boolean" ? d.food : null,
  };
}

const categoryOut = (c: Category): Doc => ({
  ...c,
  types: c.types.map((t) => TYPE.out(t)),
  genders: c.genders.map((g) => GENDER.out(g)),
});

const fromDoc = {
  app: (d: Doc): AppConfig => {
    const g = (d.greetings as Doc | undefined) ?? {};
    return {
      defaultCityId: str(d.defaultCityId),
      greetings: Object.fromEntries(PROPERTY_TYPES.map((t) => [t, str(g[TYPE.out(t)])])) as AppConfig["greetings"],
    };
  },
  home: (d: Doc): HomeContent => ({
    budgets: list(d.budgets).map((b) => ({ label: str(b.label), minRent: numOrNull(b.minRent), maxRent: numOrNull(b.maxRent) })),
    categories: list(d.categories).map(categoryIn),
    steps: list(d.steps).map((s) => ({ title: str(s.title), body: str(s.body) })),
  }),
  welcome: (d: Doc): WelcomeContent => ({
    roles: list(d.roles)
      .map((r) => ({ audience: r.audience === "owner" ? "owner" : "seeker", title: str(r.title), body: str(r.body) }) as const),
  }),
};

const toDoc = {
  app: (v: AppConfig): Doc => ({
    defaultCityId: v.defaultCityId,
    greetings: Object.fromEntries(PROPERTY_TYPES.map((t) => [TYPE.out(t), v.greetings[t]])),
  }),
  home: (v: HomeContent): Doc => ({ ...v, categories: v.categories.map(categoryOut) }),
  welcome: (v: WelcomeContent): Doc => ({ ...v }),
};

function pageIn(slug: string, d: Doc): Page {
  return {
    slug,
    title: str(d.title),
    intro: typeof d.intro === "string" && d.intro ? d.intro : null,
    sections: list(d.sections).map((s) => ({
      anchor: typeof s.anchor === "string" && s.anchor ? s.anchor : null,
      heading: typeof s.heading === "string" && s.heading ? s.heading : null,
      paragraphs: strings(s.paragraphs),
      items: strings(s.items),
    })),
  };
}

export function createFirestoreContent(fs: Firestore): ContentRepository {
  const now = () => Date.now();
  return {
    async listCities() {
      const snap = await fs.collection(CONTENT_COLLECTIONS.cities).get();
      return snap.docs.map((d) => cityIn(d.id, d.data())).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
    },
    async upsertCity(city) {
      const { id, ...rest } = city;
      await fs.collection(CONTENT_COLLECTIONS.cities).doc(id).set({ ...rest, updatedAt: now() });
    },
    async getDoc(key) {
      const [col, id] = DOC_PATH[key];
      const snap = await fs.collection(col).doc(id).get();
      return snap.exists ? (fromDoc[key](snap.data()!) as ContentDocs[typeof key]) : null;
    },
    async putDoc(key, value) {
      const [col, id] = DOC_PATH[key];
      const doc = (toDoc[key] as (v: ContentDocs[typeof key]) => Doc)(value);
      await fs.collection(col).doc(id).set({ ...doc, updatedAt: now() });
    },
    async getPage(slug) {
      const snap = await fs.collection(CONTENT_COLLECTIONS.pages).doc(slug).get();
      return snap.exists ? pageIn(slug, snap.data()!) : null;
    },
    async putPage(page) {
      const { slug, ...rest } = page;
      await fs.collection(CONTENT_COLLECTIONS.pages).doc(slug).set({ ...rest, updatedAt: now() });
    },
  };
}

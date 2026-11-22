/**
 * Free-text search understanding: "sector 43 noida", "sec-47 gurgaon", "bangalore koramangala".
 * Pure functions, shared by the server (to resolve a query) and the browser (to suggest areas).
 *
 * Cities in EasyStay are regions ("Delhi NCR"), and the same area name can exist in several places
 * inside one ("Sector 43" is in both Gurugram and Noida). So a mention like "noida" selects the city
 * and also becomes an {@link AreaFilter}: listings that say they're in a *different* part of the
 * region are dropped, and listings that say they're in the wanted part rank first.
 */

/** Short forms people type, expanded to the word listings use. */
const WORD_ALIASES: Record<string, string> = { sec: "sector", sect: "sector", sctr: "sector", blk: "block", ph: "phase" };

/**
 * Lowercase words for matching. Splits letters from digits ("sector43" → sector, 43; "12a" → 12, a)
 * and expands short forms ("sec" → sector), so queries and listing text compare the same way.
 */
export function tokenize(s: string): string[] {
  const out: string[] = [];
  for (const raw of s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(" ")) {
    if (!raw) continue;
    for (const part of raw.replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2").split(" ")) {
      if (part) out.push(WORD_ALIASES[part] ?? part);
    }
  }
  return out;
}

/** True for a whole-number word such as "43". Those must match exactly ("4" is not "43"). */
export const isNumberWord = (w: string) => /^\d+$/.test(w);

/** A word the user typed matches a listing word: numbers exactly, text as a prefix. */
export const wordMatches = (typed: string, listing: string) => (isNumberWord(typed) ? listing === typed : listing.startsWith(typed));

/* ---------------------------------------------------------------- areas */

export interface CityRef {
  label: string;
  name: string;
}

/** The part of a city the user asked for ("noida" inside Delhi NCR). */
export interface AreaFilter {
  /** Display name, e.g. "Noida". */
  name: string;
  /** Words that say a listing is in this part. */
  want: string[];
  /** Words that say it's in a different part of the same city. */
  others: string[];
}

/** Sub-areas of a city that share area names ("Sector 43"). Keyed by lowercase city label. */
const SUB_AREAS: Record<string, string[][]> = {
  // "delhi" is not listed: every listing's city field already says "Delhi NCR", so it can't tell parts apart.
  "delhi ncr": [["gurugram", "gurgaon"], ["noida", "greater noida"], ["ghaziabad"], ["faridabad"]],
};

/** Other names for a city. Sub-area names above are also treated as mentions of their city. */
const CITY_ALIASES: Record<string, string[]> = {
  bengaluru: ["bangalore", "blr"],
  mumbai: ["bombay"],
  chennai: ["madras"],
  pune: ["poona"],
  hyderabad: ["hyd", "secunderabad"],
  "delhi ncr": ["ncr", "delhi", "new delhi"],
};

/** Sub-areas from the database name when none are configured: "Delhi-NCR (Gurugram & Noida)". */
function groupsFor(c: CityRef): string[][] {
  const configured = SUB_AREAS[c.label.toLowerCase()];
  if (configured) return configured;
  const m = /\((.*)\)/.exec(c.name);
  if (!m) return [];
  return m[1]
    .split(/[&,/]|\band\b/i)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 3) // skips codes like "MMR"
    .map((s) => [s]);
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export interface ParsedQuery {
  /** City label the text names, or null when it names none. */
  city: string | null;
  /** The rest of the text once the city/area words are taken out: "sector 43". */
  text: string;
  /** The city/area words as typed, e.g. "noida". Empty when none. */
  mention: string;
  /** Set when the text names a part of the city, not just the city. */
  area: AreaFilter | null;
}

interface Phrase {
  tokens: string[];
  city: string;
  group: number; // index into the city's sub-areas, or -1 for the city itself
}

/** Finds a city (or part of one) named inside the text. The longest phrase wins. */
export function parseQuery(q: string, cities: CityRef[]): ParsedQuery {
  const tokens = tokenize(q);
  const none: ParsedQuery = { city: null, text: tokens.join(" "), mention: "", area: null };
  if (!tokens.length || !cities.length) return none;

  const phrases: Phrase[] = [];
  const groupsByCity = new Map<string, string[][]>();
  for (const c of cities) {
    const key = c.label.toLowerCase();
    const groups = groupsFor(c);
    groupsByCity.set(c.label, groups);
    phrases.push({ tokens: tokenize(c.label), city: c.label, group: -1 });
    for (const a of CITY_ALIASES[key] ?? []) phrases.push({ tokens: tokenize(a), city: c.label, group: -1 });
    groups.forEach((g, gi) => g.forEach((a) => phrases.push({ tokens: tokenize(a), city: c.label, group: gi })));
  }

  let best: { phrase: Phrase; at: number } | null = null;
  for (const phrase of phrases) {
    const n = phrase.tokens.length;
    if (!n) continue;
    for (let i = 0; i + n <= tokens.length; i++) {
      if (phrase.tokens.every((t, k) => tokens[i + k] === t) && (!best || n > best.phrase.tokens.length)) best = { phrase, at: i };
    }
  }
  if (!best) return none;

  const { phrase, at } = best;
  const rest = [...tokens.slice(0, at), ...tokens.slice(at + phrase.tokens.length)];
  const groups = groupsByCity.get(phrase.city) ?? [];
  // Only single-word names tell a listing's text apart ("greater noida" is covered by "noida";
  // its extra word "greater" must not count, and neither may "new" from "new delhi").
  const flat = (gs: string[][]) => [...new Set(gs.flatMap((g) => g.filter((a) => tokenize(a).length === 1).flatMap(tokenize)))];
  const area: AreaFilter | null =
    phrase.group >= 0
      ? {
          name: titleCase(groups[phrase.group][0]),
          want: flat([groups[phrase.group]]),
          others: flat(groups.filter((_, gi) => gi !== phrase.group)).filter((w) => !flat([groups[phrase.group]]).includes(w)),
        }
      : null;
  return { city: phrase.city, text: rest.join(" "), mention: phrase.tokens.join(" "), area };
}

/** How a listing's own text fits an area: 1 says it's there, -1 says it's elsewhere, 0 doesn't say. */
export function areaFit(words: string[], area: AreaFilter): 1 | 0 | -1 {
  if (area.want.some((w) => words.includes(w))) return 1;
  return area.others.some((w) => words.includes(w)) ? -1 : 0;
}

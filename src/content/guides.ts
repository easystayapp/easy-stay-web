/**
 * Long-form guides (/guides). Evergreen advice only: rents and counts are never
 * written here, they're pulled live from listings (see `liveCity`), so nothing
 * goes stale or overstates what's on EasyStay.
 */

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** Meta description and card summary (~150 characters). */
  description: string;
  /** ISO date of the last substantive edit. */
  updated: string;
  readMinutes: number;
  sections: GuideSection[];
  /** Show live rent/listing numbers for these areas of a city (landing-page slugs). */
  liveCity?: { city: string; areas: string[] };
}

export const GUIDES: Guide[] = [
  {
    slug: "how-to-check-a-pg-is-safe",
    title: "How to check a PG is safe before you move in",
    description:
      "A practical safety checklist for PGs and hostels: fire safety, entry and CCTV, the neighbourhood at night, and the paperwork to ask for before paying a deposit.",
    updated: "2026-11-11",
    readMinutes: 6,
    sections: [
      {
        heading: "Visit in person, and visit twice",
        paragraphs: [
          "Photos show a room at its best. Go and see it yourself, once during the day to check the room and once after dark to see the street, the lighting and who is around. Most of what matters for safety only shows up in person.",
          "Take a friend if you can, and tell someone where you're going. Never pay a token amount or deposit for a place you haven't seen.",
        ],
      },
      {
        heading: "Fire safety",
        bullets: [
          "Working fire extinguishers on every floor, with a recent refill or inspection date on the tag.",
          "A second way out: a staircase or exit that isn't blocked by storage, bikes or locked grilles.",
          "No tangle of extension boards and overloaded sockets in rooms or corridors.",
          "Smoke detectors, if the building has them, should have power and not be covered up.",
          "Ask the owner whether the building has a fire NOC from the local fire department. Larger PGs and hostels usually need one.",
        ],
      },
      {
        heading: "Entry, locks and CCTV",
        bullets: [
          "A main door that locks, with a clear rule about who gets a key and when the gate closes.",
          "A lock on your own room door, and a cupboard you can lock.",
          "CCTV covering the entrance and common areas. Ask who can see the footage and how long it's kept.",
          "A caretaker, warden or guard you can reach at night, with a phone number you've actually tested.",
          "For women-only PGs: check whether there's a female caretaker and what the visitor rules are.",
        ],
      },
      {
        heading: "The neighbourhood after dark",
        paragraphs: [
          "Walk the route you'll actually use, from the nearest metro, bus stop or main road to the gate. Is it lit? Are there shops open, people around, autos available late? A place that's ten minutes from the office but on a dark, empty lane may not be worth it.",
        ],
      },
      {
        heading: "Paperwork to ask for",
        bullets: [
          "A written rental or PG agreement that states the rent, deposit, notice period, and what's included (food, electricity, Wi-Fi, housekeeping).",
          "A receipt for every payment, including the deposit.",
          "Police verification for tenants, which many Indian cities ask owners to complete. A well-run PG will ask you for ID for this, so be wary of one that asks for nothing at all.",
          "The owner's or manager's name and number, not only a broker's.",
        ],
      },
      {
        heading: "Red flags",
        bullets: [
          "Pressure to pay a token amount immediately to \"hold\" the room.",
          "Requests to pay to a personal UPI ID that doesn't match the owner's name.",
          "Refusal to give a written agreement or receipt.",
          "Photos that don't match the place, or a listing that's been \"available\" for months.",
        ],
      },
      {
        heading: "How EasyStay helps",
        paragraphs: [
          "Listings on EasyStay show when they were last updated, ratings from people who actually contacted the owner, and the owner's own rating across their listings. Use the Women-First and rating filters to narrow your search, and report any listing that doesn't match what you find on a visit.",
        ],
      },
    ],
  },
  {
    slug: "questions-to-ask-a-pg-owner",
    title: "Questions to ask a PG owner before you pay a deposit",
    description:
      "What to ask about rent, deposit, food, electricity, notice period and house rules before you commit to a PG or hostel, so there are no surprises later.",
    updated: "2026-11-11",
    readMinutes: 5,
    sections: [
      {
        heading: "Money",
        bullets: [
          "What exactly does the monthly rent include? Food, electricity, Wi-Fi, laundry, housekeeping?",
          "How much is the deposit, and when and how is it returned? Is any of it kept as a \"maintenance\" charge?",
          "Is electricity included, a fixed amount, or billed by meter? If metered, how is a shared meter split?",
          "Is there a one-time admission, registration or maintenance fee?",
          "When is rent due, and is there a late fee?",
        ],
      },
      {
        heading: "Notice and leaving",
        bullets: [
          "What is the notice period, and is it the same for you and for the owner?",
          "If you leave mid-month, is rent charged for the full month?",
          "What deductions can be made from the deposit at move-out?",
        ],
      },
      {
        heading: "Food",
        bullets: [
          "How many meals a day, and on which days? Many PGs skip a meal on Sundays.",
          "Veg only, or non-veg too? Can you see a week's menu?",
          "Can you opt out of food for a lower rent?",
        ],
      },
      {
        heading: "House rules",
        bullets: [
          "Is there a gate closing time? What happens if you come back late from a night shift?",
          "Are visitors allowed in rooms, or only in common areas?",
          "Rules on cooking, guests staying over, smoking and alcohol.",
          "Who else shares your room, and how is a new roommate chosen?",
        ],
      },
      {
        heading: "Day-to-day",
        bullets: [
          "How fast is the Wi-Fi, and is there a power backup for it?",
          "Is there hot water at the times you need it?",
          "How often are rooms and bathrooms cleaned?",
          "Who do you call when something breaks, and how quickly is it fixed?",
        ],
      },
      {
        heading: "Get it in writing",
        paragraphs: [
          "Once you're happy with the answers, ask for them in a written agreement and keep receipts for every payment. A good owner won't mind, and it protects both of you if there's a disagreement later.",
        ],
      },
    ],
  },
  {
    slug: "pg-vs-flat-vs-room",
    title: "PG, shared flat or single room: which should you rent?",
    description:
      "The real differences between a PG or hostel, a shared flat and a single room or 1RK: cost, food, privacy, flexibility and paperwork, to help you choose.",
    updated: "2026-11-11",
    readMinutes: 5,
    sections: [
      {
        heading: "PG or hostel",
        paragraphs: [
          "A PG (paying guest) or hostel rents you a bed or a room, usually with food, housekeeping, Wi-Fi and electricity bundled in. It's the quickest way to move to a new city: small deposit, short notice period, and nothing to set up.",
        ],
        bullets: [
          "Best for: first jobs, internships, students, and anyone new to the city.",
          "Watch out for: house rules like gate timings, limited privacy in shared rooms, and fixed meal times.",
        ],
      },
      {
        heading: "Shared flat",
        paragraphs: [
          "You rent a room, or share one, in a flat with other tenants and split the rent and bills. You get a kitchen and more freedom, but you also share the work: groceries, cooking, bills, a maid, and finding a replacement when a flatmate leaves.",
        ],
        bullets: [
          "Best for: people who've been in the city a while and want more independence.",
          "Watch out for: larger deposits (often several months' rent), a lease in one person's name, and the furnishing you'll need to buy.",
        ],
      },
      {
        heading: "Single room or 1RK",
        paragraphs: [
          "A room or 1RK (one room plus kitchen) of your own gives full privacy without the cost of a whole flat. You manage your own food and bills.",
        ],
        bullets: [
          "Best for: people who want privacy and quiet, or who work odd hours.",
          "Watch out for: older buildings, and owners who live on site with their own rules.",
        ],
      },
      {
        heading: "How to decide",
        bullets: [
          "Moving for a new job or course and want to start immediately? Start with a PG, and move once you know the city.",
          "Cooking matters to you, or you'll be staying a year or more? A shared flat usually works out better.",
          "Privacy above everything? A single room or 1RK.",
          "Compare the total monthly cost, not just rent: add food, electricity, Wi-Fi, maid and travel to work.",
        ],
      },
      {
        heading: "Search all three on EasyStay",
        paragraphs: [
          "Filter by PG, room or flat, by sharing (single to six-sharing, 1RK to 4BHK), by food and by who it's for. Every listing shows the rent and what's included, and you contact the owner directly with no brokerage.",
        ],
      },
    ],
  },
  {
    slug: "pg-in-hyderabad-it-corridor",
    title: "Finding a PG in Hyderabad's IT corridor",
    description:
      "Gachibowli, Madhapur, HITEC City, Kondapur and Kukatpally compared for PG and hostel hunters: commute, metro access and what each area is like to live in.",
    updated: "2026-11-11",
    readMinutes: 6,
    liveCity: { city: "hyderabad", areas: ["gachibowli", "madhapur", "hitec-city", "kondapur", "kukatpally"] },
    sections: [
      {
        heading: "Start with your commute",
        paragraphs: [
          "Hyderabad's IT offices cluster in the west of the city: HITEC City, Madhapur, Gachibowli and the Financial District. Traffic on the main roads at peak hours can turn a short distance into a long ride, so the best area is usually the one closest to your office, or with a direct metro or shuttle route to it.",
          "Map your office first, then shortlist areas within a short auto ride or a direct metro line.",
        ],
      },
      {
        heading: "Madhapur and HITEC City",
        paragraphs: [
          "The heart of the IT corridor, around Cyber Towers and the tech parks. Many offices are within walking distance or a short auto ride, and the Hyderabad Metro's Blue Line runs through HITEC City towards Raidurg. Lots of PGs, food options and late-night activity, but busy roads and higher demand.",
        ],
      },
      {
        heading: "Gachibowli and the Financial District",
        paragraphs: [
          "Further west, close to the Financial District, large office campuses and educational institutions. Newer buildings, wider roads, and plenty of PGs near the main office clusters. Check how you'll get home late at night, as some stretches are quieter.",
        ],
      },
      {
        heading: "Kondapur",
        paragraphs: [
          "A largely residential area between HITEC City and Gachibowli. A good balance of a short commute and a calmer place to live, with many PGs and shared flats in residential lanes.",
        ],
      },
      {
        heading: "Kukatpally and KPHB",
        paragraphs: [
          "Further north, on the Metro's Red Line. Generally more residential with a big local market, and a popular choice if you're happy to take the metro or a cab to the IT corridor in exchange for more space or lower rents.",
        ],
      },
      {
        heading: "Before you choose",
        bullets: [
          "Do the commute once at the time you'd actually travel, not on a quiet Sunday.",
          "Walk from the metro or main road to the PG after dark.",
          "Ask whether your company runs shuttles, and from where.",
          "Read our checklist on checking a PG is safe before you pay anything.",
        ],
      },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;

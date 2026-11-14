/**
 * Initial reference data and content: the values that used to be hardcoded
 * in the web app, plus the Android app's city/locality catalog
 * (easy-stay-mobile-app/app/src/main/assets/cities.json).
 *
 * Used only to populate a database (`npm run seed:content`) and the
 * in-memory backend. The running app reads everything from the database.
 */
import type { AppConfig, City, HomeContent, Page, WelcomeContent } from "@/lib/domain/content";

export const SEED_CITIES: City[] = [
  {
    id: "hyderabad",
    name: "Hyderabad",
    label: "Hyderabad",
    state: "Telangana",
    order: 1,
    active: true,
    popular: ["Madhapur", "Gachibowli", "Kondapur", "Kukatpally", "Hitech City"],
    localities: ["Madhapur", "Kavuri Hills", "HITEC City", "Ayyappa Society", "Jubilee Hills Checkpost Area", "Kondapur", "Gachibowli (Telecom Nagar, Jayabheri Pine Valley)", "Whitefields", "Kothaguda", "Hafeezpet", "Nanakramguda", "Puppalguda", "Khajaguda", "Kokapet", "Tellapur", "Manikonda", "Shaikpet", "Kukatpally (KPHB Colony)", "Miyapur", "Nizampet"],
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    label: "Bengaluru",
    state: "Karnataka",
    order: 2,
    active: true,
    popular: ["Koramangala", "HSR Layout", "Whitefield", "Marathahalli", "BTM Layout"],
    localities: ["Bellandur", "Marathahalli", "Kadubeesanahalli", "Devarabisanahalli", "Panathur", "HSR Layout (Sectors 1-7)", "Koramangala (Blocks 1-8)", "BTM Layout", "Sarjapur Road", "Haralur Road", "Kasavanahalli", "Whitefield (EPIP Zone, ITPL Road, Pattandur Agrahara)", "Brookefield", "Kundalahalli", "Mahadevapura", "Hoodi", "Electronic City Phase 1", "Electronic City Phase 2", "Singasandra", "Begur", "Bommanahalli", "Hebbal", "Nagavara", "Thanisandra", "Hennur", "Sahakarnagar"],
  },
  {
    id: "pune",
    name: "Pune",
    label: "Pune",
    state: "Maharashtra",
    order: 3,
    active: true,
    popular: ["Hinjewadi", "Kharadi", "Viman Nagar", "Baner", "Wakad"],
    localities: ["Hinjawadi (Phase 1, 2, 3)", "Wakad", "Pimple Saudagar", "Baner", "Balewadi", "Mahalunge", "Punawale", "Ravet", "Kharadi", "Viman Nagar", "Magarpatta City", "Kalyani Nagar", "Hadapsar", "Wadgaon Sheri", "Keshav Nagar", "Aundh", "Kothrud", "Senapati Bapat (SB) Road"],
  },
  {
    id: "chennai",
    name: "Chennai",
    label: "Chennai",
    state: "Tamil Nadu",
    order: 4,
    active: true,
    popular: ["OMR", "Velachery", "T. Nagar", "Guindy", "Porur"],
    localities: ["Thoraipakkam", "Perungudi", "Kandanchavadi", "Thiruvanmiyur", "Taramani", "Sholinganallur", "Navalur", "Siruseri", "Semmancheri", "Kelambakkam", "Velachery", "Medavakkam", "Guindy", "Pallikaranai", "Madipakkam", "Porur", "Manapakkam", "Ramapuram", "Iyyappanthangal"],
  },
  {
    id: "mumbai",
    name: "Mumbai Metropolitan Region (MMR)",
    label: "Mumbai",
    state: "Maharashtra",
    order: 5,
    active: true,
    popular: ["Andheri", "Powai", "Bandra", "Thane", "Malad"],
    localities: ["Goregaon East", "Goregaon West", "Malad West (Mindspace)", "Andheri East (MIDC, SEEPZ, Chakala)", "Powai (Hiranandani Gardens)", "Kanjurmarg West", "Vikhroli West", "Chandivali", "Airoli (Mindspace)", "Ghansoli (Reliance Corporate Park)", "Mahape (Millennium Business Park)", "Vashi", "Belapur", "Majiwada", "Ghodbunder Road", "Vartak Nagar", "Wagle Estate"],
  },
  {
    id: "delhi-ncr",
    name: "Delhi-NCR (Gurugram & Noida)",
    label: "Delhi NCR",
    state: "Haryana & Uttar Pradesh",
    order: 6,
    active: true,
    popular: ["Gurugram", "Noida", "Laxmi Nagar", "Saket", "Dwarka"],
    localities: ["DLF Phase 1", "DLF Phase 2", "DLF Phase 3 (U-Block)", "DLF Phase 4", "DLF Phase 5", "Sector 42", "Sector 43", "Sector 54", "Sector 55", "Sector 56", "Sector 47", "Sector 48", "Sector 49", "Sushant Lok 1 & 2", "Sector 62", "Sector 63", "Sector 59", "Sector 70", "Sector 71", "Sector 72", "Sector 74", "Sector 75", "Sector 93", "Sector 128", "Sector 134", "Sector 137", "Sector 142", "Sector 143", "Sector 144"],
  },
];

export const SEED_APP_CONFIG: AppConfig = {
  defaultCityId: "hyderabad",
  greetings: {
    pg: "Hi, I found your property on EasyStay.\nI am interested in this {noun}.\nIs it currently available?",
    room: "Hi, I found your property on EasyStay.\nI am interested in this {noun}.\nIs it currently available?",
    flat: "Hi, I found your property on EasyStay.\nI am interested in this {noun}.\nIs it currently available?",
    hotel: "Hi, I found your property on EasyStay.\nI am interested in this {noun}.\nIs it currently available?",
  },
};

export const SEED_HOME: HomeContent = {
  budgets: [
    { label: "Any budget", minRent: null, maxRent: null },
    { label: "Under ₹5k", minRent: null, maxRent: 5000 },
    { label: "₹5k – ₹10k", minRent: 5000, maxRent: 10000 },
    { label: "₹10k – ₹20k", minRent: 10000, maxRent: 20000 },
    { label: "₹20k+", minRent: 20000, maxRent: null },
  ],
  categories: [
    { title: "PG / Hostel", hint: "1–6 sharing, meals", icon: "pg", types: ["pg"], genders: [], food: null },
    { title: "Room", hint: "Single room · 1 RK", icon: "room", types: ["room"], genders: [], food: null },
    { title: "Flat", hint: "1–4 BHK", icon: "flat", types: ["flat"], genders: [], food: null },
    { title: "Girls PG", hint: "Female only", icon: "female", types: ["pg"], genders: ["female"], food: null },
    { title: "Co-living", hint: "Open to anyone", icon: "coliving", types: [], genders: ["anyone"], food: null },
    { title: "With food", hint: "Meals included", icon: "food", types: [], genders: [], food: true },
  ],
  highlights: [
    { icon: "shield", title: "No brokers", body: "Deal straight with the owner. No commission, no middlemen." },
    { icon: "phone", title: "Call or WhatsApp", body: "Contact owners directly the moment you find a place you like." },
    { icon: "star", title: "Honest ratings", body: "Only people who contacted the owner can rate, so reviews are real." },
    { icon: "calendar", title: "Fresh listings", body: "Every listing is live for just 15 days, so what you see is available." },
  ],
  faqs: [
    { question: "Do I need an account to browse?", answer: "No. Search, filters and listing details are open to everyone. Log in with Google only to contact an owner, save a place or rate it." },
    { question: "Does EasyStay charge brokerage?", answer: "No. You speak to the owner directly by call or WhatsApp, and EasyStay never takes a commission." },
    { question: "How do I know a place is still available?", answer: "Listings stay live for 15 days and then drop off unless the owner reposts them. Contact the owner to confirm before you visit." },
    { question: "How do ratings work?", answer: "The combined rating averages Property, Owner, Environment, Value and Food. Only people who contacted the owner through EasyStay can rate, and a place shows “New” until it has 3 ratings." },
    { question: "I own a PG or flat. How do I list it?", answer: "Tap List property, sign in with Google and add the number seekers should call. Listing is free and takes about 2 minutes." },
  ],
  steps: [
    { title: "Browse freely", body: "Search, filter and open any listing without an account. Only available places are shown." },
    { title: "Log in to connect", body: "One tap with Google — and you're right back on the property you picked." },
    { title: "Call or WhatsApp", body: "Talk to the owner directly, arrange a visit, and rate the place afterwards." },
  ],
};

export const SEED_WELCOME: WelcomeContent = {
  roles: [
    { audience: "seeker", title: "I'm looking for a property", body: "Find a PG, hostel, room or flat." },
    { audience: "owner", title: "I'm a property owner", body: "List my PG, hostel, room or flat — and still browse." },
  ],
};

const section = (heading: string | null, opts: { paragraphs?: string[]; items?: string[]; anchor?: string } = {}) => ({
  anchor: opts.anchor ?? null,
  heading,
  paragraphs: opts.paragraphs ?? [],
  items: opts.items ?? [],
});

export const SEED_PAGES: Page[] = [
  {
    slug: "help",
    title: "Help & support",
    intro: null,
    sections: [
      section("Do I need an account to browse?", {
        paragraphs: ["No. Search, filters and listing details are open to everyone. Log in only to contact an owner, save or rate."],
      }),
      section("How do I list my property?", {
        paragraphs: [
          "Go to **List your property**, sign in with Google and add your contact number to turn on owner tools. Then add your property — type, sharing, rent, location, 3–5 photos and who it's available for.",
        ],
      }),
      section("How long does a listing stay live?", {
        paragraphs: ["15 days. We remind you 3 days and 1 day before it ends, and you can repost it in one tap — views and ratings are kept."],
      }),
      section("How do ratings work?", {
        anchor: "ratings",
        paragraphs: [
          "The combined rating is the average of Property, Owner, Environment, Value for money and Food (only where meals are served). Only people who contacted the owner through EasyStay can rate, once each, and can edit their rating anytime. A property shows “New” until it has 3 ratings.",
        ],
      }),
    ],
  },
  {
    slug: "about",
    title: "About EasyStay",
    intro: "Find your stay. Connect directly.",
    sections: [
      section(null, {
        paragraphs: ["EasyStay helps people find PGs, hostels, rooms and flats, and talk to owners directly by call or WhatsApp — with no brokers in between."],
      }),
      section("For people looking for a place", {
        paragraphs: ["Browse and filter freely without an account. Log in only when you want to contact an owner, save a place or rate it."],
      }),
      section("For owners", {
        paragraphs: [
          "Turn on owner tools on your regular account by adding the mobile number seekers should call. Listings are free, stay live for 15 days and can be reposted in one tap.",
        ],
      }),
    ],
  },
  {
    slug: "terms",
    title: "Terms of use",
    intro: "[Draft — have these reviewed by your legal advisor before launch.]",
    sections: [
      section("Listings", {
        items: [
          "Owners must list only properties they own or are authorised to rent out.",
          "Listing details, photos and rent must be accurate and kept up to date.",
          "Listings are live for 15 days and can be reposted. EasyStay may remove listings that break these terms.",
        ],
      }),
      section("Contacting owners", {
        items: [
          "Owner numbers are shown only to logged-in users and must be used only to enquire about the listing.",
          "EasyStay is not a party to any rental agreement between seekers and owners.",
        ],
      }),
      section("Ratings", {
        items: [
          "Only people who contacted the owner through EasyStay can rate a property, once each.",
          "Ratings must be honest and based on your own experience. Owners cannot edit or delete ratings.",
        ],
      }),
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    intro: "[Draft — have this reviewed by your legal advisor before launch.]",
    sections: [
      section("What we collect", {
        items: [
          "Your name and email (Google sign-in), and the contact number you add as an owner.",
          "Listings you publish, places you save, owners you contact and ratings you give.",
          "A count of listing views, once per person or device per day. Who viewed a listing is never shown to owners.",
        ],
      }),
      section("What others see", {
        items: [
          "Owner numbers are shown only to logged-in seekers who choose to call or WhatsApp.",
          "On ratings, only your first name is shown. Your number is never shown.",
        ],
      }),
    ],
  },
];

# EasyStay

Find your stay. Connect directly. Seekers browse PGs, hostels, rooms and flats without an account, then log in with Google to call or WhatsApp the owner. Owners turn on **owner tools** on the same account (by adding the mobile number seekers should call) to list properties for 15 days at a time.

Built from the **EasyStay App Design** canvas (brand & UI kit, 24 mobile screens, 7 web pages).

| | |
|---|---|
| Framework | Next.js 16 (App Router, `src/` layout), React 19, TypeScript 6 |
| UI | Tailwind CSS 4 + shadcn/ui (Radix), Plus Jakarta Sans, lucide icons |
| Auth | Firebase Auth — Google sign-in |
| Data | Cloud Firestore through a repository layer (swappable) |
| Media | Cloudflare R2 (S3 API, direct browser uploads via presigned URLs) |

## Quick start (local, no cloud accounts)

```bash
npm install
cp .env.example .env.local          # or use the emulator values below
npx firebase-tools emulators:start --only auth,firestore --project demo-easystay
npm run seed                        # 9 demo listings in Hyderabad, with photos
npm run dev
```

Emulator values for `.env.local`:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-easystay.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-easystay
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
FIREBASE_PROJECT_ID=demo-easystay
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
STORAGE_BACKEND=memory              # until R2 is configured
```

The Auth emulator's sign-in popup lets you create test Google accounts.

Demo listings use bundled CC0 photos from Wikimedia Commons (`public/demo/photos`, sources in `CREDITS.txt`). Re-running `npm run seed` adds them to existing demo listings that have none.

No Firebase at all? `DATA_BACKEND=memory` serves seeded demo data from memory (browsing works; logging in still needs Firebase Auth).

## Scripts

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint 9 (flat config) / `tsc --noEmit` |
| `npm run seed` | Demo listings through the repository layer (emulators only unless `--live`; `--force` to add again) |
| `npm run seed:content` | Cities, home/welcome content, greetings and pages (creates missing; `--dry-run`, `--overwrite`) |
| `npm run emulators` | Firebase Auth + Firestore emulators |
| `npm run check:firebase` | Verifies the live Firebase setup: config, API key, sign-in providers, service account, Firestore read/write |
| `npm run deploy:firestore` | Deploys `firestore.rules` and `firestore.indexes.json` to the project in `.env.local` |
| `npm run check:r2` | Verifies Cloudflare R2: presigned upload, public URL, stat, delete, CORS |

## Production setup

### Firebase (Auth + Firestore)

1. Create a Firebase project. **Authentication → Sign-in method**: enable **Google**. Add your domains under *Authorized domains*.
2. Create a Firestore database (Native mode).
3. **Project settings → Service accounts → Generate new private key**. Save the JSON as `service-account.json` in the project folder (git-ignored) and set `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` — or put `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` (keep the `\n` escapes) in the env. Put the web app config in the `NEXT_PUBLIC_FIREBASE_*` vars.
4. `npm run deploy:firestore` deploys the rules and the composite indexes search needs (indexes take a few minutes to build). The rules deny all direct client access — every read and write goes through the API.
5. `npm run check:firebase` should print “Firebase is configured correctly.”

The `.env.local` template walks through every value. To go back to the emulators: `cp .env.emulators.local .env.local`.

### Cloudflare R2 (photos and media)

1. Create a bucket, e.g. `easystay-media`.
2. Make it publicly readable: connect a **custom domain** (recommended, e.g. `media.easystay.in`) or enable the `r2.dev` URL. Set `R2_PUBLIC_URL` to that base URL.
3. **Manage R2 API tokens** → create a token with *Object Read & Write* on the bucket → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Set `R2_ACCOUNT_ID` and `R2_BUCKET`.
4. Bucket **Settings → CORS policy** (browsers upload straight to R2):

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "http://localhost:3002", "https://your-domain.com"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type", "cache-control"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. `npm run check:r2` should print “Cloudflare R2 is configured correctly.”

## Deploying

Any Node 20.9+ host works (`npm run build`, then `npm start`). Set the same variables as `.env.local` on the host. Where there is no key file, send `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` (keep the `\n` escapes) instead of `GOOGLE_APPLICATION_CREDENTIALS`. Run the server close to the database (Firestore is in `asia-south1`).

After the first deploy, allow the production domain everywhere it's checked:
- Firebase → Authentication → Settings → Authorized domains: add your domain.
- R2 bucket CORS: add `https://your-domain` to `AllowedOrigins`.
- Google Cloud → OAuth consent screen: app name, support email, then **Publish**.
- Verify with `CHECK_ORIGINS=https://your-domain npm run check:r2`, then sign in, turn on owner tools and add a listing with photos.

Before real users: give R2 a custom domain (r2.dev is rate-limited), use an R2 token scoped to the one bucket, and rotate any key that has been shared.

## Project structure

```
src/
  app/
    (site)/            pages with the shared header, footer and phone bottom nav
    api/               route handlers — thin wrappers over services
    login/ welcome/    full-screen pages
  components/
    ui/                shadcn/ui components (themed) + app primitives
    auth/ layout/ owner/ property/ search/ providers/ content/
  hooks/               useAuth, useCity, useSaved, useToast, useListingActions
  lib/
    domain/            entities, catalogs and business rules — no I/O
    server/
      repositories/    storage ports (types.ts) + adapters: firestore/, memory/, r2/
      services/        use cases: properties, engagement, users, media
      auth.ts http.ts  bearer-token verification, route wrapper
    client/            browser: Firebase Auth init, typed API client, prefs
  types/api.ts         JSON contract between API and UI
scripts/               seed, check-r2
```

### Screens → routes

| Design | Route |
|---|---|
| 01 Welcome | `/welcome` (first visit on phones) |
| 02 Home · W1 | `/` |
| 03 Search | `/search` |
| 04 Filters · 05 Results · W2 | `/properties` (sidebar on desktop, sheet on phones) |
| 06 Details + ratings · W3 | `/properties/[id]` |
| 07 Login · W4 | Google login sheet over the current page; `/login?next=` |
| 09 Back on property · WhatsApp | contact sheet on `/properties/[id]` |
| 10 / 23 Profile · W7 | `/profile`, `/profile/owner-settings`, `/profile/ratings` |
| 11 Saved | `/saved` |
| 11b Rate property | `/properties/[id]/rate` |
| 12 Owner sign-in · 13 Contact number | `/owner`, `/owner/setup` |
| 14 My listings · W5 | `/my-listings` (with 20 Mark rented and 22 Repost dialogs) |
| 15 Add · 16 Preview · W6 | `/my-listings/new` |
| 17 Published | `/my-listings/[id]/published` |
| 18 Statistics | `/my-listings/[id]/stats` |
| 19 Edit | `/my-listings/[id]/edit` |
| 21 Expiry reminders | `/notifications` |

## Data model

The database is **shared with the EasyStay Android app** (`easystayapp/easy-stay-mobile-app`, branch `develop`). Both apps read and write the same documents, so the web adapter speaks the Android format; the mapping lives in `src/lib/server/repositories/firestore/schema.ts`. Enum values are upper-case (`PG_HOSTEL`, `SHARING_2`, `BHK_1`, `ACTIVE`…), times are epoch milliseconds and phone numbers are stored as `+91 98765 43210`.

| Collection | Id | Holds |
|---|---|---|
| `properties` | auto | listing (`name`, `type`, `size`, `rent`, `city`, `locality`, `houseNumber`, `photoUrls`, `status`, `publishedAt`/`expiresAt`…) + `totalViews`, `periodViews`, `dailyViews{yyyyMMdd UTC}` |
| `properties/{id}/private/contact` | `contact` | `phone`, `whatsapp`, `ownerId` — signed-in users only |
| `reviews` | `r_{propertyId}_{uid}` | `relation`, `scores{PROPERTY…FOOD}`, `text` — one per person |
| `users` | auth uid | `name`, `email`, `phone`, `ownerSettings{…}` (present = owner tools on), `saved[]`, `contacted[]`, `fcmTokens[]` |
| `cities` | slug (`mumbai`) | `name` (stored on listings, = Android catalog), `label` (web/URLs), `state`, `localities[]`, `popular[]`, `order`, `active` |
| `config/app` | `app` | `defaultCityId`, `greetings{PG_HOSTEL, ROOM, FLAT}` (`{noun}` placeholder) |
| `content/home`, `content/welcome` | — | home budgets, categories (Android enum codes), "How it works" steps; welcome cards per audience |
| `pages` | slug (`help`, `about`, `terms`, `privacy`) | `title`, `intro`, `sections[{anchor, heading, paragraphs[], items[]}]` (`**bold**` supported) |
| `listingDrafts` | auto | web-only: unpublished listings (Android has no drafts and would show them) |
| `propertyViews` | `{propertyId}_{viewer}_{day}` | web-only: one counted view per person per day |

- **Rules** (`firestore.rules`) are the Android app's; keep both copies identical. The web server uses the Admin SDK, which the rules don't restrict. `npm run deploy:firestore -- --rules` deploys only the rules.
- **Listings** are live 15 days. The Android Worker's daily cron marks expired ones `EXPIRED` and sends reminders; the web also derives `expired` from `expiresAt`.
- **Ratings**: aggregates are computed from `reviews` on read, since both apps write them. Only users whose `contacted[]` includes the listing can rate.
- **Contact numbers** live in `private/contact` and are only returned to a logged-in seeker, which adds the listing to their `contacted[]`.
- **Photos**: uploaded to `properties/{ownerId}/…` in the shared R2 bucket (the Worker uses the same folder). The server checks each new key exists, is an image under 5 MB, and builds the public URL from the key.
- **Content is data, not code.** Cities, localities, home sections, welcome cards, greetings and the help/about/terms/privacy pages are read from the collections above (cached ~1 minute; pages revalidate every minute). Edit them in the Firebase console. `npm run seed:content` creates any that are missing (`--dry-run`, `--overwrite`); its source is `src/lib/server/seed/content.ts`. Enum codes, labels and business rules (15-day listings, 3–5 photos, "New" until 3 ratings) stay in code: the Android app and its Worker hardcode the same values.
- `npm run seed` only runs against the emulators unless you pass `--live`.

## Transactional layer (enquiries, chat, verification, moderation, privacy)

Server-only collections (clients are denied by the rules; the API uses the Admin SDK). Times are epoch ms. Code: `src/lib/domain/ops.ts` (model + rules), `src/lib/server/services/ops/` (use cases), `src/app/api/{enquiries,reports,notifications,admin,me/*}` (routes).

| Collection | Id | Design |
|---|---|---|
| `enquiries` | `{propertyId}_{seekerId}` | one thread per seeker and listing, so creating one is idempotent. Holds the visit slot and denormalised inbox fields (title, thumbnail, last message, unread counters): an inbox is **one indexed query**, with no joins |
| `enquiries/{id}/messages` | `{time}_{seq}_{rand}` | append-only, paged by time. A send is one set plus one atomic increment merge (no read-modify-write) |
| `userMeta` | uid | ban flag, consents, KYC state, admin flag (kept apart from `users`, which Android shares) |
| `verifications` | `{subjectId}_{kind}` | KYC / NOC / photo submissions; the admin queue is `status == pending order by submittedAt` |
| `propertySafety` | propertyId | published health score, NOC expiry, hidden flag. Lists read it with one batched get, and the Android-shared `properties` doc is untouched |
| `cases` | `{target}_{reporter}` for reports | reports, grievances (24 h acknowledge / 15 d resolve) and 36 h takedowns, with SLA deadlines stored on the doc |
| `auditLog`, `notifications` | generated | audit entries carry before/after values; notifications are in-app plus FCM push |

KYC / NOC verification is optional: it never blocks listing or enquiring; approved items only add badges. Email verification before enquiring or listing is off unless `REQUIRE_EMAIL_VERIFICATION=1`.

Setup: `npm run deploy:firestore` (new composite indexes); KYC/NOC files go to the `owners-kyc-docs/{uid}/` folder of the same R2 bucket (admins get 5-minute signed URLs). **Block that folder on the public domain**: Cloudflare → Security → WAF → custom rule, `URI Path starts with /owners-kyc-docs/` → Block, and don't use the `r2.dev` URL in production, since it can't be restricted; grant admin with a custom claim (`getAuth().setCustomUserClaims(uid, { admin: true })`) or `userMeta/{uid}.admin = true`.

## Admin console (admin.easystay.in)

Same codebase and deployment, separate site. `src/proxy.ts` serves `src/app/admin-site/` only on hosts starting with `admin.`, at clean URLs (`/login`, `/cases`…), and only the `/api/admin/*` API there. Other hosts get 404 for both. Because Firebase Auth state is per-origin, the admin sign-in is independent from the public site's.

- Sign-in: email + password, session ends when the tab closes. The API additionally requires the `admin` claim, a verified email and a sign-in within the last 12 hours.
- Pages: dashboard, verification queue (private-file viewer), reports/grievances/takedowns with SLA timers, listing health score and hide/restore, user ban, audit log.
- Setup: (1) point `admin.easystay.in` at the same deployment as the main site (add the domain on your host and create its DNS record); (2) Firebase → Authentication → enable **Email/Password** and add `admin.easystay.in` to Authorized domains; (3) `npm run admin:create -- you@easystay.in '<password>'`.
- Local: open `http://admin.localhost:3000` (Chrome resolves `*.localhost`).

## Switching the database

Services depend only on the interfaces in `src/lib/server/repositories/types.ts`. To move from Firestore to, say, Postgres:

1. Create `src/lib/server/repositories/postgres/` implementing `Repositories` (users, properties, ratings, contacts, saved, views). Use `src/lib/server/repositories/memory/index.ts` as the reference — it is the same contract in ~200 lines.
2. Honour the atomicity notes in `types.ts` (e.g. `views.recordUnique` → `INSERT … ON CONFLICT DO NOTHING` plus counter updates in one transaction).
3. `findCandidates` may push filters into SQL; services always re-apply `matchesFilters`, so returning a superset is safe.
4. Register it in `src/lib/server/repositories/index.ts` and set `DATA_BACKEND=postgres`. `npm run seed` works unchanged.

Auth is independent (`src/lib/server/auth.ts`), and so is media (`FileStorage` — R2 today, S3/GCS by adding an adapter).

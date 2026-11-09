# EasyStay

Find your stay. Connect directly. Seekers browse PGs, hostels, rooms and flats without an account, then log in to call or WhatsApp the owner. Owners turn on **owner tools** on the same account (by verifying a mobile number) to list properties for 15 days at a time.

Built from the **EasyStay App Design** canvas (brand & UI kit, 24 mobile screens, 7 web pages).

| | |
|---|---|
| Framework | Next.js 16 (App Router, `src/` layout), React 19, TypeScript 6 |
| UI | Tailwind CSS 4 + shadcn/ui (Radix), Plus Jakarta Sans, lucide icons |
| Auth | Firebase Auth — Google and phone OTP |
| Data | Cloud Firestore through a repository layer (swappable) |
| Media | Cloudflare R2 (S3 API, direct browser uploads via presigned URLs) |

## Quick start (local, no cloud accounts)

```bash
npm install
cp .env.example .env.local          # or use the emulator values below
npx firebase-tools emulators:start --only auth,firestore --project demo-easystay
npm run seed                        # 9 demo listings in Hyderabad
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

Phone OTP codes from the Auth emulator are shown in its UI (http://127.0.0.1:4000/auth) or at
`/emulator/v1/projects/demo-easystay/verificationCodes`.

No Firebase at all? `DATA_BACKEND=memory` serves seeded demo data from memory (browsing works; logging in still needs Firebase Auth).

## Scripts

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint 9 (flat config) / `tsc --noEmit` |
| `npm run seed` | Demo data through the repository layer (`--force` to add again) |
| `npm run emulators` | Firebase Auth + Firestore emulators |
| `npm run check:r2` | Verifies Cloudflare R2 credentials: presigned upload, stat, delete |

## Production setup

### Firebase (Auth + Firestore)

1. Create a Firebase project. **Authentication → Sign-in method**: enable **Google** and **Phone**. Add your domains under *Authorized domains*.
2. Create a Firestore database. Deploy rules and indexes: `npx firebase-tools deploy --only firestore`. The rules deny all direct client access — every read and write goes through the API.
3. **Project settings → Service accounts → Generate key**. Put `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` (keep the `\n` escapes) in the server env, and the web app config in the `NEXT_PUBLIC_FIREBASE_*` vars.

### Cloudflare R2 (photos and media)

1. Create a bucket, e.g. `easystay-media`.
2. Make it publicly readable: connect a **custom domain** (recommended, e.g. `media.easystay.in`) or enable the `r2.dev` URL. Set `R2_PUBLIC_URL` to that base URL.
3. **Manage R2 API tokens** → create a token with *Object Read & Write* on the bucket → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Set `R2_ACCOUNT_ID` and `R2_BUCKET`.
4. Bucket **Settings → CORS policy** (browsers upload straight to R2):

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type", "cache-control"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. `npm run check:r2` should print “Cloudflare R2 is configured correctly.”

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
| 07 Login · 08 OTP · W4 | login sheet over the current page; `/login?next=` |
| 09 Back on property · WhatsApp | contact sheet on `/properties/[id]` |
| 10 / 23 Profile · W7 | `/profile`, `/profile/owner-settings`, `/profile/ratings` |
| 11 Saved | `/saved` |
| 11b Rate property | `/properties/[id]/rate` |
| 12 Owner sign-in · 13 Verify phone | `/owner`, `/owner/verify` |
| 14 My listings · W5 | `/my-listings` (with 20 Mark rented and 22 Repost dialogs) |
| 15 Add · 16 Preview · W6 | `/my-listings/new` |
| 17 Published | `/my-listings/[id]/published` |
| 18 Statistics | `/my-listings/[id]/stats` |
| 19 Edit | `/my-listings/[id]/edit` |
| 21 Expiry reminders | `/notifications` |

## Data model

All collections are top level, so each maps 1:1 to a table in any other database. Ids are strings; times are `Date` in the domain and Timestamps only inside the Firestore adapter.

| Collection | Id | Holds |
|---|---|---|
| `users` | auth uid | name, email, verified phone, `owner` settings (enabled, contact number, WhatsApp, contact method, greeting, notification prefs) |
| `properties` | auto | owner, type, sharing, title, rent, deposit, location, photos (R2 keys), availability, amenities, status, `publishedAt`/`expiresAt`, `viewCount`, `ratingSummary` |
| `ratings` | `{propertyId}_{userId}` | relation, per-factor scores, combined, review — one per person |
| `contacts` | `{propertyId}_{userId}` | who contacted which owner, by which channel — gates rating |
| `savedProperties` | `{userId}_{propertyId}` | saved hearts |
| `propertyViews` | `{propertyId}_{viewer}_{day}` | dedupes views to one per person per day |
| `propertyDailyViews` | `{propertyId}_{day}` | per-day counts for statistics |

Business rules live in `src/lib/domain` and are shared by API and UI:
- **Listings** are live 15 days; `expired` is derived from `expiresAt`, so no scheduler is needed. Reminders (3 days, 1 day, expired) are derived too. Repost keeps views and ratings.
- **Ratings**: combined = mean of Property, Owner, Environment, Value (and Food when served); only users who contacted the owner via EasyStay can rate; “New” until 3 ratings. The aggregate is recomputed from source on each change.
- **Contact numbers** are never in public responses — only returned to a logged-in seeker, which records the contact.
- **Photos**: uploaded to `property-photos/{ownerId}/…`; the server checks each new key exists, is an image under 5 MB, and rebuilds public URLs from the key.

## Switching the database

Services depend only on the interfaces in `src/lib/server/repositories/types.ts`. To move from Firestore to, say, Postgres:

1. Create `src/lib/server/repositories/postgres/` implementing `Repositories` (users, properties, ratings, contacts, saved, views). Use `src/lib/server/repositories/memory/index.ts` as the reference — it is the same contract in ~200 lines.
2. Honour the atomicity notes in `types.ts` (e.g. `views.recordUnique` → `INSERT … ON CONFLICT DO NOTHING` plus counter updates in one transaction).
3. `findCandidates` may push filters into SQL; services always re-apply `matchesFilters`, so returning a superset is safe.
4. Register it in `src/lib/server/repositories/index.ts` and set `DATA_BACKEND=postgres`. `npm run seed` works unchanged.

Auth is independent (`src/lib/server/auth.ts`), and so is media (`FileStorage` — R2 today, S3/GCS by adding an adapter).

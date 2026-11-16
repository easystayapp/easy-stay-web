/**
 * Adds (or corrects) the `geohash` field on listings, which "near me" search reads. Needed once for
 * listings created before the field existed, and again for any the Android app creates or moves
 * without writing it. Safe to re-run: it only touches listings whose stored value is wrong.
 *
 *   npm run backfill:geohash -- --dry      # show what would change
 *   npm run backfill:geohash               # emulator (FIRESTORE_EMULATOR_HOST set)
 *   npm run backfill:geohash -- --live     # the real database (shared with the Android app)
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local — rely on the shell environment */
}

const BATCH = 400;

async function main() {
  const dry = process.argv.includes("--dry");
  const live = !process.env.FIRESTORE_EMULATOR_HOST;
  if (live && !process.argv.includes("--live")) {
    console.error("Refusing to write to the live database (shared with the Android app). Use the emulators, or pass --live.");
    process.exitCode = 1;
    return;
  }
  const { FieldValue } = await import("firebase-admin/firestore");
  const { adminDb } = await import("@/lib/server/firebase-admin");
  const { geohashEncode } = await import("@/lib/domain/geohash");

  const db = adminDb();
  // Only the three fields we need: cheap even for a large collection.
  const snap = await db.collection("properties").select("latitude", "longitude", "geohash").get();
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  let scanned = 0, correct = 0, noPin = 0, fixed = 0;
  let batch = db.batch();
  let pending = 0;
  const flush = async () => {
    if (pending && !dry) await batch.commit();
    batch = db.batch();
    pending = 0;
  };

  for (const doc of snap.docs) {
    scanned++;
    const lat = num(doc.get("latitude"));
    const lng = num(doc.get("longitude"));
    const valid = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const want = valid ? geohashEncode(lat, lng) : null;
    const have = (doc.get("geohash") as string | undefined) ?? null;
    if (!valid && have === null) {
      noPin++;
      continue;
    }
    if (want === have) {
      correct++;
      continue;
    }
    fixed++;
    batch.update(doc.ref, { geohash: want ?? FieldValue.delete() });
    if (++pending >= BATCH) await flush();
  }
  await flush();

  const target = live ? "live database" : `emulator ${process.env.FIRESTORE_EMULATOR_HOST}`;
  console.log(`${dry ? "[dry run] " : ""}${target}: ${scanned} listings — ${correct} already correct, ${noPin} have no map pin, ${fixed} ${dry ? "would be " : ""}updated.`);
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);

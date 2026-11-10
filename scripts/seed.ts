/**
 * Seeds demo listings through the repository layer, so it works with any
 * backend. Usage:
 *   npm run seed            # skips if demo data already exists
 *   npm run seed -- --force # seeds again
 *
 * With the emulators running, set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local — rely on the shell environment */
}

async function main() {
  const { getRepositories, dataBackend } = await import("@/lib/server/repositories");
  const { backfillDemoPhotos, seedDemoData } = await import("@/lib/server/seed/demo");
  if (dataBackend() === "memory") {
    console.log("DATA_BACKEND=memory seeds itself on startup — nothing to do.");
    return;
  }
  // The live database is shared with the Android app's real users.
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.argv.includes("--live")) {
    console.error("Refusing to seed the live database (shared with the Android app). Use the emulators, or pass --live.");
    process.exitCode = 1;
    return;
  }
  const repos = await getRepositories();
  const existing = await repos.properties.listByOwner("demo-owner-rahul");
  if (existing.length && !process.argv.includes("--force")) {
    const updated = await backfillDemoPhotos(repos);
    console.log(`Demo data already present (${existing.length} listings); added photos to ${updated}. Use --force to add more.`);
    return;
  }
  const created = await seedDemoData(repos);
  console.log(`Seeded ${created.length} demo listings.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);

export {};

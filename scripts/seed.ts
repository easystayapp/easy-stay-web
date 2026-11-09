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
  const { seedDemoData } = await import("@/lib/server/seed/demo");
  if (dataBackend() === "memory") {
    console.log("DATA_BACKEND=memory seeds itself on startup — nothing to do.");
    return;
  }
  const repos = await getRepositories();
  const existing = await repos.properties.listByOwner("demo-owner-rahul");
  if (existing.length && !process.argv.includes("--force")) {
    console.log(`Demo data already present (${existing.length} listings). Use --force to add more.`);
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

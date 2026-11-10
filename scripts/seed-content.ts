/**
 * Loads reference data and content (cities, app config, home/welcome content,
 * pages) into the database. Safe on the live database: by default it only
 * creates what's missing and never overwrites edits.
 *
 *   npm run seed:content                  # create missing documents
 *   npm run seed:content -- --dry-run     # show what would happen
 *   npm run seed:content -- --overwrite   # replace existing documents with the seed values
 *   npm run seed:content -- --overwrite --only=content/home   # limit to documents whose path starts with this
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on the shell environment */
}

async function main() {
  const { getRepositories } = await import("@/lib/server/repositories");
  const seed = await import("@/lib/server/seed/content");
  const repos = await getRepositories();
  const dryRun = process.argv.includes("--dry-run");
  const overwrite = process.argv.includes("--overwrite");
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` : `project ${process.env.FIREBASE_PROJECT_ID}`;
  console.log(`${dryRun ? "[dry run] " : ""}Content → ${target}${overwrite ? " (overwrite)" : ""}`);

  let wrote = 0;
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  const step = async (label: string, exists: boolean, write: () => Promise<void>) => {
    if (only && !label.startsWith(only)) return;
    const action = exists && !overwrite ? "keep" : exists ? "replace" : "create";
    console.log(`  ${action.padEnd(7)} ${label}`);
    if (action !== "keep" && !dryRun) {
      await write();
      wrote++;
    }
  };

  const cities = new Set((await repos.content.listCities()).map((c) => c.id));
  for (const c of seed.SEED_CITIES) await step(`cities/${c.id}`, cities.has(c.id), () => repos.content.upsertCity(c));
  await step("config/app", !!(await repos.content.getDoc("app")), () => repos.content.putDoc("app", seed.SEED_APP_CONFIG));
  await step("content/home", !!(await repos.content.getDoc("home")), () => repos.content.putDoc("home", seed.SEED_HOME));
  await step("content/welcome", !!(await repos.content.getDoc("welcome")), () => repos.content.putDoc("welcome", seed.SEED_WELCOME));
  for (const p of seed.SEED_PAGES) await step(`pages/${p.slug}`, !!(await repos.content.getPage(p.slug)), () => repos.content.putPage(p));

  console.log(dryRun ? "\nDry run — nothing written." : `\nWrote ${wrote} document(s).`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);

export {};

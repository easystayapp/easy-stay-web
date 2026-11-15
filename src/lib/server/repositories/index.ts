/**
 * Adapter registry. Data and media storage are chosen independently:
 *
 *   DATA_BACKEND     firestore (default) — Cloud Firestore via the Admin SDK
 *                    memory              — in-process Maps seeded with demo listings
 *   STORAGE_BACKEND  r2                  — Cloudflare R2 (default when R2_* is set)
 *                    memory              — in-process, served by /api/files (dev only)
 *
 * Adding a backend = one more case here plus an implementation of
 * `Repositories` or `FileStorage`.
 */
import { seedDemoData, seedDemoSafety } from "../seed/demo";
import { createFirestoreRepositories } from "./firestore";
import { createMemoryFileStorage, createMemoryRepositories, memoryStore } from "./memory";
import { createR2FileStorage, r2Configured } from "./r2";
import type { FileStorage, Repositories } from "./types";

export type { BatchOp, DocStore, FileStorage, Repositories } from "./types";
export { PATHS, inc } from "./types";

export function dataBackend(): "firestore" | "memory" {
  return process.env.DATA_BACKEND === "memory" ? "memory" : "firestore";
}

export function storageBackend(): "r2" | "memory" {
  const v = process.env.STORAGE_BACKEND;
  if (v === "r2" || v === "memory") return v;
  return r2Configured() ? "r2" : "memory";
}

const g = globalThis as unknown as {
  __easyStayRepos?: Repositories;
  __easyStayFiles?: FileStorage;
  __easyStayPrivate?: FileStorage;
  __easyStaySeeded?: Promise<void>;
  __easyStayWarned?: boolean;
};

export async function getRepositories(): Promise<Repositories> {
  if (!g.__easyStayRepos) {
    g.__easyStayRepos = dataBackend() === "memory" ? createMemoryRepositories() : createFirestoreRepositories();
  }
  if (dataBackend() === "memory" && process.env.DEMO_SEED !== "0") {
    g.__easyStaySeeded ??= memoryStore().properties.size
      ? Promise.resolve()
      : seedDemoData(g.__easyStayRepos).then((listings) => seedDemoSafety(g.__easyStayRepos!, listings));
    await g.__easyStaySeeded;
  }
  return g.__easyStayRepos;
}

export function getFileStorage(): FileStorage {
  if (!g.__easyStayFiles) {
    if (storageBackend() === "r2") {
      g.__easyStayFiles = createR2FileStorage();
    } else {
      if (process.env.NODE_ENV === "production" && !g.__easyStayWarned) {
        g.__easyStayWarned = true;
        console.warn("[easystay] Using in-memory media storage. Configure Cloudflare R2 (R2_*) for production.");
      }
      g.__easyStayFiles = createMemoryFileStorage();
    }
  }
  return g.__easyStayFiles;
}

/**
 * KYC / NOC document storage: the `owners-kyc-docs/` folder of the main R2 bucket,
 * accessed with no public URL and signed reads only. Production requires R2.
 */
export function getPrivateStorage(): FileStorage {
  if (!g.__easyStayPrivate) {
    if (storageBackend() === "r2") {
      g.__easyStayPrivate = createR2FileStorage({ private: true });
    } else if (process.env.NODE_ENV === "production") {
      throw new Error("Cloudflare R2 (R2_*) must be configured to store verification documents.");
    } else {
      g.__easyStayPrivate = createMemoryFileStorage();
    }
  }
  return g.__easyStayPrivate;
}

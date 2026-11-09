/**
 * Adapter registry. `DATA_BACKEND` picks the storage implementation:
 *   firestore (default) — Cloud Firestore + Cloud Storage via the Admin SDK
 *   memory              — in-process Maps seeded with demo listings
 *
 * Adding a backend = one more case here plus an implementation of
 * `Repositories` and `FileStorage`.
 */
import { seedDemoData } from "../seed/demo";
import { createFirestoreRepositories } from "./firestore";
import { createFirebaseFileStorage } from "./firestore/storage";
import { createMemoryFileStorage, createMemoryRepositories, memoryStore } from "./memory";
import type { FileStorage, Repositories } from "./types";

export type { FileStorage, Repositories } from "./types";

type Backend = "firestore" | "memory";

export function dataBackend(): Backend {
  return process.env.DATA_BACKEND === "memory" ? "memory" : "firestore";
}

const g = globalThis as unknown as {
  __easyStayRepos?: Repositories;
  __easyStayFiles?: FileStorage;
  __easyStaySeeded?: Promise<void>;
};

export async function getRepositories(): Promise<Repositories> {
  if (!g.__easyStayRepos) {
    g.__easyStayRepos = dataBackend() === "memory" ? createMemoryRepositories() : createFirestoreRepositories();
  }
  if (dataBackend() === "memory" && process.env.DEMO_SEED !== "0") {
    g.__easyStaySeeded ??= memoryStore().properties.size
      ? Promise.resolve()
      : seedDemoData(g.__easyStayRepos).then(() => undefined);
    await g.__easyStaySeeded;
  }
  return g.__easyStayRepos;
}

export function getFileStorage(): FileStorage {
  g.__easyStayFiles ??= dataBackend() === "memory" ? createMemoryFileStorage() : createFirebaseFileStorage();
  return g.__easyStayFiles;
}

import { getDownloadURL, getStorage } from "firebase-admin/storage";
import { getAdminApp } from "../../firebase-admin";
import type { FileStorage } from "../types";

/** Firebase Cloud Storage adapter for listing photos. */
export function createFirebaseFileStorage(): FileStorage {
  const bucket = () => getStorage(getAdminApp()).bucket();
  return {
    async upload(path, data, contentType) {
      const file = bucket().file(path);
      await file.save(Buffer.from(data), {
        resumable: false,
        contentType,
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
      const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
      const url = emulator
        ? `http://${emulator}/v0/b/${bucket().name}/o/${encodeURIComponent(path)}?alt=media`
        : await getDownloadURL(file);
      return { path, url };
    },
    async delete(path) {
      await bucket().file(path).delete({ ignoreNotFound: true });
    },
  };
}

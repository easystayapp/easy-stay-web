"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function firebaseConfigured(): boolean {
  return !!(config.apiKey && config.projectId);
}

/** Firebase Auth for the browser. Only Auth runs client-side; data goes through /api. */
export function firebaseAuth(): Auth {
  if (auth) return auth;
  if (!firebaseConfigured()) {
    throw new Error("Firebase is not configured. Copy .env.example to .env.local and fill in your project keys.");
  }
  app = getApps()[0] ?? initializeApp(config);
  auth = getAuth(app);
  auth.useDeviceLanguage();
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
  return auth;
}

"use client";

import { useContext } from "react";
import { SavedContext } from "@/components/providers/providers";

/** Saved-property hearts: check and toggle (prompts login when needed). */
export const useSaved = () => useContext(SavedContext);

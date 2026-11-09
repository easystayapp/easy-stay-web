"use client";

import { useContext } from "react";
import { CityContext } from "@/components/providers/providers";

/** The city the visitor is browsing (remembered on this device). */
export const useCity = () => useContext(CityContext);

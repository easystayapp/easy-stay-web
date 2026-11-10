"use client";

import { useContext } from "react";
import { ToastContext } from "@/components/providers/toast-provider";

/** Shows a short confirmation or error message. */
export const useToast = () => useContext(ToastContext);

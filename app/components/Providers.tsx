"use client";

import { SessionProvider } from "next-auth/react";
// import { ImageKitProvider } from "imagekitio-next";
import { NotificationProvider } from "./Notification";
import AdminLayout from "../layouts/AdminLayout";
import BusinessLayout from "../layouts/BusinessLayout";
import UserLayout from "../layouts/UserLayout";
import { useEffect, useState } from "react";

// const urlEndpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT!;
// const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY!;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    // This runs only on the client
    const currentSubdomain = window?.location.hostname.split(".")[0];
    setSubdomain(currentSubdomain);
    console.log("Subdomain:", currentSubdomain);
  }, []);

  return (
    <SessionProvider refetchInterval={5 * 60}>
      <NotificationProvider>
        {/* <ImageKitProvider
          publicKey={publicKey}
          urlEndpoint={urlEndpoint}
          authenticator={authenticator}
        > */}
        {subdomain === "business" && (
          <BusinessLayout>{children}</BusinessLayout>
        )}
        {subdomain === "admin" && <AdminLayout>{children}</AdminLayout>}
        {subdomain === "localhost" && <UserLayout>{children}</UserLayout>}
        {/* </ImageKitProvider> */}
      </NotificationProvider>
    </SessionProvider>
  );
}

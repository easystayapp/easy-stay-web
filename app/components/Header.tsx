"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Building2, CircleUserRound, User } from "lucide-react";
import { useNotification } from "./Notification";
import Image from "next/image";

export default function Header() {
  const { data: session } = useSession();
  const { showNotification } = useNotification();

  const handleSignOut = async () => {
    try {
      await signOut();
      showNotification("Signed out successfully", "success");
    } catch {
      showNotification("Failed to sign out", "error");
    }
  };

  return (
    <div className="navbar sticky top-0 z-40">
      <div className="container mx-auto">
        <div className="flex py-2 px-4 items-center justify-between">
          <Link
            href="/"
            className=""
            prefetch={true}
            // onClick={() =>
            //   showNotification("Welcome to ImageKit ReelsPro", "info")
            // }
          >
            <Image
              alt="logo"
              height={500}
              width={500}
              src="/images/logo.svg"
              className="w-24"
              priority={true}
              loading="eager"
              onLoadingComplete={() =>
                showNotification("ImageKit logo loaded successfully", "success")
              }
            />
          </Link>
          <div className="flex justify-between items-center gap-4">
            <div className="flex justify-between items-center gap-2">
              <Link
                href="/property/add"
                className="px-4 py-2 inline-flex gap-2 w-full"
              >
                <Building2 />
                <span className="text-nowrap font-semibold">Add Property</span>
              </Link>
              {session ? (
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-circle">
                    <User className="w-5 h-5" />
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[1] shadow-lg bg-base-100 rounded-box w-64 mt-4 py-2"
                  >
                    <>
                      <li className="px-4 py-1">
                        <span className="text-sm opacity-70">
                          {session.user?.email?.split("@")[0]}
                        </span>
                      </li>
                      <div className="divider my-1"></div>

                      <li>
                        <Link
                          href="/profile"
                          className="px-4 py-2 hover:bg-base-200 block w-full"
                        >
                          Profile
                        </Link>
                      </li>

                      <li>
                        <button
                          onClick={handleSignOut}
                          className="px-4 py-2 text-error hover:bg-base-200 w-full text-left"
                        >
                          Sign Out
                        </button>
                      </li>
                    </>
                  </ul>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 inline-flex gap-2 w-full"
                  >
                    <CircleUserRound />
                    <span className="text-nowrap font-semibold">
                      Login / Signup
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import BusinessSidebar from "../components/sidebar/BusinessSidebar";
import { useUIStore } from "@/stores/uiStore";
import { Menu } from "lucide-react";

const BusinessLayout = ({ children }: { children: React.ReactNode }) => {
  const { toggleSidebar } = useUIStore();

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-primary shadow-md p-2 flex items-center justify-between sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <Link
              href="/"
              prefetch={true}
              className="flex items-center space-x-2"
            >
              <div className="flex items-center gap-2">
                <Image
                  alt="logo"
                  height={80}
                  width={80}
                  src="/images/logo.svg"
                  className="size-10"
                  priority={true}
                  loading="eager"
                />
                <span className="text-white font-semibold text-xl">
                  Business
                </span>
              </div>
            </Link>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                className="btn btn-square btn-ghost"
                onClick={toggleSidebar}
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Sidebar + Main */}
        <div className="flex flex-1 overflow-hidden max-h-[90vh]">
          {/* Sidebar */}
          {/* <aside className="flex-shrink-0 overflow-y-auto bg-base-100 shadow-lg"> */}
          <BusinessSidebar />
          {/* </aside> */}

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6 max-h-screen">
            {children}
          </main>
        </div>

        {/* Footer */}
        <footer className="footer sm:footer-horizontal footer-center bg-gray-100 text-base-content p-2">
          <aside>
            <p className="text-sm text-gray-500">
              Copyright © {new Date().getFullYear()} - All right reserved by
              Easy Stay Rental Services Pvt. Ltd.
            </p>
          </aside>
        </footer>
      </div>
    </>
  );
};

export default BusinessLayout;

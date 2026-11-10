import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  // `absolute` stops the public site's "· EasyStay" suffix from being added.
  title: { absolute: "EasyStay Admin", template: "%s · EasyStay Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

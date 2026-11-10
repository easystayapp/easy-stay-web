"use client";

import Link from "next/link";
import { H1, Panel, useAdminGet } from "@/components/admin/ui";

interface Stats { pendingVerifications: number; openCases: number; inProgressCases: number; overdueCases: number; takedownsOpen: number; capped: boolean }

export default function Dashboard() {
  const { data, error } = useAdminGet<Stats>("/stats");
  const cards = data && [
    ["Pending verifications", data.pendingVerifications, "/verifications", false],
    ["Open reports & grievances", data.openCases, "/cases", false],
    ["In progress", data.inProgressCases, "/cases?status=acknowledged", false],
    ["Overdue (SLA missed)", data.overdueCases, "/cases?overdue=1", data.overdueCases > 0],
    ["Open takedowns (36 h)", data.takedownsOpen, "/cases?kind=takedown", data.takedownsOpen > 0],
  ] as const;
  return (
    <>
      <H1>Dashboard</H1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards?.map(([label, n, href, hot]) => (
          <Link key={label} href={href} className={`rounded-2xl border bg-white p-4 no-underline ${hot ? "border-red-300" : ""}`}>
            <div className={`text-3xl font-extrabold ${hot ? "text-red-600" : ""}`}>{n}{data?.capped && n === 100 ? "+" : ""}</div>
            <div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div>
          </Link>
        ))}
      </div>
      <Panel title="Service levels">
        <p className="text-sm text-muted-foreground">Acknowledge grievances within 24 hours and resolve within 15 days. Takedown requests must be actioned within 36 hours.</p>
      </Panel>
    </>
  );
}

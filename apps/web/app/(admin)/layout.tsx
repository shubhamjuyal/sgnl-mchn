import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/signals", label: "Signals" },
  { href: "/scores", label: "Scores" },
  { href: "/manual-entry", label: "Manual entry" },
  { href: "/sources", label: "Sources" },
  { href: "/accounts", label: "Accounts" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/guardrails", label: "Guardrails" },
  { href: "/programs", label: "Programs" },
  { href: "/routing", label: "Routing" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-neutral-200 dark:border-neutral-800 p-4 space-y-1">
        <div className="text-sm font-bold tracking-wide mb-4">SIGNAL MACHINE</div>
        <nav className="space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block px-2 py-1 rounded text-sm hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-x-auto">{children}</main>
    </div>
  );
}

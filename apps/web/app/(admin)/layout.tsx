import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 p-5 flex flex-col">
        <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground mb-6">
          SIGNAL MACHINE
        </div>
        <nav className="space-y-0.5">
          {NAV.map((n) => (
            <Button
              key={n.href}
              asChild
              variant="ghost"
              className="w-full justify-start h-9 px-3 font-normal text-sm text-foreground/80 hover:text-foreground"
            >
              <Link href={n.href}>{n.label}</Link>
            </Button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-x-auto">{children}</main>
    </div>
  );
}

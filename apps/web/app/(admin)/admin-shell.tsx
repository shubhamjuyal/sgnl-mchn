"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };
type ShellUser = { id: number; email: string; displayName: string; role: string } | null;

function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3001";
}

function UserBlock({ user }: { user: ShellUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  async function logout() {
    setBusy(true);
    try {
      await fetch(`${resolveApiBase()}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="mt-auto pt-4 border-t border-border">
      <div className="text-xs text-muted-foreground truncate" title={user.email}>
        {user.displayName}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">
        {user.role}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={logout}
        className="w-full justify-start h-8 px-2 font-normal text-sm"
      >
        {busy ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}

export function AdminShell({
  nav,
  user,
  children,
}: {
  nav: NavItem[];
  user: ShellUser;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navList = (
    <nav className="space-y-0.5">
      {nav.map((n) => (
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
  );

  const brand = (
    <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground mb-6">
      SIGNAL MACHINE
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <header className="md:hidden flex items-center justify-between border-b border-border bg-card/40 px-4 py-3">
        <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
          SIGNAL MACHINE
        </div>
        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-card/95 p-5 transition-transform",
          "md:static md:w-60 md:shrink-0 md:bg-card/40 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="hidden md:block">{brand}</div>
        {navList}
        <UserBlock user={user} />
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-x-auto">{children}</main>
    </div>
  );
}
